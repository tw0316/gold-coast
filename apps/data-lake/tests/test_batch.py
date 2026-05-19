from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

from gold_coast_data_lake.batch import (
    BatchRefreshRunner,
    DynamoDbTtlLock,
    LocalTtlLock,
    historical_run_status_key,
    historical_run_status_path,
    latest_success_status_key,
    latest_failure_status_path,
    latest_success_status_path,
    run_status_log_key,
    sanitize,
)
from gold_coast_data_lake.jobs.ghl_batch_refresh import (
    build_lock,
    build_production_refresh_phase,
    build_status_uploader,
    join_s3_prefix,
    parse_args,
    resolve_athena_output_location,
)
from gold_coast_data_lake.raw_refresh import DEFAULT_RAW_REFRESH_ENTITIES


FAKE_SLACK_WEBHOOK = "https://hooks." + "slack.com/services/nope"


def production_metadata(**overrides):
    metadata = {
        "entrypoint": "gold_coast_data_lake.jobs.ghl_batch_refresh",
        "entities": list(DEFAULT_RAW_REFRESH_ENTITIES),
        "default_entities": list(DEFAULT_RAW_REFRESH_ENTITIES),
        "extractor_dry_run": False,
        "skip_curated": False,
        "max_items": None,
        "max_pages": None,
        "pipeline_ids": [],
        "conversation_ids": [],
        "message_ids": [],
        "download_recordings": False,
    }
    metadata.update(overrides)
    return metadata


def passed_smoke_check(**overrides):
    check = {
        "name": "athena_curated_snapshot",
        "check_name": "athena_curated_snapshot",
        "status": "passed",
        "checked_at": "2026-05-18T22:01:00Z",
        "queried_tables": ["contacts"],
        "freshness_result": {"status": "passed", "age_minutes": 1, "max_age_minutes": 120},
        "row_availability_result": {"status": "passed", "table_counts": {"contacts": 1}, "missing_tables": []},
    }
    check.update(overrides)
    return check


class FakeStatusUploader:
    def __init__(self) -> None:
        self.uploads = []

    def upload_file(self, path, relative_key, *, content_type=None):
        self.uploads.append(
            {
                "key": relative_key,
                "content_type": content_type,
                "content": Path(path).read_text(encoding="utf-8"),
            }
        )
        return self.uri(relative_key)

    def uri(self, relative_key):
        return f"s3://bucket/{relative_key}"


class ConditionalFailure(Exception):
    response = {"Error": {"Code": "ConditionalCheckFailedException"}}


class BatchRunnerTests(unittest.TestCase):
    def test_sanitize_redacts_sensitive_values(self) -> None:
        payload = {
            "api_key": "secret",
            "nested": {"Authorization": "Bearer abc", "count": 1},
            "items": [{"phone": "5551234567"}, {"safe": "ok"}],
        }
        self.assertEqual(
            sanitize(payload),
            {
                "api_key": "[redacted]",
                "nested": {"Authorization": "[redacted]", "count": 1},
                "items": [{"phone": "[redacted]"}, {"safe": "ok"}],
            },
        )

    def test_local_ttl_lock_blocks_active_overlap_and_allows_expired(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            lock = LocalTtlLock(Path(tmp) / "lock.json", ttl_seconds=60)
            now = datetime(2026, 5, 18, 22, 0, tzinfo=timezone.utc)
            later = datetime(2026, 5, 18, 22, 2, tzinfo=timezone.utc)

            self.assertTrue(lock.acquire("run1", now=now))
            self.assertFalse(lock.acquire("run2", now=now))
            self.assertTrue(lock.acquire("run2", now=later))

    def test_dynamodb_ttl_lock_uses_conditional_put_and_owner_release(self) -> None:
        client = mock.Mock()
        lock = DynamoDbTtlLock("locks", client=client, ttl_seconds=60)
        now = datetime(2026, 5, 18, 22, 0, tzinfo=timezone.utc)

        self.assertTrue(lock.acquire("run1", now=now))
        put_call = client.put_item.call_args.kwargs
        self.assertEqual(put_call["TableName"], "locks")
        self.assertEqual(put_call["Item"]["lock_name"], {"S": "ghl-refresh"})
        self.assertEqual(put_call["Item"]["owner_run_id"], {"S": "run1"})
        self.assertIn("expires_at_epoch", put_call["Item"])
        self.assertIn("ConditionExpression", put_call)

        client.put_item.side_effect = ConditionalFailure()
        self.assertFalse(lock.acquire("run2", now=now))

        client.put_item.side_effect = None
        lock.release("run1", now=now)
        release_call = client.update_item.call_args.kwargs
        self.assertEqual(release_call["Key"], {"lock_name": {"S": "ghl-refresh"}})
        self.assertEqual(release_call["ExpressionAttributeValues"][":run_id"], {"S": "run1"})

    def test_dry_run_writes_immutable_status_without_latest_pointer(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            status_dir = Path(tmp) / "status"
            runner = BatchRefreshRunner(status_dir=status_dir, output_dir=Path(tmp) / "extracts")
            result = runner.run(run_id="20260518T220000Z", dry_run=True, metadata={"webhook_url": FAKE_SLACK_WEBHOOK})

            self.assertEqual(result["status"], "succeeded")
            self.assertEqual(result["phases"][0]["name"], "dry_run_validation")
            self.assertEqual(result["lock"]["ttl_seconds"], 2700)
            run_status_text = historical_run_status_path(status_dir, "20260518T220000Z").read_text(encoding="utf-8")
            run_status = json.loads(run_status_text)
            log_lines = (status_dir / "logs" / "run=20260518T220000Z.jsonl").read_text(encoding="utf-8").splitlines()

            self.assertEqual(run_status["run_id"], "20260518T220000Z")
            self.assertEqual(run_status_text.count("\n"), 1)
            self.assertTrue(run_status["lock"]["acquired"])
            self.assertFalse(run_status["latest_pointers_published"])
            self.assertEqual(run_status["latest_pointer_skip_reason"], "dry_run")
            self.assertFalse(latest_success_status_path(status_dir).exists())
            self.assertIn("run_started", log_lines[0])
            self.assertIn("run_completed", log_lines[-1])
            self.assertEqual(run_status["metadata"]["webhook_url"], "[redacted]")
            self.assertEqual(historical_run_status_path(status_dir, "20260518T220000Z").relative_to(status_dir).parts[0], "runs")
            self.assertNotIn("latest-success.json", str(historical_run_status_path(status_dir, "20260518T220000Z")))

    def test_status_uploader_writes_historical_status_pointer_and_log(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            uploader = FakeStatusUploader()
            runner = BatchRefreshRunner(
                status_dir=Path(tmp) / "status",
                output_dir=Path(tmp) / "extracts",
                status_uploader=uploader,
                phases=[
                    (
                        "publish",
                        lambda _context: {
                            "manifest_s3_uri": "s3://bucket/manifests/ghl/run=s3-run.json",
                            "curated_tables": {"contacts": 1},
                            "smoke_checks": [passed_smoke_check()],
                        },
                    )
                ],
            )
            result = runner.run(run_id="s3-run", dry_run=False, metadata=production_metadata())
            uploads = {upload["key"]: upload for upload in uploader.uploads}

            self.assertEqual(result["log_path"], f"s3://bucket/{run_status_log_key('s3-run')}")
            self.assertTrue(result["latest_pointers_published"])
            self.assertEqual(result["latest_pointer_publish_target"], "latest-success.json")
            self.assertIsNone(result["latest_pointer_skip_reason"])
            self.assertIn(historical_run_status_key("s3-run"), uploads)
            self.assertIn(latest_success_status_key(), uploads)
            self.assertIn(run_status_log_key("s3-run"), uploads)
            self.assertEqual(uploads[historical_run_status_key("s3-run")]["content"].count("\n"), 1)
            self.assertEqual(uploads[historical_run_status_key("s3-run")]["content_type"], "application/json")
            self.assertEqual(uploads[run_status_log_key("s3-run")]["content_type"], "application/x-ndjson")

    def test_status_uploader_does_not_upload_for_runner_dry_run(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            uploader = FakeStatusUploader()
            runner = BatchRefreshRunner(
                status_dir=Path(tmp) / "status",
                output_dir=Path(tmp) / "extracts",
                status_uploader=uploader,
            )
            result = runner.run(run_id="dry-s3-run", dry_run=True)

            self.assertEqual(result["status"], "succeeded")
            self.assertEqual(uploader.uploads, [])
            self.assertTrue(result["log_path"].endswith("logs/run=dry-s3-run.jsonl"))

    def test_failure_writes_latest_failure_without_advancing_latest_success(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            status_dir = Path(tmp) / "status"
            runner = BatchRefreshRunner(
                status_dir=status_dir,
                output_dir=Path(tmp) / "extracts",
                phases=[
                    (
                        "raw_refresh_and_curated_publish",
                        lambda _context: {
                            "manifest_s3_uri": "s3://bucket/manifests/ghl/run=success.json",
                            "curated_tables": {"contacts": 1},
                            "smoke_checks": [passed_smoke_check()],
                        },
                    )
                ],
            )
            success = runner.run(run_id="success", dry_run=False, metadata=production_metadata())
            self.assertEqual(success["status"], "succeeded")

            failed_runner = BatchRefreshRunner(status_dir=status_dir, output_dir=Path(tmp) / "extracts")
            failed = failed_runner.run(run_id="failed", dry_run=False, metadata=production_metadata())

            latest_success = json.loads(latest_success_status_path(status_dir).read_text(encoding="utf-8"))
            latest_failure = json.loads(latest_failure_status_path(status_dir).read_text(encoding="utf-8"))
            self.assertEqual(failed["status"], "failed")
            self.assertTrue(failed["latest_pointers_published"])
            self.assertEqual(failed["latest_pointer_publish_target"], "latest-failure.json")
            self.assertEqual(latest_success["run_id"], "success")
            self.assertEqual(latest_failure["run_id"], "failed")
            self.assertEqual(latest_failure["error"]["class"], "NotImplementedError")

    def test_execute_phase_results_are_promoted_to_run_status(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            status_dir = Path(tmp) / "status"

            def phase(_context):
                return {
                    "manifest_s3_uri": "s3://bucket/manifests/ghl/run=run1.json",
                    "entity_counts": {"contacts": 2},
                    "recordings": {"attempted": 1, "archived": 1, "skipped_existing": 0, "unavailable": 0},
                }

            runner = BatchRefreshRunner(
                status_dir=status_dir,
                output_dir=Path(tmp) / "extracts",
                phases=[("raw_refresh", phase)],
            )
            result = runner.run(run_id="run1", dry_run=False)
            self.assertEqual(result["status"], "succeeded")
            self.assertEqual(result["manifest_s3_uri"], "s3://bucket/manifests/ghl/run=run1.json")
            self.assertEqual(result["entity_counts"], {"contacts": 2})
            self.assertEqual(result["recordings"]["archived"], 1)
            self.assertFalse(result["latest_pointers_published"])
            self.assertEqual(result["latest_pointer_skip_reason"], "missing_entities_metadata")
            self.assertFalse(latest_success_status_path(status_dir).exists())

    def test_non_dry_raw_only_success_does_not_advance_latest_success(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            status_dir = Path(tmp) / "status"
            baseline = BatchRefreshRunner(
                status_dir=status_dir,
                output_dir=Path(tmp) / "extracts",
                phases=[
                    (
                        "raw_refresh_and_curated_publish",
                        lambda _context: {
                            "manifest_s3_uri": "s3://bucket/manifests/ghl/run=baseline.json",
                            "curated_tables": {"contacts": 1},
                            "smoke_checks": [passed_smoke_check()],
                        },
                    )
                ],
            )
            baseline.run(run_id="baseline", dry_run=False, metadata=production_metadata())

            def raw_only_phase(_context):
                return {
                    "manifest_s3_uri": "s3://bucket/manifests/ghl/run=diag.json",
                    "entity_counts": {"contacts": 1},
                }

            uploader = FakeStatusUploader()
            runner = BatchRefreshRunner(
                status_dir=status_dir,
                output_dir=Path(tmp) / "extracts",
                status_uploader=uploader,
                phases=[("raw_refresh", raw_only_phase)],
            )
            result = runner.run(
                run_id="diag",
                dry_run=False,
                metadata=production_metadata(skip_curated=True, max_items=1, entities=["contacts"]),
            )
            latest_success = json.loads(latest_success_status_path(status_dir).read_text(encoding="utf-8"))
            run_status = json.loads(historical_run_status_path(status_dir, "diag").read_text(encoding="utf-8"))
            uploads = {upload["key"]: upload for upload in uploader.uploads}

            self.assertEqual(result["status"], "succeeded")
            self.assertFalse(result["latest_pointers_published"])
            self.assertEqual(result["latest_pointer_skip_reason"], "skip_curated")
            self.assertFalse(run_status["latest_pointers_published"])
            self.assertEqual(latest_success["run_id"], "baseline")
            self.assertIn(historical_run_status_key("diag"), uploads)
            self.assertIn(run_status_log_key("diag"), uploads)
            self.assertNotIn(latest_success_status_key(), uploads)

    def test_ineligible_invocations_skip_latest_pointers(self) -> None:
        cases = [
            ("extractor_dry_run", {"extractor_dry_run": True}, "extractor_dry_run"),
            ("skip_curated", {"skip_curated": True}, "skip_curated"),
            ("skip_glue", {"skip_glue": True}, "skip_glue"),
            ("max_items", {"max_items": 1}, "max_items"),
            ("max_pages", {"max_pages": 1}, "max_pages"),
            ("entity_subset", {"entities": ["contacts"]}, "entity_subset"),
            ("pipeline_filter", {"pipeline_ids": ["pipe1"]}, "pipeline_filter"),
            ("conversation_filter", {"conversation_ids": ["conv1"]}, "conversation_filter"),
            ("message_filter", {"message_ids": ["msg1"]}, "message_filter"),
        ]

        for label, metadata_overrides, expected_reason in cases:
            with self.subTest(label=label), tempfile.TemporaryDirectory() as tmp:
                status_dir = Path(tmp) / "status"

                def curated_phase(_context):
                    return {
                        "manifest_s3_uri": f"s3://bucket/manifests/ghl/run={label}.json",
                        "curated_tables": {"contacts": 1},
                    }

                runner = BatchRefreshRunner(
                    status_dir=status_dir,
                    output_dir=Path(tmp) / "extracts",
                    phases=[("raw_refresh_and_curated_publish", curated_phase)],
                )
                result = runner.run(
                    run_id=label,
                    dry_run=False,
                    metadata=production_metadata(**metadata_overrides),
                )

                self.assertEqual(result["status"], "succeeded")
                self.assertFalse(result["latest_pointers_published"])
                self.assertEqual(result["latest_pointer_skip_reason"], expected_reason)
                self.assertFalse(latest_success_status_path(status_dir).exists())

        with self.subTest(label="non_production_environment"), tempfile.TemporaryDirectory() as tmp:
            status_dir = Path(tmp) / "status"
            runner = BatchRefreshRunner(
                status_dir=status_dir,
                output_dir=Path(tmp) / "extracts",
                phases=[
                    (
                        "raw_refresh_and_curated_publish",
                        lambda _context: {
                            "manifest_s3_uri": "s3://bucket/manifests/ghl/run=staging.json",
                            "curated_tables": {"contacts": 1},
                        },
                    )
                ],
            )
            result = runner.run(
                run_id="staging",
                source_environment="staging",
                dry_run=False,
                metadata=production_metadata(),
            )

            self.assertFalse(result["latest_pointers_published"])
            self.assertEqual(result["latest_pointer_skip_reason"], "non_production_environment")
            self.assertFalse(latest_success_status_path(status_dir).exists())

    def test_non_dry_curated_success_advances_latest_success(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            status_dir = Path(tmp) / "status"

            def curated_phase(_context):
                return {
                    "manifest_s3_uri": "s3://bucket/manifests/ghl/run=prod.json",
                    "entity_counts": {"contacts": 2},
                    "curated_tables": {"contacts": 2},
                    "smoke_checks": [passed_smoke_check()],
                }

            runner = BatchRefreshRunner(
                status_dir=status_dir,
                output_dir=Path(tmp) / "extracts",
                phases=[("raw_refresh_and_curated_publish", curated_phase)],
            )
            result = runner.run(run_id="prod", dry_run=False, metadata=production_metadata())
            latest_success = json.loads(latest_success_status_path(status_dir).read_text(encoding="utf-8"))

            self.assertEqual(result["status"], "succeeded")
            self.assertTrue(result["latest_pointers_published"])
            self.assertEqual(result["latest_pointer_publish_target"], "latest-success.json")
            self.assertIsNone(result["latest_pointer_skip_reason"])
            self.assertEqual(latest_success["run_id"], "prod")

    def test_eligible_production_success_without_smoke_checks_fails_final_validation(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            status_dir = Path(tmp) / "status"

            def curated_phase(_context):
                return {
                    "manifest_s3_uri": "s3://bucket/manifests/ghl/run=prod.json",
                    "curated_tables": {"contacts": 2},
                }

            runner = BatchRefreshRunner(
                status_dir=status_dir,
                output_dir=Path(tmp) / "extracts",
                phases=[("raw_refresh_and_curated_publish", curated_phase)],
            )
            result = runner.run(run_id="prod", dry_run=False, metadata=production_metadata())
            latest_failure = json.loads(latest_failure_status_path(status_dir).read_text(encoding="utf-8"))

            self.assertEqual(result["status"], "failed")
            self.assertTrue(result["latest_pointers_published"])
            self.assertEqual(result["latest_pointer_publish_target"], "latest-failure.json")
            self.assertEqual(result["error"]["message"], "eligible production refresh completed without smoke_checks")
            self.assertEqual(latest_failure["run_id"], "prod")
            self.assertFalse(latest_success_status_path(status_dir).exists())

    def test_eligible_production_success_with_failed_or_not_run_smoke_fails_final_validation(self) -> None:
        for smoke_status in ("failed", "not_run"):
            with self.subTest(smoke_status=smoke_status), tempfile.TemporaryDirectory() as tmp:
                status_dir = Path(tmp) / "status"

                def curated_phase(_context):
                    return {
                        "manifest_s3_uri": f"s3://bucket/manifests/ghl/run={smoke_status}.json",
                        "curated_tables": {"contacts": 2},
                        "smoke_checks": [passed_smoke_check(status=smoke_status)],
                    }

                runner = BatchRefreshRunner(
                    status_dir=status_dir,
                    output_dir=Path(tmp) / "extracts",
                    phases=[("raw_refresh_and_curated_publish", curated_phase)],
                )
                result = runner.run(run_id=smoke_status, dry_run=False, metadata=production_metadata())

                self.assertEqual(result["status"], "failed")
                self.assertEqual(
                    result["error"]["message"],
                    "eligible production refresh smoke checks did not pass: athena_curated_snapshot",
                )

    def test_run_status_promotes_image_tag_and_cloudwatch_log_url(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            runner = BatchRefreshRunner(status_dir=Path(tmp) / "status", output_dir=Path(tmp) / "extracts")
            result = runner.run(
                run_id="observed",
                dry_run=True,
                image_tag="abc1234",
                cloudwatch_log_url="https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups/log-group/gc",
                metadata={"cloudwatch_log_url": "metadata-fallback", "image_tag": "fallback"},
            )

            run_status = json.loads(historical_run_status_path(Path(tmp) / "status", "observed").read_text())
            self.assertEqual(result["image_tag"], "abc1234")
            self.assertEqual(run_status["image_tag"], "abc1234")
            self.assertEqual(
                run_status["cloudwatch_log_url"],
                "https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups/log-group/gc",
            )

    def test_run_status_promotes_metadata_observability_fields(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            runner = BatchRefreshRunner(status_dir=Path(tmp) / "status", output_dir=Path(tmp) / "extracts")
            result = runner.run(
                run_id="metadata-observed",
                dry_run=True,
                metadata={
                    "image_tag": "sha-from-metadata",
                    "cloudwatch_log_stream_link": "https://console.aws.amazon.com/cloudwatch/home#logsV2:log-events/stream",
                },
            )

            self.assertEqual(result["image_tag"], "sha-from-metadata")
            self.assertEqual(
                result["cloudwatch_log_url"],
                "https://console.aws.amazon.com/cloudwatch/home#logsV2:log-events/stream",
            )

    def test_build_status_uploader_skips_runner_dry_run_only(self) -> None:
        with mock.patch("gold_coast_data_lake.jobs.ghl_batch_refresh.S3Uploader") as uploader_cls:
            args = parse_args(["--status-s3-bucket", "status-bucket"])
            self.assertIsNone(build_status_uploader(args))

            extractor_dry_run_args = parse_args(
                ["--execute", "--extractor-dry-run", "--status-s3-bucket", "status-bucket"]
            )
            self.assertEqual(build_status_uploader(extractor_dry_run_args), uploader_cls.return_value)

            uploader_cls.assert_called_once_with("status-bucket", "")

    def test_build_lock_uses_dynamodb_only_for_execute_non_dry_run(self) -> None:
        with mock.patch("gold_coast_data_lake.jobs.ghl_batch_refresh.DynamoDbTtlLock") as lock_cls:
            args = parse_args(["--execute", "--lock-table-name", "locks"])
            self.assertEqual(build_lock(args), lock_cls.return_value)
            lock_cls.assert_called_once_with(table_name="locks", lock_name="ghl-refresh")

            lock_cls.reset_mock()
            dry_run_args = parse_args(["--execute", "--extractor-dry-run", "--lock-table-name", "locks"])
            self.assertIsNone(build_lock(dry_run_args))
            lock_cls.assert_not_called()

    def test_join_s3_prefix_skips_empty_parts(self) -> None:
        self.assertEqual(join_s3_prefix("", "curated/ghl"), "curated/ghl")
        self.assertEqual(join_s3_prefix("prod", "/curated/ghl/"), "prod/curated/ghl")

    def test_production_phase_builds_curated_tables_from_raw_manifest(self) -> None:
        args = parse_args(["--execute", "--s3-bucket", "lake", "--s3-prefix", "prod", "--glue-database", "gold"])
        raw_config = mock.Mock()
        context = mock.Mock()
        context.started_at = datetime(2026, 5, 18, 22, 0, tzinfo=timezone.utc)

        with (
            mock.patch(
                "gold_coast_data_lake.jobs.ghl_batch_refresh.run_ghl_raw_refresh",
                return_value={"manifest_s3_uri": "s3://lake/manifests/ghl/run=run1.json", "entity_counts": {"contacts": 1}},
            ) as raw_refresh,
            mock.patch(
                "gold_coast_data_lake.jobs.ghl_batch_refresh.run_curated_build",
                return_value={"table_counts": {"contacts": 1}, "latest_success": {"run_id": "run1"}},
            ) as curated_build,
            mock.patch(
                "gold_coast_data_lake.jobs.ghl_batch_refresh.run_athena_smoke_checks",
                return_value=[passed_smoke_check()],
            ) as smoke_checks,
        ):
            result = build_production_refresh_phase(raw_config, args)(context)

        raw_refresh.assert_called_once_with(context, raw_config)
        curated_build.assert_called_once_with(
            manifest_uri="s3://lake/manifests/ghl/run=run1.json",
            snapshot_date="2026-05-18",
            local_output_dir=args.curated_output_dir,
            s3_bucket="lake",
            s3_prefix="prod/curated/ghl",
            glue_database="gold",
        )
        self.assertEqual(result["curated_tables"], {"contacts": 1})
        smoke_checks.assert_called_once_with(
            run_id="run1",
            snapshot_date="2026-05-18",
            database="gold",
            workgroup="gold_coast_data_lake",
            output_location="s3://lake/prod/athena-results/ghl/smoke/",
            table_counts={"contacts": 1},
        )
        self.assertEqual(result["smoke_checks"], [passed_smoke_check()])
        self.assertEqual(resolve_athena_output_location(args), "s3://lake/prod/athena-results/ghl/smoke/")

    def test_alert_callback_updates_run_status_without_exposing_payload(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            callback_payloads = []

            def callback(payload):
                callback_payloads.append(payload)
                return "posted"

            runner = BatchRefreshRunner(
                status_dir=Path(tmp) / "status",
                output_dir=Path(tmp) / "extracts",
                alert_callback=callback,
            )
            result = runner.run(
                run_id="alerted",
                dry_run=True,
                metadata={"webhook_url": FAKE_SLACK_WEBHOOK, "safe": "ok"},
            )
            self.assertEqual(result["alert_status"], "posted")
            self.assertEqual(callback_payloads[0]["metadata"]["webhook_url"], "[redacted]")
            self.assertEqual(callback_payloads[0]["metadata"]["safe"], "ok")

    def test_alert_callback_failure_records_sanitized_error(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            status_dir = Path(tmp) / "status"

            def callback(_payload):
                auth_header = "Authorization: " + "Bearer secret"
                raise RuntimeError(f"{auth_header} from {FAKE_SLACK_WEBHOOK}")

            runner = BatchRefreshRunner(
                status_dir=status_dir,
                output_dir=Path(tmp) / "extracts",
                alert_callback=callback,
            )
            result = runner.run(run_id="alert-failed", dry_run=True)
            run_status = json.loads(historical_run_status_path(status_dir, "alert-failed").read_text(encoding="utf-8"))

            self.assertEqual(result["alert_status"], "failed")
            self.assertEqual(run_status["alert_status"], "failed")
            self.assertEqual(run_status["alert_error"]["class"], "RuntimeError")
            self.assertEqual(run_status["alert_error"]["message"], "[redacted]")


if __name__ == "__main__":
    unittest.main()
