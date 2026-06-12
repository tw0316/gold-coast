"""Bounded runtime for Gold Coast GHL call transcription.

The job is intentionally downstream from the hourly GHL refresh. It reads
archived private S3 recordings, calls the injected/provider transcription path,
writes private transcript artifacts, publishes the current transcript table, and
records only sanitized run status.
"""

from __future__ import annotations

import argparse
from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import tempfile
import sys
from typing import Any

from gold_coast_data_lake.alerts import ALERT_MODES, AlertConfig, alert_callback
from gold_coast_data_lake.batch import DynamoDbTtlLock, LocalTtlLock
from gold_coast_data_lake.curated import (
    DEFAULT_CURATED_PREFIX,
    DEFAULT_GLUE_DATABASE,
    TRANSCRIPT_TABLE_NAME,
    create_or_update_call_transcripts_glue_table,
    current_table_prefix,
    write_call_transcripts_table,
)
from gold_coast_data_lake.smoke import AthenaQueryError, execute_athena_query
from gold_coast_data_lake.storage import S3Uploader, format_run_id
from gold_coast_data_lake.transcription import (
    DEFAULT_ARTIFACT_SCHEMA_VERSION,
    DEFAULT_FALLBACK_TRANSCRIPTION_MODEL,
    DEFAULT_PROVIDER,
    DEFAULT_TRANSCRIPTION_MODEL,
    DownloadedRecording,
    OpenAITranscriptionProvider,
    TranscriptionProviderError,
    build_error_json,
    build_idempotency_key,
    build_transcript_artifact,
    build_transcript_artifact_key,
    build_transcript_row,
    download_private_s3_recording,
    normalize_error_payload,
    sanitize_error_value,
    sanitize_text,
    transcribe_with_deterministic_strategy,
)


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_DRY_RUN_OUTPUT_DIR = PROJECT_ROOT / "data" / "call-transcription"
DEFAULT_CURATED_OUTPUT_DIR = PROJECT_ROOT / "data" / "call-transcription-curated"
DEFAULT_SOURCE_ENVIRONMENT = os.environ.get("SOURCE_ENVIRONMENT", "production")
DEFAULT_LOCK_NAME = os.environ.get("LOCK_NAME", "ghl-call-transcription")
DEFAULT_STATUS_S3_PREFIX = os.environ.get("STATUS_S3_PREFIX", "run-status/ghl-call-transcription")
DEFAULT_CLOUDWATCH_LOG_URL = os.environ.get("CLOUDWATCH_LOG_URL")
DEFAULT_IMAGE_TAG = os.environ.get("IMAGE_TAG")
DEFAULT_ALERT_MODE = os.environ.get("ALERT_MODE", "off")
DEFAULT_SUCCESS_ALERT_UNTIL = os.environ.get("SUCCESS_ALERT_UNTIL")
DEFAULT_GLUE_DATABASE = os.environ.get("GLUE_DATABASE", DEFAULT_GLUE_DATABASE)
DEFAULT_ATHENA_WORKGROUP = os.environ.get("ATHENA_WORKGROUP", "gold_coast_data_lake")
DEFAULT_ATHENA_OUTPUT_LOCATION = os.environ.get("ATHENA_OUTPUT_LOCATION")
DEFAULT_TRANSCRIPT_ARTIFACT_PREFIX = os.environ.get(
    "TRANSCRIPT_ARTIFACT_PREFIX",
    "ai-artifacts/ghl/transcripts",
)
DEFAULT_OPENAI_SECRET_ID = os.environ.get("OPENAI_SECRET_ID") or os.environ.get("OPENAI_API_KEY_SECRET_ID")


@dataclass(frozen=True)
class RecordingLocation:
    bucket: str
    key: str


@dataclass(frozen=True)
class PublishedTranscripts:
    written: dict[str, Any] | None
    glue: dict[str, Any] | None


ProviderFactory = Callable[[argparse.Namespace], OpenAITranscriptionProvider]
SourceSelector = Callable[[argparse.Namespace, int], list[dict[str, Any]]]
ExistingRowsLoader = Callable[[argparse.Namespace], list[dict[str, Any]]]
ArtifactWriter = Callable[[argparse.Namespace, str, Mapping[str, Any]], None]
CuratedPublisher = Callable[[argparse.Namespace, list[dict[str, Any]]], PublishedTranscripts]
RecordingDownloader = Callable[[str, str, int], DownloadedRecording]
SENSITIVE_LOG_KEY_PARTS = (
    "api_key",
    "apikey",
    "authorization",
    "audio",
    "body",
    "credential",
    "email",
    "file",
    "password",
    "payload",
    "phone",
    "presigned",
    "provider_response",
    "recording",
    "secret",
    "token",
    "transcript_object",
    "transcript_text",
    "transcript_segments",
    "uri",
    "url",
    "webhook",
)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the Gold Coast GHL call transcription job.")
    parser.add_argument("--run-id", default=None)
    parser.add_argument("--sample", action="store_true", help="Run a bounded sample when used with --execute.")
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Execute bounded transcription. Requires provider credentials from an approved runtime secret source.",
    )
    parser.add_argument(
        "--dry-run-output-dir",
        default=str(DEFAULT_DRY_RUN_OUTPUT_DIR),
        help="Local output directory for sanitized run-status artifacts.",
    )
    parser.add_argument(
        "--curated-output-dir",
        default=str(DEFAULT_CURATED_OUTPUT_DIR),
        help="Local staging directory for the call_transcripts Parquet file.",
    )
    parser.add_argument("--s3-bucket", default=None, help="Runtime S3 bucket containing recordings and transcript output.")
    parser.add_argument(
        "--max-calls",
        type=int,
        default=1,
        help="Maximum source calls to select. Sample runs should keep this small.",
    )
    parser.add_argument(
        "--max-transcriptions-per-run",
        type=int,
        default=1,
        help="Maximum provider transcription attempts in one execute run.",
    )
    parser.add_argument("--recording-max-bytes", type=int, default=100 * 1024 * 1024)
    parser.add_argument("--artifact-schema-version", default=DEFAULT_ARTIFACT_SCHEMA_VERSION)
    parser.add_argument("--provider", default=DEFAULT_PROVIDER)
    parser.add_argument("--model", default=DEFAULT_TRANSCRIPTION_MODEL)
    parser.add_argument("--fallback-model", default=DEFAULT_FALLBACK_TRANSCRIPTION_MODEL)
    parser.add_argument(
        "--openai-secret-id",
        default=DEFAULT_OPENAI_SECRET_ID,
        help="Optional AWS Secrets Manager secret id for the OpenAI API key. The secret value is never logged.",
    )
    parser.add_argument("--transcript-artifact-prefix", default=DEFAULT_TRANSCRIPT_ARTIFACT_PREFIX)
    parser.add_argument("--source-environment", default=os.environ.get("SOURCE_ENVIRONMENT", DEFAULT_SOURCE_ENVIRONMENT))
    parser.add_argument("--status-s3-bucket", default=os.environ.get("STATUS_S3_BUCKET"))
    parser.add_argument("--status-s3-prefix", default=os.environ.get("STATUS_S3_PREFIX", DEFAULT_STATUS_S3_PREFIX))
    parser.add_argument("--curated-s3-prefix", default=os.environ.get("CURATED_S3_PREFIX", DEFAULT_CURATED_PREFIX))
    parser.add_argument("--skip-glue", action="store_true", help="Write curated Parquet but skip Glue table update.")
    parser.add_argument("--lock-table-name", default=os.environ.get("LOCK_TABLE_NAME"))
    parser.add_argument("--lock-name", default=os.environ.get("LOCK_NAME", DEFAULT_LOCK_NAME))
    parser.add_argument("--cloudwatch-log-url", default=os.environ.get("CLOUDWATCH_LOG_URL", DEFAULT_CLOUDWATCH_LOG_URL))
    parser.add_argument("--image-tag", default=os.environ.get("IMAGE_TAG", DEFAULT_IMAGE_TAG))
    parser.add_argument(
        "--alert-mode",
        default=DEFAULT_ALERT_MODE,
        choices=sorted(ALERT_MODES),
        help="Slack alert policy. Webhook URL is read only from SLACK_WEBHOOK_URL.",
    )
    parser.add_argument("--success-alert-until", default=DEFAULT_SUCCESS_ALERT_UNTIL)
    parser.add_argument("--glue-database", default=os.environ.get("GLUE_DATABASE", DEFAULT_GLUE_DATABASE))
    parser.add_argument("--athena-workgroup", default=os.environ.get("ATHENA_WORKGROUP", DEFAULT_ATHENA_WORKGROUP))
    parser.add_argument("--athena-output-location", default=DEFAULT_ATHENA_OUTPUT_LOCATION)
    parser.add_argument("--athena-timeout-seconds", type=int, default=120)
    parser.add_argument("--athena-poll-interval-seconds", type=float, default=2.0)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    return run_transcription_job(args)


def run_transcription_job(
    args: argparse.Namespace,
    *,
    provider_factory: ProviderFactory | None = None,
    source_selector: SourceSelector | None = None,
    existing_rows_loader: ExistingRowsLoader | None = None,
    recording_downloader: RecordingDownloader | None = None,
    artifact_writer: ArtifactWriter | None = None,
    curated_publisher: CuratedPublisher | None = None,
) -> int:
    run_id = args.run_id or format_run_id()
    logger = TranscriptionRunLogger(transcription_log_path(args, run_id))
    logger.write(
        "run_started",
        {
            "run_id": run_id,
            "dry_run": not args.execute,
            "execute": bool(args.execute),
            "sample": bool(args.sample),
            "source_environment": args.source_environment,
            "alert_mode": args.alert_mode,
            "limits": {
                "max_calls": args.max_calls,
                "max_transcriptions_per_run": args.max_transcriptions_per_run,
                "recording_max_bytes": args.recording_max_bytes,
            },
            "s3_bucket_configured": bool(args.s3_bucket),
            "status_s3_configured": bool(args.status_s3_bucket),
        },
    )
    lock = build_lock(args)
    lock_acquired = False

    limit_error = validate_limits(args)
    if limit_error:
        status = build_run_status(args, run_id=run_id, status="failed", dry_run=not args.execute, error=limit_error)
        write_and_publish_run_status(args, status, logger=logger)
        print(json.dumps(status["error"], indent=2, sort_keys=True), file=sys.stderr)
        return 2

    if args.execute and lock is not None:
        try:
            lock_acquired = lock.acquire(run_id)
        except Exception as exc:  # noqa: BLE001
            status = build_run_status(
                args,
                run_id=run_id,
                status="failed",
                dry_run=False,
                lock_info=build_lock_info(args, lock, acquired=False),
                error={"class": exc.__class__.__name__, "message": str(exc)},
            )
            write_and_publish_run_status(args, status, logger=logger)
            print(json.dumps(status["error"], indent=2, sort_keys=True), file=sys.stderr)
            return 2
        if not lock_acquired:
            status = build_run_status(
                args,
                run_id=run_id,
                status="failed",
                dry_run=False,
                lock_info=build_lock_info(args, lock, acquired=False),
                error={
                    "class": "RunAlreadyActive",
                    "message": "Another GHL call transcription run is active.",
                },
            )
            write_and_publish_run_status(args, status, logger=logger)
            print(json.dumps(status["error"], indent=2, sort_keys=True), file=sys.stderr)
            return 2

    try:
        if not args.execute:
            status = build_run_status(
                args,
                run_id=run_id,
                status="succeeded",
                dry_run=True,
                lock_info=build_lock_info(args, lock, acquired=lock_acquired),
                notes=[
                    "Dry-run status only. No OpenAI, AWS S3, Athena, Glue, GHL, Slack, transcript, or recording-url calls were made.",
                ],
            )
            output_path = write_and_publish_run_status(args, status, logger=logger)
            print(json.dumps({"status": status["status"], "run_id": run_id, "run_status_path": str(output_path)}, sort_keys=True))
            return 0

        preflight_error = validate_execute_preflight(args, provider_factory=provider_factory)
        if preflight_error:
            status = build_run_status(
                args,
                run_id=run_id,
                status="failed",
                dry_run=False,
                lock_info=build_lock_info(args, lock, acquired=lock_acquired),
                error=preflight_error,
            )
            write_and_publish_run_status(args, status, logger=logger)
            print(json.dumps(status["error"], indent=2, sort_keys=True), file=sys.stderr)
            return 2

        source_selector = source_selector or select_source_calls
        existing_rows_loader = existing_rows_loader or load_existing_call_transcript_rows
        recording_downloader = recording_downloader or download_recording
        artifact_writer = artifact_writer or write_provider_artifact_to_s3
        curated_publisher = curated_publisher or publish_call_transcripts
        provider_factory = provider_factory or build_provider

        try:
            result = execute_transcription_run(
                args,
                run_id=run_id,
                lock_info=build_lock_info(args, lock, acquired=lock_acquired),
                provider_factory=provider_factory,
                source_selector=source_selector,
                existing_rows_loader=existing_rows_loader,
                recording_downloader=recording_downloader,
                artifact_writer=artifact_writer,
                curated_publisher=curated_publisher,
                logger=logger,
            )
        except Exception as exc:  # noqa: BLE001
            result = build_run_status(
                args,
                run_id=run_id,
                status="failed",
                dry_run=False,
                lock_info=build_lock_info(args, lock, acquired=lock_acquired),
                error=build_error_json(exc, provider="local", model="sample_execution"),
                notes=["Sample execution failed before a transcript row could be published."],
            )
        write_and_publish_run_status(args, result, logger=logger)
        print(
            json.dumps(
                {
                    "status": result["status"],
                    "run_id": run_id,
                    "selected_calls": result["selection"]["selected_calls"],
                    "attempted": result["transcriptions"]["attempted"],
                    "succeeded": result["transcriptions"]["succeeded"],
                    "failed": result["transcriptions"]["failed"],
                    "pending_retry": result["transcriptions"]["pending_retry"],
                },
                sort_keys=True,
            )
        )
        return 0 if result["status"] == "succeeded" else 1
    finally:
        if lock_acquired and lock is not None:
            lock.release(run_id)


def execute_transcription_run(
    args: argparse.Namespace,
    *,
    run_id: str,
    lock_info: dict[str, Any],
    provider_factory: ProviderFactory,
    source_selector: SourceSelector,
    existing_rows_loader: ExistingRowsLoader,
    recording_downloader: RecordingDownloader,
    artifact_writer: ArtifactWriter,
    curated_publisher: CuratedPublisher,
    logger: "TranscriptionRunLogger | None" = None,
) -> dict[str, Any]:
    started_at = datetime.now(timezone.utc)
    max_selected = effective_selection_limit(args)
    provider = provider_factory(args)
    existing_rows = existing_rows_loader(args)
    existing_success = successful_idempotency_keys(existing_rows)
    existing_call_success = successful_call_model_keys(existing_rows)
    selected_rows = source_selector(args, max_selected)

    new_rows: list[dict[str, Any]] = []
    metrics = empty_metrics()
    metrics["selection"]["selected_calls"] = len(selected_rows)
    metrics["selection"]["existing_rows_loaded"] = len(existing_rows)
    if logger:
        logger.write(
            "source_selection_completed",
            {
                "selected_calls": len(selected_rows),
                "existing_rows_loaded": len(existing_rows),
                "effective_selection_limit": max_selected,
            },
        )

    for source in selected_rows:
        if metrics["transcriptions"]["attempted"] >= args.max_transcriptions_per_run:
            metrics["selection"]["skipped_over_cap"] += 1
            continue

        grain_keys = source_success_lookup_keys(source, args)
        source_sha = source_recording_sha(source)
        if any(grain_key in existing_success for grain_key in grain_keys) or (
            not source_sha and any(call_key in existing_call_success for call_key in source_call_model_keys(source, args))
        ):
            metrics["selection"]["skipped_existing"] += 1
            continue

        try:
            row = process_source_call(
                args,
                run_id=run_id,
                source=source,
                provider=provider,
                recording_downloader=recording_downloader,
                artifact_writer=artifact_writer,
                attempted_at=started_at,
            )
        except Exception as exc:  # noqa: BLE001
            row = failure_row(
                args,
                run_id=run_id,
                source=source,
                attempted_at=started_at,
                status="failed",
                error=exc,
                model=args.model,
                artifact_key=None,
            )
        new_rows.append(row)
        if row.get("provider_response_object_key"):
            metrics["artifacts"]["provider_artifacts_written"] += 1
        status = row.get("transcription_status")
        if status == "skipped_no_recording":
            metrics["selection"]["skipped_no_recording"] += 1
            continue
        metrics["transcriptions"]["attempted"] += 1
        if status == "succeeded":
            metrics["transcriptions"]["succeeded"] += 1
        elif status == "pending_retry":
            metrics["transcriptions"]["pending_retry"] += 1
        else:
            metrics["transcriptions"]["failed"] += 1

    published = PublishedTranscripts(written=None, glue=None)
    publish_error = None
    if existing_rows or new_rows:
        metrics["artifacts"]["curated_rows_submitted"] = len(existing_rows + new_rows)
        try:
            published = curated_publisher(args, existing_rows + new_rows)
        except Exception as exc:  # noqa: BLE001
            publish_error = build_error_json(exc, provider="local", model="curated_publish")
    if logger:
        logger.write(
            "transcription_counts_finalized",
            {
                "selection": metrics["selection"],
                "transcriptions": metrics["transcriptions"],
                "artifacts": metrics["artifacts"],
                "publish_error": publish_error,
            },
        )

    status_value = (
        "succeeded"
        if publish_error is None
        and metrics["transcriptions"]["failed"] == 0
        and metrics["transcriptions"]["pending_retry"] == 0
        else "failed"
    )
    finished_at = datetime.now(timezone.utc)
    return build_run_status(
        args,
        run_id=run_id,
        status=status_value,
        dry_run=False,
        lock_info=lock_info,
        started_at=started_at,
        finished_at=finished_at,
        metrics=metrics,
        published=published,
        error=publish_error,
        notes=[
            "Execution was bounded by --max-calls and --max-transcriptions-per-run.",
            "Run status contains counts and sanitized metadata only; transcripts and provider payloads stay out of status/log output.",
        ],
    )


def process_source_call(
    args: argparse.Namespace,
    *,
    run_id: str,
    source: Mapping[str, Any],
    provider: OpenAITranscriptionProvider,
    recording_downloader: RecordingDownloader,
    artifact_writer: ArtifactWriter,
    attempted_at: datetime,
) -> dict[str, Any]:
    source_row = dict(source)
    try:
        location = resolve_recording_location(source_row, default_bucket=args.s3_bucket)
    except Exception as exc:  # noqa: BLE001
        return failure_row(
            args,
            run_id=run_id,
            source=source_row,
            attempted_at=attempted_at,
            status="skipped_no_recording",
            error=exc,
            model=args.model,
            artifact_key=None,
        )

    downloaded_path: Path | None = None
    provider_audio_path: Path | None = None
    try:
        with tempfile.TemporaryDirectory(prefix="ghl-call-transcription-") as tmp:
            downloaded = recording_downloader(location.bucket, location.key, args.recording_max_bytes)
            downloaded_path = downloaded.path
            recording_sha256 = str(source_row.get("recording_sha256") or source_row.get("sha256") or downloaded.sha256)
            if source_row.get("recording_sha256") and str(source_row["recording_sha256"]) != downloaded.sha256:
                raise ValueError("archived recording checksum did not match selected metadata")
            source_row.update(
                {
                    "recording_s3_uri": f"s3://{location.bucket}/{location.key}",
                    "recording_object_key": location.key,
                    "recording_sha256": recording_sha256,
                    "recording_content_type": downloaded.content_type or source_row.get("recording_content_type"),
                    "recording_byte_count": downloaded.byte_count,
                }
            )
            provider_result = transcribe_with_deterministic_strategy(
                provider=provider,
                audio_path=downloaded.path,
                duration_seconds=source_row.get("recording_duration_seconds") or source_row.get("duration_seconds"),
                content_type=downloaded.content_type or source_row.get("recording_content_type"),
                primary_model=args.model,
                fallback_model=args.fallback_model,
            )
            provider_audio_path = provider_result.audio_path
            artifact_key = build_transcript_artifact_key(
                call_message_id=str(source_row.get("call_message_id") or source_row.get("message_id")),
                recording_sha256=recording_sha256,
                artifact_schema_version=args.artifact_schema_version,
                provider=args.provider,
                transcription_model=provider_result.model,
                run_id=run_id,
                prefix=args.transcript_artifact_prefix,
            )
            row = build_transcript_row(
                source=source_row,
                run_id=run_id,
                snapshot_at=attempted_at,
                artifact_schema_version=args.artifact_schema_version,
                provider=args.provider,
                transcription_model=provider_result.model,
                transcription_status="succeeded",
                transcription_response=provider_result.response,
                transcript_object_key=artifact_key,
                provider_response_object_key=artifact_key,
                attempt_count=len(provider_result.attempts),
                first_attempted_at=attempted_at,
                last_attempted_at=attempted_at,
                transcribed_at=datetime.now(timezone.utc),
            )
            artifact_writer(args, artifact_key, build_transcript_artifact(row=row, provider_response=provider_result.response))
            return row
    except Exception as exc:  # noqa: BLE001
        status = "pending_retry" if is_retryable_error(exc) else "failed"
        model = fallback_model_from_provider_error(exc) or args.model
        artifact_key = None
        call_message_id = source_row.get("call_message_id") or source_row.get("message_id")
        recording_sha256 = source_row.get("recording_sha256") or source_row.get("sha256")
        if call_message_id:
            artifact_key = build_transcript_artifact_key(
                call_message_id=str(call_message_id),
                recording_sha256=str(recording_sha256) if recording_sha256 else None,
                artifact_schema_version=args.artifact_schema_version,
                provider=args.provider,
                transcription_model=model,
                run_id=run_id,
                prefix=args.transcript_artifact_prefix,
            )
        row = failure_row(
            args,
            run_id=run_id,
            source=source_row,
            attempted_at=attempted_at,
            status=status,
            error=exc,
            model=model,
            artifact_key=artifact_key,
        )
        if artifact_key:
            try:
                artifact_writer(args, artifact_key, build_transcript_artifact(row=row, error=exc))
            except Exception as artifact_exc:  # noqa: BLE001
                return failure_row(
                    args,
                    run_id=run_id,
                    source=source_row,
                    attempted_at=attempted_at,
                    status="failed",
                    error=artifact_exc,
                    model=model,
                    artifact_key=None,
                )
        return row
    finally:
        cleanup_temp_file(provider_audio_path, keep=downloaded_path)
        cleanup_temp_file(downloaded_path)


def failure_row(
    args: argparse.Namespace,
    *,
    run_id: str,
    source: Mapping[str, Any],
    attempted_at: datetime,
    status: str,
    error: BaseException,
    model: str,
    artifact_key: str | None,
) -> dict[str, Any]:
    return build_transcript_row(
        source=source,
        run_id=run_id,
        snapshot_at=attempted_at,
        artifact_schema_version=args.artifact_schema_version,
        provider=args.provider,
        transcription_model=model,
        transcription_status=status,
        transcript_object_key=artifact_key,
        provider_response_object_key=artifact_key,
        error=normalize_error_payload(error, provider=args.provider, model=model),
        attempt_count=attempt_count_from_error(error),
        first_attempted_at=attempted_at,
        last_attempted_at=attempted_at,
    )


def select_source_calls(args: argparse.Namespace, limit: int) -> list[dict[str, Any]]:
    if limit <= 0:
        return []
    return select_source_calls_from_athena(args, limit=limit)


def select_source_calls_from_athena(args: argparse.Namespace, *, limit: int) -> list[dict[str, Any]]:
    output_location = resolve_athena_output_location(args)
    if not output_location:
        raise RuntimeError("Athena source selection requires --athena-output-location or --s3-bucket")
    client = build_athena_client()
    sql = archived_recordings_sql(args, limit=limit, include_existing_filter=True)
    try:
        _, rows = execute_athena_query(
            sql,
            database=args.glue_database,
            workgroup=args.athena_workgroup,
            output_location=output_location,
            client=client,
            timeout_seconds=args.athena_timeout_seconds,
            poll_interval_seconds=args.athena_poll_interval_seconds,
        )
    except AthenaQueryError as exc:
        if not is_missing_call_transcripts_error(exc):
            raise
        _, rows = execute_athena_query(
            archived_recordings_sql(args, limit=limit, include_existing_filter=False),
            database=args.glue_database,
            workgroup=args.athena_workgroup,
            output_location=output_location,
            client=client,
            timeout_seconds=args.athena_timeout_seconds,
            poll_interval_seconds=args.athena_poll_interval_seconds,
        )
    return [dict(row) for row in rows[:limit]]


def archived_recordings_sql(args: argparse.Namespace, *, limit: int, include_existing_filter: bool) -> str:
    existing_join = ""
    existing_where = ""
    if include_existing_filter:
        existing_models = ", ".join(sql_literal(model) for model in successful_transcription_models(args))
        existing_join = f"""
LEFT JOIN {args.glue_database}.call_transcripts t
    ON t.call_message_id = c.call_message_id
    AND (
        nullif(trim(coalesce(r.sha256, c.recording_sha256)), '') IS NULL
        OR coalesce(t.recording_sha256, '') = coalesce(r.sha256, c.recording_sha256, '')
    )
    AND t.artifact_schema_version = {sql_literal(args.artifact_schema_version)}
    AND t.provider = {sql_literal(args.provider)}
    AND t.transcription_model IN ({existing_models})
    AND t.transcription_status = 'succeeded'
"""
        existing_where = "AND t.call_message_id IS NULL"
    return f"""
WITH ranked_recordings AS (
SELECT
    c.call_message_id,
    c.conversation_id,
    c.contact_id,
    max(o.opportunity_id) AS opportunity_id,
    c.actor_user_id,
    c.direction,
    c.call_status,
    coalesce(r.s3_uri, c.recording_s3_uri) AS recording_s3_uri,
    coalesce(r.object_key, c.recording_object_key) AS recording_object_key,
    coalesce(r.sha256, c.recording_sha256) AS recording_sha256,
    coalesce(r.content_type, c.recording_content_type) AS recording_content_type,
    coalesce(r.byte_count, c.recording_byte_count) AS recording_byte_count,
    c.duration_seconds AS recording_duration_seconds,
    c.run_id AS source_call_run_id,
    r.run_id AS source_recording_run_id,
    c.snapshot_at AS source_call_snapshot_at,
    r.snapshot_at AS source_recording_snapshot_at,
    row_number() OVER (
        PARTITION BY c.call_message_id
        ORDER BY
            CASE WHEN try_cast(c.duration_seconds AS double) BETWEEN 10 AND 120 THEN 0 ELSE 1 END,
            try_cast(c.duration_seconds AS double) ASC NULLS LAST,
            c.snapshot_at DESC,
            r.snapshot_at DESC,
            coalesce(r.archived_at, r.snapshot_at) DESC
    ) AS source_rank
FROM {args.glue_database}.calls c
JOIN {args.glue_database}.call_recordings r
    ON r.message_id = c.call_message_id
LEFT JOIN {args.glue_database}.opportunities_latest o
    ON o.contact_id = c.contact_id
{existing_join}
WHERE coalesce(c.has_recording, false) = true
    AND nullif(trim(coalesce(r.object_key, c.recording_object_key)), '') IS NOT NULL
    {existing_where}
GROUP BY
    c.call_message_id,
    c.conversation_id,
    c.contact_id,
    c.actor_user_id,
    c.direction,
    c.call_status,
    coalesce(r.s3_uri, c.recording_s3_uri),
    coalesce(r.object_key, c.recording_object_key),
    coalesce(r.sha256, c.recording_sha256),
    coalesce(r.content_type, c.recording_content_type),
    coalesce(r.byte_count, c.recording_byte_count),
    c.duration_seconds,
    c.run_id,
    r.run_id,
    c.snapshot_at,
    r.snapshot_at,
    r.archived_at
)
SELECT
    call_message_id,
    conversation_id,
    contact_id,
    opportunity_id,
    actor_user_id,
    direction,
    call_status,
    recording_s3_uri,
    recording_object_key,
    recording_sha256,
    recording_content_type,
    recording_byte_count,
    recording_duration_seconds,
    source_call_run_id,
    source_recording_run_id,
    source_call_snapshot_at,
    source_recording_snapshot_at
FROM ranked_recordings
WHERE source_rank = 1
ORDER BY
    CASE WHEN try_cast(recording_duration_seconds AS double) BETWEEN 10 AND 120 THEN 0 ELSE 1 END,
    try_cast(recording_duration_seconds AS double) ASC NULLS LAST,
    source_call_snapshot_at DESC,
    call_message_id
LIMIT {int(limit)}
"""


def load_existing_call_transcript_rows(args: argparse.Namespace) -> list[dict[str, Any]]:
    if not args.s3_bucket:
        return []
    key = f"{current_table_prefix(args.curated_s3_prefix, TRANSCRIPT_TABLE_NAME)}/part-00000.parquet"
    try:
        import boto3  # type: ignore
        import pyarrow.parquet as pq  # type: ignore
    except ImportError:
        return []
    s3_client = boto3.client("s3")
    with tempfile.TemporaryDirectory(prefix="ghl-call-transcripts-current-") as tmp:
        local_path = Path(tmp) / "part-00000.parquet"
        try:
            s3_client.download_file(args.s3_bucket, key, str(local_path))
        except Exception as exc:  # noqa: BLE001
            if is_missing_s3_object_error(exc):
                return []
            raise
        return [dict(row) for row in pq.read_table(local_path).to_pylist()]


def publish_call_transcripts(args: argparse.Namespace, rows: list[dict[str, Any]]) -> PublishedTranscripts:
    written = write_call_transcripts_table(
        rows,
        local_output_dir=args.curated_output_dir,
        s3_bucket=args.s3_bucket,
        s3_prefix=args.curated_s3_prefix,
        glue_database=args.glue_database,
    )
    glue_result = None
    if not args.skip_glue and args.s3_bucket:
        glue_result = create_or_update_call_transcripts_glue_table(
            database_name=args.glue_database,
            s3_bucket=args.s3_bucket,
            s3_prefix=args.curated_s3_prefix,
        )
    return PublishedTranscripts(
        written={
            "name": written.name,
            "database": written.database,
            "row_count": written.row_count,
            "s3_key": written.s3_key,
            "byte_count": written.byte_count,
            "object_count": written.object_count,
        },
        glue=None
        if glue_result is None
        else {
            "database": glue_result.database,
            "name": glue_result.name,
            "action": glue_result.action,
        },
    )


def write_provider_artifact_to_s3(args: argparse.Namespace, key: str, payload: Mapping[str, Any]) -> None:
    if not args.s3_bucket:
        raise RuntimeError("S3 bucket is required to write transcript provider artifacts")
    try:
        import boto3  # type: ignore
    except ImportError as exc:
        raise RuntimeError("boto3 is required for transcript artifact writes") from exc
    boto3.client("s3").put_object(
        Bucket=args.s3_bucket,
        Key=key,
        Body=json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8"),
        ContentType="application/json",
        ServerSideEncryption="AES256",
    )


def build_provider(args: argparse.Namespace) -> OpenAITranscriptionProvider:
    if args.provider != DEFAULT_PROVIDER:
        raise ValueError(f"unsupported transcription provider: {sanitize_text(str(args.provider))}")
    return OpenAITranscriptionProvider(api_key=resolve_openai_api_key(args))


def resolve_openai_api_key(
    args: argparse.Namespace,
    *,
    secrets_client: Any | None = None,
) -> str | None:
    env_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("OPENAI_TRANSCRIPTION_API_KEY")
    if env_key:
        return env_key
    secret_id = getattr(args, "openai_secret_id", None)
    if not secret_id:
        return None
    return read_openai_api_key_secret(str(secret_id), secrets_client=secrets_client)


def read_openai_api_key_secret(secret_id: str, *, secrets_client: Any | None = None) -> str:
    if secrets_client is None:
        try:
            import boto3  # type: ignore
        except ImportError as exc:
            raise RuntimeError("boto3 is required to read the OpenAI API key from Secrets Manager") from exc
        secrets_client = boto3.client("secretsmanager")
    response = secrets_client.get_secret_value(SecretId=secret_id)
    secret_string = response.get("SecretString")
    if not secret_string:
        raise ValueError("OpenAI API key secret did not contain a SecretString")
    return parse_openai_secret_string(str(secret_string))


def parse_openai_secret_string(secret_string: str) -> str:
    stripped = secret_string.strip()
    if not stripped:
        raise ValueError("OpenAI API key secret was empty")
    if stripped.startswith("{"):
        payload = json.loads(stripped)
        if not isinstance(payload, Mapping):
            raise ValueError("OpenAI API key secret JSON must be an object")
        for key in ("OPENAI_API_KEY", "OPENAI_TRANSCRIPTION_API_KEY", "openai_api_key", "api_key"):
            value = payload.get(key)
            if value:
                return str(value)
        raise ValueError("OpenAI API key secret JSON did not contain a supported key")
    return stripped


def download_recording(bucket: str, key: str, max_bytes: int) -> DownloadedRecording:
    return download_private_s3_recording(bucket=bucket, key=key, max_bytes=max_bytes)


def build_athena_client() -> Any:
    try:
        import boto3  # type: ignore
    except ImportError as exc:
        raise RuntimeError("boto3 is required for Athena source selection") from exc
    return boto3.client("athena")


def validate_execute_preflight(args: argparse.Namespace, *, provider_factory: ProviderFactory | None = None) -> dict[str, Any] | None:
    if not args.s3_bucket:
        return {"class": "MissingS3Bucket", "message": "--execute requires --s3-bucket"}
    if (
        args.provider == DEFAULT_PROVIDER
        and provider_factory is None
        and not openai_api_key_present(os.environ)
        and not getattr(args, "openai_secret_id", None)
    ):
        return {
            "class": "MissingOpenAIAPIKey",
            "message": (
                "OpenAI API key missing. Set OPENAI_API_KEY, OPENAI_TRANSCRIPTION_API_KEY, "
                "or --openai-secret-id through the approved AWS Secrets Manager runtime path before --execute."
            ),
        }
    return None


def validate_limits(args: argparse.Namespace) -> dict[str, Any] | None:
    if args.max_calls < 0:
        return {"class": "InvalidLimit", "message": "--max-calls must be non-negative"}
    if args.max_transcriptions_per_run < 0:
        return {"class": "InvalidLimit", "message": "--max-transcriptions-per-run must be non-negative"}
    if args.recording_max_bytes <= 0:
        return {"class": "InvalidLimit", "message": "--recording-max-bytes must be positive"}
    return None


def openai_api_key_present(env: Mapping[str, str]) -> bool:
    return bool(env.get("OPENAI_API_KEY") or env.get("OPENAI_TRANSCRIPTION_API_KEY"))


def build_run_status(
    args: argparse.Namespace,
    *,
    run_id: str,
    status: str,
    dry_run: bool,
    lock_info: dict[str, Any] | None = None,
    started_at: datetime | None = None,
    finished_at: datetime | None = None,
    metrics: dict[str, Any] | None = None,
    published: PublishedTranscripts | None = None,
    error: dict[str, Any] | None = None,
    notes: list[str] | None = None,
) -> dict[str, Any]:
    started = started_at or datetime.now(timezone.utc)
    finished = finished_at or started
    duration_seconds = max(0.0, (finished - started).total_seconds())
    safe_metrics = metrics or empty_metrics()
    payload = {
        "source": "ghl-call-transcription",
        "entrypoint": "gold_coast_data_lake.jobs.ghl_call_transcription",
        "run_id": run_id,
        "status": status,
        "dry_run": dry_run,
        "sample": bool(args.sample),
        "execute": bool(args.execute),
        "started_at": isoformat(started),
        "finished_at": isoformat(finished),
        "duration_seconds": duration_seconds,
        "provider": args.provider,
        "transcription_model": args.model,
        "fallback_model": args.fallback_model,
        "openai_secret_configured": bool(getattr(args, "openai_secret_id", None) or openai_api_key_present(os.environ)),
        "artifact_schema_version": args.artifact_schema_version,
        "s3_bucket_configured": bool(args.s3_bucket),
        "status_s3_configured": bool(args.status_s3_bucket),
        "source_environment": args.source_environment,
        "image_tag": args.image_tag,
        "cloudwatch_log_url": sanitize_cloudwatch_log_url(args.cloudwatch_log_url),
        "log_path": transcription_log_location(args, run_id, dry_run=dry_run),
        "alert_status": "skipped_policy",
        "alert_error": None,
        "glue_database": args.glue_database,
        "athena_workgroup": args.athena_workgroup,
        "lock": lock_info or {"provider": "none", "name": args.lock_name, "acquired": False},
        "limits": {
            "max_calls": args.max_calls,
            "max_transcriptions_per_run": args.max_transcriptions_per_run,
            "effective_selection_limit": effective_selection_limit(args),
            "recording_max_bytes": args.recording_max_bytes,
        },
        "selection": safe_metrics["selection"],
        "transcriptions": safe_metrics["transcriptions"],
        "artifacts": safe_metrics["artifacts"],
        "published": {
            "written": sanitize_error_value(published.written) if published else None,
            "glue": sanitize_error_value(published.glue) if published else None,
        },
        "notes": notes or [],
        "error": sanitize_error_value(error) if error else None,
    }
    return payload


def empty_metrics() -> dict[str, Any]:
    return {
        "selection": {
            "selected_calls": 0,
            "existing_rows_loaded": 0,
            "skipped_existing": 0,
            "skipped_no_recording": 0,
            "skipped_over_cap": 0,
        },
        "transcriptions": {
            "attempted": 0,
            "succeeded": 0,
            "failed": 0,
            "pending_retry": 0,
        },
        "artifacts": {
            "provider_artifacts_written": 0,
            "curated_rows_submitted": 0,
        },
    }


def build_lock(args: argparse.Namespace) -> DynamoDbTtlLock | LocalTtlLock | None:
    if not args.execute:
        return None
    if args.lock_table_name:
        return DynamoDbTtlLock(table_name=args.lock_table_name, lock_name=args.lock_name)
    safe_lock_name = "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in args.lock_name)
    return LocalTtlLock(
        Path(args.dry_run_output_dir) / "run-status" / "ghl-call-transcription" / "locks" / f"{safe_lock_name}.lock"
    )


def build_lock_info(
    args: argparse.Namespace,
    lock: DynamoDbTtlLock | LocalTtlLock | None,
    *,
    acquired: bool,
) -> dict[str, Any]:
    return {
        "provider": getattr(lock, "provider", "none") if lock is not None else "none",
        "name": args.lock_name,
        "ttl_seconds": getattr(lock, "ttl_seconds", None),
        "acquired": acquired,
    }


class TranscriptionRunLogger:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def write(self, event: str, details: dict[str, Any] | None = None) -> None:
        payload = {
            "at": isoformat(datetime.now(timezone.utc)),
            "event": event,
            "details": sanitize_log_value(details or {}),
        }
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(payload, sort_keys=True, separators=(",", ":")) + "\n")


def write_and_publish_run_status(
    args: argparse.Namespace,
    payload: dict[str, Any],
    *,
    logger: TranscriptionRunLogger | None = None,
) -> Path:
    run_id = str(payload["run_id"])
    logger = logger or TranscriptionRunLogger(transcription_log_path(args, run_id))
    payload["log_path"] = transcription_log_location(args, run_id, dry_run=bool(payload.get("dry_run")))
    apply_alert_policy(args, payload, logger=logger)
    logger.write(
        "run_completed",
        {
            "run_id": run_id,
            "status": payload.get("status"),
            "duration_seconds": payload.get("duration_seconds"),
            "alert_status": payload.get("alert_status"),
        },
    )
    path = write_run_status(Path(args.dry_run_output_dir), payload)
    if args.execute and args.status_s3_bucket:
        publish_run_status(args, path, payload, log_path=logger.path)
    return path


def write_run_status(output_dir: Path, payload: dict[str, Any]) -> Path:
    run_id = str(payload["run_id"])
    status_root = output_dir / "run-status" / "ghl-call-transcription"
    path = status_root / "runs" / f"run={run_id}" / "status.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_name(f".{path.name}.tmp")
    tmp_path.write_text(json.dumps(payload, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
    tmp_path.replace(path)
    if not payload.get("dry_run"):
        latest_name = "latest-success.json" if payload.get("status") == "succeeded" else "latest-failure.json"
        latest_path = status_root / latest_name
        latest_tmp_path = latest_path.with_name(f".{latest_path.name}.tmp")
        latest_tmp_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        latest_tmp_path.replace(latest_path)
    return path


def publish_run_status(
    args: argparse.Namespace,
    status_path: Path,
    payload: dict[str, Any],
    *,
    log_path: Path | None = None,
) -> None:
    uploader = S3Uploader(args.status_s3_bucket)
    run_id = str(payload["run_id"])
    status_prefix = args.status_s3_prefix.strip("/")
    uploader.upload_file(
        status_path,
        join_s3_key(status_prefix, "runs", f"run={run_id}", "status.json"),
        content_type="application/json",
    )
    if not payload.get("dry_run"):
        latest_name = "latest-success.json" if payload.get("status") == "succeeded" else "latest-failure.json"
        latest_path = status_path.parents[2] / latest_name
        uploader.upload_file(latest_path, join_s3_key(status_prefix, latest_name), content_type="application/json")
    if log_path and log_path.exists():
        uploader.upload_file(
            log_path,
            transcription_log_s3_key(args, run_id),
            content_type="application/x-ndjson",
        )


def apply_alert_policy(
    args: argparse.Namespace,
    payload: dict[str, Any],
    *,
    logger: TranscriptionRunLogger | None = None,
) -> None:
    try:
        callback = alert_callback(
            AlertConfig(
                webhook_url=os.environ.get("SLACK_WEBHOOK_URL"),
                mode=args.alert_mode,
                success_alert_until=args.success_alert_until,
                cloudwatch_log_url=args.cloudwatch_log_url,
            )
        )
        payload["alert_status"] = callback(payload)
        payload["alert_error"] = None
        if logger:
            logger.write("alert_evaluated", {"alert_status": payload["alert_status"]})
    except Exception as exc:  # noqa: BLE001
        payload["alert_status"] = "failed"
        payload["alert_error"] = sanitize_error_value({"class": exc.__class__.__name__, "message": str(exc)})
        if logger:
            logger.write("alert_failed", payload["alert_error"])


def transcription_log_path(args: argparse.Namespace, run_id: str) -> Path:
    return Path(args.dry_run_output_dir) / "run-status" / "ghl-call-transcription" / "logs" / f"run={run_id}.jsonl"


def transcription_log_location(args: argparse.Namespace, run_id: str, *, dry_run: bool) -> str:
    if args.execute and args.status_s3_bucket and not dry_run:
        return f"s3://{args.status_s3_bucket}/{transcription_log_s3_key(args, run_id)}"
    return str(transcription_log_path(args, run_id))


def transcription_log_s3_key(args: argparse.Namespace, run_id: str) -> str:
    return join_s3_key(args.status_s3_prefix.strip("/"), "logs", f"run={run_id}.jsonl")


def sanitize_cloudwatch_log_url(value: Any) -> Any:
    if value is None or value == "":
        return None
    text = str(value)
    if text.startswith("https://console.aws.amazon.com/cloudwatch/") and not any(
        marker in text.lower()
        for marker in (
            "hooks.slack.com/",
            "authorization:",
            "bearer ",
            "x-api-key",
            "api_key",
            "apikey",
            "access_token",
            "refresh_token",
            "webhook",
            "secret",
            "password",
        )
    ):
        return text
    return sanitize_error_value(text)


def sanitize_log_value(value: Any) -> Any:
    if isinstance(value, Mapping):
        sanitized: dict[str, Any] = {}
        for key, item in value.items():
            lowered = str(key).lower()
            if any(part in lowered for part in SENSITIVE_LOG_KEY_PARTS):
                sanitized[str(key)] = "[redacted]"
            else:
                sanitized[str(key)] = sanitize_log_value(item)
        return sanitized
    if isinstance(value, list):
        return [sanitize_log_value(item) for item in value]
    if isinstance(value, tuple):
        return [sanitize_log_value(item) for item in value]
    if isinstance(value, bytes):
        return "[redacted]"
    if isinstance(value, str):
        return sanitize_text(value)
    return value


def successful_idempotency_keys(rows: Iterable[Mapping[str, Any]]) -> set[str]:
    keys: set[str] = set()
    for row in rows:
        if row.get("transcription_status") != "succeeded":
            continue
        call_message_id = row.get("call_message_id")
        artifact_schema_version = row.get("artifact_schema_version")
        provider = row.get("provider")
        model = row.get("transcription_model")
        if not call_message_id or not artifact_schema_version or not provider or not model:
            continue
        keys.add(
            build_idempotency_key(
                str(call_message_id),
                str(row.get("recording_sha256") or ""),
                str(artifact_schema_version),
                str(provider),
                str(model),
            )
        )
    return keys


def successful_call_model_keys(rows: Iterable[Mapping[str, Any]]) -> set[tuple[str, str, str, str]]:
    keys: set[tuple[str, str, str, str]] = set()
    for row in rows:
        if row.get("transcription_status") != "succeeded":
            continue
        call_message_id = row.get("call_message_id")
        artifact_schema_version = row.get("artifact_schema_version")
        provider = row.get("provider")
        model = row.get("transcription_model")
        if not call_message_id or not artifact_schema_version or not provider or not model:
            continue
        keys.add((str(call_message_id), str(artifact_schema_version), str(provider), str(model)))
    return keys


def source_success_lookup_keys(source: Mapping[str, Any], args: argparse.Namespace) -> set[str]:
    call_message_id = str(source.get("call_message_id") or source.get("message_id"))
    recording_sha256 = source_recording_sha(source)
    return {
        build_idempotency_key(
            call_message_id,
            recording_sha256,
            args.artifact_schema_version,
            args.provider,
            model,
        )
        for model in successful_transcription_models(args)
    }


def source_call_model_keys(source: Mapping[str, Any], args: argparse.Namespace) -> set[tuple[str, str, str, str]]:
    call_message_id = str(source.get("call_message_id") or source.get("message_id"))
    return {
        (call_message_id, args.artifact_schema_version, args.provider, model)
        for model in successful_transcription_models(args)
    }


def successful_transcription_models(args: argparse.Namespace) -> tuple[str, ...]:
    models = [args.model, args.fallback_model]
    if args.model and args.fallback_model and args.model != args.fallback_model:
        models.extend([f"{args.model}+{args.fallback_model}", f"{args.fallback_model}+{args.model}"])
    seen: set[str] = set()
    ordered: list[str] = []
    for model in models:
        text = str(model).strip()
        if text and text not in seen:
            seen.add(text)
            ordered.append(text)
    return tuple(ordered)


def source_recording_sha(source: Mapping[str, Any]) -> str:
    value = source.get("recording_sha256") or source.get("sha256") or ""
    return str(value).strip()


def resolve_recording_location(source: Mapping[str, Any], *, default_bucket: str | None) -> RecordingLocation:
    s3_uri = source.get("recording_s3_uri") or source.get("s3_uri")
    if isinstance(s3_uri, str) and s3_uri.startswith("s3://"):
        bucket, key = split_s3_uri(s3_uri)
        return RecordingLocation(bucket=bucket, key=key)
    key = source.get("recording_object_key") or source.get("object_key")
    if not default_bucket or not key:
        raise ValueError("source row is missing archived recording bucket or object key")
    return RecordingLocation(bucket=default_bucket, key=str(key))


def split_s3_uri(uri: str) -> tuple[str, str]:
    rest = uri[len("s3://") :]
    bucket, sep, key = rest.partition("/")
    if not bucket or not sep or not key:
        raise ValueError("invalid S3 URI")
    return bucket, key


def effective_selection_limit(args: argparse.Namespace) -> int:
    return max(0, min(args.max_calls, args.max_transcriptions_per_run))


def attempt_count_from_error(error: BaseException) -> int:
    attempts = getattr(error, "attempts", None)
    if attempts:
        return len(attempts)
    return 1


def fallback_model_from_provider_error(error: BaseException) -> str | None:
    attempts = getattr(error, "attempts", None)
    if not attempts:
        return None
    for attempt in reversed(attempts):
        if getattr(attempt, "model", None):
            return str(attempt.model)
    return None


def is_retryable_error(error: BaseException) -> bool:
    if isinstance(error, TranscriptionProviderError):
        return True
    status_code = getattr(error, "status_code", None) or getattr(error, "status", None)
    try:
        code = int(status_code)
    except (TypeError, ValueError):
        code = None
    if code in {408, 409, 425, 429} or (code is not None and code >= 500):
        return True
    lowered = f"{error.__class__.__name__} {error}".lower()
    return any(token in lowered for token in ("timeout", "temporar", "throttl", "rate limit", "connection reset"))


def cleanup_temp_file(path: Path | None, *, keep: Path | None = None) -> None:
    if path is None or keep is not None and path == keep:
        return
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass


def resolve_athena_output_location(args: argparse.Namespace) -> str | None:
    if args.athena_output_location:
        return args.athena_output_location
    if not args.s3_bucket:
        return None
    return f"s3://{args.s3_bucket}/athena-results/ghl/call-transcription/"


def is_missing_call_transcripts_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return "call_transcripts" in text and any(token in text for token in ("not found", "does not exist", "table"))


def is_missing_s3_object_error(exc: Exception) -> bool:
    response = getattr(exc, "response", {})
    code = str(response.get("Error", {}).get("Code", ""))
    return code in {"404", "NoSuchKey", "NotFound"}


def sql_literal(value: Any) -> str:
    text = str(value)
    return "'" + text.replace("'", "''") + "'"


def isoformat(moment: datetime | str | None) -> str | None:
    if moment is None:
        return None
    if isinstance(moment, str):
        return moment
    return moment.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def join_s3_key(*parts: str) -> str:
    return "/".join(part.strip("/") for part in parts if part and part.strip("/"))


if __name__ == "__main__":
    raise SystemExit(main())
