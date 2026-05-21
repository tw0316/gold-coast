from __future__ import annotations

from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime, timezone
import io
import json
import os
from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
from unittest import mock

from gold_coast_data_lake.jobs.ghl_call_transcription import (
    PublishedTranscripts,
    archived_recordings_sql,
    main as transcription_cli_main,
    parse_openai_secret_string,
    parse_args as transcription_cli_parse_args,
    read_openai_api_key_secret,
    run_transcription_job,
    select_source_calls_from_athena,
)
from gold_coast_data_lake.transcription import (
    DEFAULT_FALLBACK_TRANSCRIPTION_MODEL,
    DEFAULT_TRANSCRIPTION_MODEL,
    DownloadedRecording,
    LONG_AUDIO_DURATION_SECONDS,
    TRANSCRIPT_ROW_COLUMNS,
    TranscodedAudio,
    build_idempotency_key,
    build_idempotency_source,
    build_transcript_artifact,
    build_transcript_artifact_key,
    build_transcript_row,
    choose_transcription_plan,
    download_private_s3_recording,
    sanitize_error_value,
    transcribe_with_openai_fallback,
    OpenAITranscriptionProvider,
)

PRIVATE_RECORDING_URI = "".join(("s3", "://", "bucket", "/", "private.wav"))


class FakeS3Client:
    def __init__(self, body: bytes) -> None:
        self.body = body
        self.calls: list[dict[str, str]] = []

    def get_object(self, *, Bucket: str, Key: str):
        self.calls.append({"Bucket": Bucket, "Key": Key})
        return {
            "Body": io.BytesIO(self.body),
            "ContentType": "audio/x-wav",
        }


class FakeTranscriptions:
    def __init__(self, *, fail_models: set[str] | None = None) -> None:
        self.fail_models = fail_models or set()
        self.calls: list[str] = []

    def create(self, *, file, model: str, response_format: str):
        self.calls.append(model)
        self.assert_file_like(file)
        if model in self.fail_models:
            raise RuntimeError(f"provider failed for {model} and {PRIVATE_RECORDING_URI}")
        return {
            "text": f"transcript from {model}",
            "language": "en",
            "usage": {"duration_seconds": 1},
        }

    @staticmethod
    def assert_file_like(file) -> None:
        if isinstance(file, tuple):
            assert hasattr(file[1], "read")
        else:
            assert hasattr(file, "read")


class FakeAthenaClient:
    pass


class FakeSecretsClient:
    def __init__(self, secret_string: str) -> None:
        self.secret_string = secret_string
        self.secret_ids: list[str] = []

    def get_secret_value(self, *, SecretId: str):
        self.secret_ids.append(SecretId)
        return {"SecretString": self.secret_string}


class TranscriptionTests(unittest.TestCase):
    def test_idempotency_source_hash_and_artifact_key_are_stable(self) -> None:
        source = build_idempotency_source(
            "msg_123",
            "abc123",
            "v1",
            "openai",
            DEFAULT_TRANSCRIPTION_MODEL,
        )
        key = build_idempotency_key("msg_123", "abc123", "v1", "openai", DEFAULT_TRANSCRIPTION_MODEL)
        artifact_key = build_transcript_artifact_key(
            call_message_id="msg_123",
            recording_sha256="abc123",
            artifact_schema_version="v1",
            provider="openai",
            transcription_model=DEFAULT_TRANSCRIPTION_MODEL,
            run_id="run_1",
        )

        self.assertEqual(source, "msg_123|abc123|v1|openai|gpt-4o-transcribe")
        self.assertEqual(len(key), 64)
        self.assertEqual(key, build_idempotency_key("msg_123", "abc123", "v1", "openai", DEFAULT_TRANSCRIPTION_MODEL))
        self.assertEqual(
            artifact_key,
            "ai-artifacts/ghl/transcripts/v1/message_id=msg_123/recording_sha256=abc123/"
            "provider=openai/model=gpt-4o-transcribe/run=run_1.json",
        )

    def test_s3_download_uses_injected_client_and_computes_sha(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            client = FakeS3Client(b"fake-audio")
            downloaded = download_private_s3_recording(
                bucket="private-bucket",
                key="recordings/ghl/message_id=msg1.wav",
                destination_path=Path(tmp) / "recording.wav",
                s3_client=client,
            )

            self.assertEqual(client.calls, [{"Bucket": "private-bucket", "Key": "recordings/ghl/message_id=msg1.wav"}])
            self.assertEqual(downloaded.path.read_bytes(), b"fake-audio")
            self.assertEqual(downloaded.byte_count, 10)
            self.assertEqual(downloaded.content_type, "audio/x-wav")
            self.assertEqual(downloaded.sha256, "69538b86470d5575fc0181cf3b0d0e79ecacb05b6bc6f58c17e759154848e35f")

    def test_provider_uses_primary_model_for_short_audio(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            audio_path = Path(tmp) / "recording.wav"
            audio_path.write_bytes(b"audio")
            fake_transcriptions = FakeTranscriptions()
            provider = OpenAITranscriptionProvider(
                client=SimpleNamespace(audio=SimpleNamespace(transcriptions=fake_transcriptions))
            )

            result = transcribe_with_openai_fallback(provider=provider, audio_path=audio_path, duration_seconds=60)

            self.assertEqual(result.model, DEFAULT_TRANSCRIPTION_MODEL)
            self.assertEqual(fake_transcriptions.calls, [DEFAULT_TRANSCRIPTION_MODEL])
            self.assertEqual(result.attempts[-1].status, "succeeded")

    def test_provider_retries_short_primary_failure_with_fallback_model(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            audio_path = Path(tmp) / "recording.wav"
            audio_path.write_bytes(b"audio")
            fake_transcriptions = FakeTranscriptions(fail_models={DEFAULT_TRANSCRIPTION_MODEL})
            provider = OpenAITranscriptionProvider(
                client=SimpleNamespace(audio=SimpleNamespace(transcriptions=fake_transcriptions))
            )

            result = transcribe_with_openai_fallback(provider=provider, audio_path=audio_path, duration_seconds=60)

            self.assertEqual(result.model, DEFAULT_FALLBACK_TRANSCRIPTION_MODEL)
            self.assertEqual(fake_transcriptions.calls, [DEFAULT_TRANSCRIPTION_MODEL, DEFAULT_FALLBACK_TRANSCRIPTION_MODEL])
            self.assertEqual([attempt.status for attempt in result.attempts], ["failed", "succeeded"])
            self.assertNotIn(PRIVATE_RECORDING_URI, json.dumps(result.attempts[0].error, sort_keys=True))

    def test_long_audio_uses_fallback_model_and_transcode_helper(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            audio_path = Path(tmp) / "recording.wav"
            audio_path.write_bytes(b"audio")
            fake_transcriptions = FakeTranscriptions()
            provider = OpenAITranscriptionProvider(
                client=SimpleNamespace(audio=SimpleNamespace(transcriptions=fake_transcriptions))
            )

            def fake_transcode(path: Path, *, duration_seconds):
                output = Path(tmp) / "recording.whisper.mp3"
                output.write_bytes(path.read_bytes())
                return TranscodedAudio(path=output, content_type="audio/mpeg", bitrate_kbps=16)

            plan = choose_transcription_plan(LONG_AUDIO_DURATION_SECONDS + 1)
            result = transcribe_with_openai_fallback(
                provider=provider,
                audio_path=audio_path,
                duration_seconds=LONG_AUDIO_DURATION_SECONDS + 1,
                transcode_helper=fake_transcode,
            )

            self.assertTrue(plan.use_fallback)
            self.assertTrue(plan.needs_transcode)
            self.assertEqual(result.model, DEFAULT_FALLBACK_TRANSCRIPTION_MODEL)
            self.assertEqual(result.content_type, "audio/mpeg")
            self.assertEqual(fake_transcriptions.calls, [DEFAULT_FALLBACK_TRANSCRIPTION_MODEL])

    def test_sanitized_errors_redact_credentials_urls_s3_uri_contact_values_and_payloads(self) -> None:
        s3_uri = "".join(("s3", "://", "secret-bucket", "/", "path.wav"))
        object_key = "recordings/ghl/message_id=secret.wav"
        url = "".join(("https", "://", "example", ".", "com", "/", "file.wav"))
        email = "".join(("seller", "@", "example", ".", "com"))
        phone = "-".join(("555", "123", "4567"))
        bearer_token = " ".join(("Bearer", "abc"))
        openai_key = "".join(("sk", "-", "123456", "789012"))
        payload = {
            "message": " ".join(("failed for", s3_uri, object_key, url, email, phone, bearer_token, openai_key)),
            "request_body": {"transcript_text": "raw words"},
            "safe_count": 1,
        }
        sanitized = sanitize_error_value(payload)
        rendered = json.dumps(sanitized, sort_keys=True)

        self.assertEqual(sanitized["safe_count"], 1)
        self.assertEqual(sanitized["request_body"], "[redacted]")
        for raw_value in (s3_uri, object_key, url, email, phone, bearer_token, openai_key):
            self.assertNotIn(raw_value, rendered)

    def test_transcript_row_matches_ddl_shape_and_artifact_builder(self) -> None:
        attempted_at = datetime(2026, 5, 20, 22, 0, tzinfo=timezone.utc)
        recording_s3_uri = "".join(("s3", "://", "bucket", "/", "recordings/ghl/message_id=msg1.wav"))
        source = {
            "call_message_id": "msg1",
            "conversation_id": "conv1",
            "contact_id": "contact1",
            "opportunity_id": "opp1",
            "actor_user_id": "user1",
            "direction": "outbound",
            "call_status": "completed",
            "recording_s3_uri": recording_s3_uri,
            "recording_object_key": "recordings/ghl/message_id=msg1.wav",
            "recording_sha256": "abc123",
            "recording_content_type": "audio/x-wav",
            "recording_byte_count": 123,
            "recording_duration_seconds": 42,
            "source_call_run_id": "call-run",
            "source_recording_run_id": "recording-run",
            "source_call_snapshot_at": "2026-05-20T21:00:00Z",
            "source_recording_snapshot_at": "2026-05-20T21:01:00Z",
        }
        response = {
            "text": "short transcript",
            "segments": [{"start": 0, "end": 1, "text": "short transcript"}],
            "language": "en",
            "usage": {"duration_seconds": 42},
        }

        row = build_transcript_row(
            source=source,
            run_id="run1",
            snapshot_at=attempted_at,
            artifact_schema_version="v1",
            provider="openai",
            transcription_model=DEFAULT_TRANSCRIPTION_MODEL,
            transcription_status="succeeded",
            transcription_response=response,
            transcript_object_key="curated/key",
            provider_response_object_key="artifact/key",
            attempt_count=1,
            first_attempted_at=attempted_at,
            last_attempted_at=attempted_at,
            transcribed_at=attempted_at,
        )
        artifact = build_transcript_artifact(row=row, provider_response=response)

        self.assertEqual(tuple(row.keys()), TRANSCRIPT_ROW_COLUMNS)
        self.assertEqual(row["transcript_text"], "short transcript")
        self.assertEqual(json.loads(row["transcript_segments_json"])[0]["text"], "short transcript")
        self.assertEqual(json.loads(row["usage_json"]), {"duration_seconds": 42})
        self.assertEqual(row["transcribed_at"], "2026-05-20T22:00:00Z")
        self.assertEqual(artifact["artifact_type"], "ghl_call_transcript")
        self.assertEqual(artifact["row"]["call_message_id"], "msg1")

    def test_cli_sample_dry_run_writes_sanitized_status_only(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            stdout = io.StringIO()
            with redirect_stdout(stdout):
                exit_code = transcription_cli_main(
                    ["--sample", "--dry-run-output-dir", tmp, "--run-id", "dry-run-1", "--max-calls", "3"]
                )
            status_path = Path(tmp) / "run-status" / "ghl-call-transcription" / "runs" / "run=dry-run-1" / "status.json"
            status = json.loads(status_path.read_text(encoding="utf-8"))

            self.assertEqual(exit_code, 0)
            self.assertEqual(status["status"], "succeeded")
            self.assertTrue(status["dry_run"])
            self.assertEqual(status["limits"]["max_calls"], 3)
            self.assertEqual(status["transcriptions"]["attempted"], 0)
            self.assertIn("dry-run-1", stdout.getvalue())

    def test_cli_execute_fails_clearly_without_openai_key(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            stderr = io.StringIO()
            with mock.patch.dict(os.environ, {}, clear=True):
                with redirect_stderr(stderr):
                    exit_code = transcription_cli_main(
                        [
                            "--execute",
                            "--dry-run-output-dir",
                            tmp,
                            "--run-id",
                            "execute-no-key",
                            "--s3-bucket",
                            "gcoffers-data-lake",
                        ]
                    )
            status_path = Path(tmp) / "run-status" / "ghl-call-transcription" / "runs" / "run=execute-no-key" / "status.json"
            status = json.loads(status_path.read_text(encoding="utf-8"))

            self.assertEqual(exit_code, 2)
            self.assertIn("OpenAI API key missing", stderr.getvalue())
            self.assertEqual(status["status"], "failed")
            self.assertEqual(status["error"]["class"], "MissingOpenAIAPIKey")
            self.assertEqual(status["transcriptions"]["attempted"], 0)
            self.assertFalse(status["openai_secret_configured"])

    def test_openai_secret_reader_supports_plain_and_json_secret_strings_without_logging_value(self) -> None:
        plain_value = "".join(("sk", "-", "plain", "123456789012"))
        json_value = "".join(("sk", "-", "json", "123456789012"))
        plain_client = FakeSecretsClient(plain_value)
        json_client = FakeSecretsClient(json.dumps({"OPENAI_API_KEY": json_value}))

        self.assertEqual(read_openai_api_key_secret("goldcoast/openai-api-key", secrets_client=plain_client), plain_value)
        self.assertEqual(read_openai_api_key_secret("goldcoast/openai-api-key", secrets_client=json_client), json_value)
        self.assertEqual(parse_openai_secret_string(json.dumps({"api_key": json_value})), json_value)
        self.assertEqual(plain_client.secret_ids, ["goldcoast/openai-api-key"])
        self.assertEqual(json_client.secret_ids, ["goldcoast/openai-api-key"])

    def test_athena_sample_selection_sql_prefers_short_archived_recordings_without_sha_requirement(self) -> None:
        args = transcription_cli_parse_args(
            [
                "--execute",
                "--sample",
                "--s3-bucket",
                "gcoffers-data-lake",
                "--max-calls",
                "1",
                "--max-transcriptions-per-run",
                "1",
            ]
        )

        sql = archived_recordings_sql(args, limit=1, include_existing_filter=True)

        self.assertIn("FROM gold_coast.calls c", sql)
        self.assertIn("JOIN gold_coast.call_recordings r", sql)
        self.assertIn("LEFT JOIN gold_coast.call_transcripts t", sql)
        self.assertIn("BETWEEN 10 AND 120", sql)
        self.assertIn("LIMIT 1", sql)
        self.assertIn("coalesce(c.has_recording, false) = true", sql)
        self.assertIn("coalesce(r.object_key, c.recording_object_key)", sql)
        self.assertIn("nullif(trim(coalesce(r.sha256, c.recording_sha256)), '') IS NULL", sql)
        self.assertIn("AND t.call_message_id IS NULL", sql)
        self.assertNotIn("sha256)), '') IS NOT NULL", sql)

    def test_athena_source_selection_uses_fake_client_and_returns_one_row(self) -> None:
        args = transcription_cli_parse_args(
            [
                "--execute",
                "--sample",
                "--s3-bucket",
                "gcoffers-data-lake",
                "--athena-output-location",
                "s3://gcoffers-data-lake/athena-results/test/",
            ]
        )
        rows = [
            {
                "call_message_id": "call1",
                "recording_object_key": "recordings/ghl/message_id=call1.wav",
                "recording_duration_seconds": "11",
            }
        ]

        with mock.patch(
            "gold_coast_data_lake.jobs.ghl_call_transcription.build_athena_client",
            return_value=FakeAthenaClient(),
        ), mock.patch(
            "gold_coast_data_lake.jobs.ghl_call_transcription.execute_athena_query",
            return_value=("query-id", rows),
        ) as fake_query:
            selected = select_source_calls_from_athena(args, limit=1)

        self.assertEqual(selected, rows)
        self.assertEqual(fake_query.call_args.kwargs["database"], "gold_coast")
        self.assertEqual(fake_query.call_args.kwargs["workgroup"], "gold_coast_data_lake")
        self.assertIn("LIMIT 1", fake_query.call_args.args[0])

    def test_execute_sample_with_injected_fakes_writes_artifact_curated_and_sanitized_status(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            audio_path = tmp_path / "downloaded.wav"
            audio_path.write_bytes(b"audio")
            artifacts: dict[str, dict] = {}
            published_rows: list[dict] = []
            downloaded: list[tuple[str, str, int]] = []
            fake_transcriptions = FakeTranscriptions()

            def provider_factory(args):
                return OpenAITranscriptionProvider(
                    client=SimpleNamespace(audio=SimpleNamespace(transcriptions=fake_transcriptions))
                )

            def source_selector(args, limit):
                self.assertEqual(limit, 1)
                return [
                    {
                        "call_message_id": "call1",
                        "conversation_id": "conv1",
                        "contact_id": "contact1",
                        "direction": "outbound",
                        "call_status": "completed",
                        "recording_object_key": "recordings/ghl/message_id=call1.wav",
                        "recording_duration_seconds": 11,
                    }
                ]

            def recording_downloader(bucket, key, max_bytes):
                downloaded.append((bucket, key, max_bytes))
                return DownloadedRecording(
                    bucket=bucket,
                    key=key,
                    path=audio_path,
                    content_type="audio/x-wav",
                    byte_count=audio_path.stat().st_size,
                    sha256="sha1",
                )

            def artifact_writer(args, key, payload):
                artifacts[key] = dict(payload)

            def curated_publisher(args, rows):
                published_rows.extend(rows)
                return PublishedTranscripts(
                    written={"name": "call_transcripts", "database": "gold_coast", "row_count": len(rows)},
                    glue={"database": "gold_coast", "name": "call_transcripts", "action": "updated"},
                )

            args = transcription_cli_parse_args(
                [
                    "--execute",
                    "--sample",
                    "--max-calls",
                    "1",
                    "--max-transcriptions-per-run",
                    "1",
                    "--s3-bucket",
                    "gcoffers-data-lake",
                    "--dry-run-output-dir",
                    str(tmp_path / "status"),
                    "--curated-output-dir",
                    str(tmp_path / "curated"),
                    "--run-id",
                    "sample-run",
                ]
            )
            stdout = io.StringIO()
            stderr = io.StringIO()
            with redirect_stdout(stdout), redirect_stderr(stderr):
                exit_code = run_transcription_job(
                    args,
                    provider_factory=provider_factory,
                    source_selector=source_selector,
                    existing_rows_loader=lambda args: [],
                    recording_downloader=recording_downloader,
                    artifact_writer=artifact_writer,
                    curated_publisher=curated_publisher,
                )

            status_path = (
                tmp_path
                / "status"
                / "run-status"
                / "ghl-call-transcription"
                / "runs"
                / "run=sample-run"
                / "status.json"
            )
            status = json.loads(status_path.read_text(encoding="utf-8"))
            rendered_status = json.dumps(status, sort_keys=True)

            self.assertEqual(exit_code, 0)
            self.assertEqual(downloaded[0][0], "gcoffers-data-lake")
            self.assertEqual(downloaded[0][1], "recordings/ghl/message_id=call1.wav")
            self.assertEqual(fake_transcriptions.calls, [DEFAULT_TRANSCRIPTION_MODEL])
            self.assertEqual(len(artifacts), 1)
            self.assertEqual(len(published_rows), 1)
            self.assertEqual(published_rows[0]["transcription_status"], "succeeded")
            self.assertEqual(published_rows[0]["recording_sha256"], "sha1")
            self.assertEqual(status["status"], "succeeded")
            self.assertEqual(status["selection"]["selected_calls"], 1)
            self.assertEqual(status["transcriptions"]["attempted"], 1)
            self.assertEqual(status["transcriptions"]["succeeded"], 1)
            self.assertNotIn("transcript from", rendered_status)
            self.assertNotIn("transcript from", stdout.getvalue())
            self.assertEqual(stderr.getvalue(), "")

    def test_execute_sample_skips_existing_success_when_source_sha_is_missing(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            provider_calls: list[str] = []
            published_rows: list[dict] = []
            existing_row = {
                "call_message_id": "call1",
                "recording_sha256": "computed-sha",
                "transcription_status": "succeeded",
                "provider": "openai",
                "transcription_model": DEFAULT_TRANSCRIPTION_MODEL,
                "artifact_schema_version": "v1",
                "attempt_count": 1,
                "run_id": "older-run",
                "snapshot_at": "2026-05-20T22:00:00Z",
            }

            def provider_factory(args):
                provider_calls.append(args.provider)
                return OpenAITranscriptionProvider(client=SimpleNamespace(audio=SimpleNamespace(transcriptions=FakeTranscriptions())))

            def source_selector(args, limit):
                self.assertEqual(limit, 1)
                return [
                    {
                        "call_message_id": "call1",
                        "recording_object_key": "recordings/ghl/message_id=call1.wav",
                        "recording_duration_seconds": 11,
                    }
                ]

            def recording_downloader(bucket, key, max_bytes):
                raise AssertionError("existing source without SHA should not be downloaded")

            def artifact_writer(args, key, payload):
                raise AssertionError("existing source without SHA should not write artifacts")

            def curated_publisher(args, rows):
                published_rows.extend(rows)
                return PublishedTranscripts(
                    written={"name": "call_transcripts", "database": "gold_coast", "row_count": len(rows)},
                    glue={"database": "gold_coast", "name": "call_transcripts", "action": "updated"},
                )

            args = transcription_cli_parse_args(
                [
                    "--execute",
                    "--sample",
                    "--max-calls",
                    "1",
                    "--max-transcriptions-per-run",
                    "1",
                    "--s3-bucket",
                    "gcoffers-data-lake",
                    "--dry-run-output-dir",
                    str(tmp_path / "status"),
                    "--run-id",
                    "sample-existing-missing-sha",
                ]
            )
            stdout = io.StringIO()
            with redirect_stdout(stdout):
                exit_code = run_transcription_job(
                    args,
                    provider_factory=provider_factory,
                    source_selector=source_selector,
                    existing_rows_loader=lambda args: [existing_row],
                    recording_downloader=recording_downloader,
                    artifact_writer=artifact_writer,
                    curated_publisher=curated_publisher,
                )

            status_path = (
                tmp_path
                / "status"
                / "run-status"
                / "ghl-call-transcription"
                / "runs"
                / "run=sample-existing-missing-sha"
                / "status.json"
            )
            status = json.loads(status_path.read_text(encoding="utf-8"))

            self.assertEqual(exit_code, 0)
            self.assertEqual(provider_calls, ["openai"])
            self.assertEqual(published_rows, [existing_row])
            self.assertEqual(status["status"], "succeeded")
            self.assertEqual(status["selection"]["selected_calls"], 1)
            self.assertEqual(status["selection"]["skipped_existing"], 1)
            self.assertEqual(status["transcriptions"]["attempted"], 0)
            self.assertEqual(status["transcriptions"]["succeeded"], 0)
            self.assertEqual(status["artifacts"]["curated_rows_submitted"], 1)
            self.assertIn("sample-existing-missing-sha", stdout.getvalue())

    def test_execute_sample_provider_failure_returns_nonzero_with_sanitized_status(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            audio_path = tmp_path / "downloaded.wav"
            audio_path.write_bytes(b"audio")
            artifacts: dict[str, dict] = {}
            fake_transcriptions = FakeTranscriptions(fail_models={DEFAULT_TRANSCRIPTION_MODEL, DEFAULT_FALLBACK_TRANSCRIPTION_MODEL})

            def provider_factory(args):
                return OpenAITranscriptionProvider(
                    client=SimpleNamespace(audio=SimpleNamespace(transcriptions=fake_transcriptions))
                )

            def recording_downloader(bucket, key, max_bytes):
                return DownloadedRecording(
                    bucket=bucket,
                    key=key,
                    path=audio_path,
                    content_type="audio/x-wav",
                    byte_count=audio_path.stat().st_size,
                    sha256="sha1",
                )

            def artifact_writer(args, key, payload):
                artifacts[key] = dict(payload)

            def curated_publisher(args, rows):
                return PublishedTranscripts(
                    written={"name": "call_transcripts", "database": "gold_coast", "row_count": len(rows)},
                    glue={"database": "gold_coast", "name": "call_transcripts", "action": "updated"},
                )

            args = transcription_cli_parse_args(
                [
                    "--execute",
                    "--sample",
                    "--max-calls",
                    "1",
                    "--max-transcriptions-per-run",
                    "1",
                    "--s3-bucket",
                    "gcoffers-data-lake",
                    "--dry-run-output-dir",
                    str(tmp_path / "status"),
                    "--run-id",
                    "sample-failure",
                ]
            )
            stdout = io.StringIO()
            with redirect_stdout(stdout):
                exit_code = run_transcription_job(
                    args,
                    provider_factory=provider_factory,
                    source_selector=lambda args, limit: [
                        {
                            "call_message_id": "call1",
                            "recording_object_key": "recordings/ghl/message_id=call1.wav",
                            "recording_duration_seconds": 11,
                        }
                    ],
                    existing_rows_loader=lambda args: [],
                    recording_downloader=recording_downloader,
                    artifact_writer=artifact_writer,
                    curated_publisher=curated_publisher,
                )

            status_path = (
                tmp_path
                / "status"
                / "run-status"
                / "ghl-call-transcription"
                / "runs"
                / "run=sample-failure"
                / "status.json"
            )
            status = json.loads(status_path.read_text(encoding="utf-8"))
            rendered = json.dumps(status, sort_keys=True) + stdout.getvalue()

            self.assertEqual(exit_code, 1)
            self.assertEqual(status["status"], "failed")
            self.assertEqual(status["transcriptions"]["failed"], 0)
            self.assertEqual(status["transcriptions"]["pending_retry"], 1)
            self.assertNotIn(PRIVATE_RECORDING_URI, rendered)
            self.assertNotIn("recordings/ghl/message_id=call1.wav", rendered)
            self.assertEqual(len(artifacts), 1)


if __name__ == "__main__":
    unittest.main()
