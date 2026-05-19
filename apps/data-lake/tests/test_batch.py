from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
import unittest

from gold_coast_data_lake.batch import BatchRefreshRunner, LocalTtlLock, sanitize


FAKE_SLACK_WEBHOOK = "https://hooks." + "slack.com/services/nope"


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

    def test_dry_run_writes_immutable_status_and_latest_success(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            status_dir = Path(tmp) / "status"
            runner = BatchRefreshRunner(status_dir=status_dir, output_dir=Path(tmp) / "extracts")
            result = runner.run(run_id="20260518T220000Z", dry_run=True, metadata={"webhook_url": FAKE_SLACK_WEBHOOK})

            self.assertEqual(result["status"], "succeeded")
            self.assertEqual(result["phases"][0]["name"], "dry_run_validation")
            self.assertEqual(result["lock"]["ttl_seconds"], 2700)
            run_status = json.loads((status_dir / "run=20260518T220000Z.json").read_text(encoding="utf-8"))
            latest = json.loads((status_dir / "latest-success.json").read_text(encoding="utf-8"))
            log_lines = (status_dir / "logs" / "run=20260518T220000Z.jsonl").read_text(encoding="utf-8").splitlines()

            self.assertEqual(run_status["run_id"], "20260518T220000Z")
            self.assertTrue(run_status["lock"]["acquired"])
            self.assertEqual(latest["run_id"], "20260518T220000Z")
            self.assertIn("run_started", log_lines[0])
            self.assertIn("run_completed", log_lines[-1])
            self.assertEqual(run_status["metadata"]["webhook_url"], "[redacted]")

    def test_failure_writes_latest_failure_without_advancing_latest_success(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            status_dir = Path(tmp) / "status"
            runner = BatchRefreshRunner(status_dir=status_dir, output_dir=Path(tmp) / "extracts")
            success = runner.run(run_id="success", dry_run=True)
            self.assertEqual(success["status"], "succeeded")

            failed_runner = BatchRefreshRunner(status_dir=status_dir, output_dir=Path(tmp) / "extracts")
            failed = failed_runner.run(run_id="failed", dry_run=False)

            latest_success = json.loads((status_dir / "latest-success.json").read_text(encoding="utf-8"))
            latest_failure = json.loads((status_dir / "latest-failure.json").read_text(encoding="utf-8"))
            self.assertEqual(failed["status"], "failed")
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
                raise RuntimeError(f"Authorization: Bearer secret from {FAKE_SLACK_WEBHOOK}")

            runner = BatchRefreshRunner(
                status_dir=status_dir,
                output_dir=Path(tmp) / "extracts",
                alert_callback=callback,
            )
            result = runner.run(run_id="alert-failed", dry_run=True)
            run_status = json.loads((status_dir / "run=alert-failed.json").read_text(encoding="utf-8"))

            self.assertEqual(result["alert_status"], "failed")
            self.assertEqual(run_status["alert_status"], "failed")
            self.assertEqual(run_status["alert_error"]["class"], "RuntimeError")
            self.assertEqual(run_status["alert_error"]["message"], "[redacted]")


if __name__ == "__main__":
    unittest.main()
