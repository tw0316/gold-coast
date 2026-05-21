from __future__ import annotations

from datetime import datetime, timezone
import json
import unittest

from gold_coast_data_lake.alerts import AlertConfig, alert_callback, alert_decision, slack_payload


FAKE_SLACK_WEBHOOK = "https://hooks." + "slack.com/services/nope"


class AlertTests(unittest.TestCase):
    def test_policy_posts_failures_but_skips_success_in_failure_only_mode(self) -> None:
        config = AlertConfig(mode="failure-only")
        self.assertTrue(alert_decision(config, "failed"))
        self.assertFalse(alert_decision(config, "succeeded"))

    def test_launch_window_success_policy_expires(self) -> None:
        config = AlertConfig(mode="launch-window", success_alert_until="2026-05-19T00:00:00Z")
        self.assertTrue(alert_decision(config, "succeeded", now=datetime(2026, 5, 18, 23, 0, tzinfo=timezone.utc)))
        self.assertFalse(alert_decision(config, "succeeded", now=datetime(2026, 5, 19, 1, 0, tzinfo=timezone.utc)))

    def test_launch_window_success_requires_until(self) -> None:
        self.assertTrue(alert_decision(AlertConfig(mode="launch-window"), "failed"))
        with self.assertRaises(ValueError):
            alert_decision(AlertConfig(mode="launch-window"), "succeeded")

    def test_payload_uses_counts_and_redacts_sensitive_error_text(self) -> None:
        payload = slack_payload(
            {
                "run_id": "run1",
                "status": "failed",
                "duration_seconds": 12.3,
                "snapshot_at": "2026-05-18T23:00:00Z",
                "entity_counts": {"contacts": 2, "api_key": 1},
                "recordings": {"attempted": 1, "archived": 0},
                "metadata": {"phone": "5551234567", "body": "secret"},
                "error": {"class": "RuntimeError", "message": "Authorization: Bearer abc"},
            },
            AlertConfig(mode="failure-only", cloudwatch_log_url=FAKE_SLACK_WEBHOOK),
        )
        encoded = json.dumps(payload)
        self.assertIn("contacts=2", encoded)
        self.assertIn("[redacted]", encoded)
        self.assertNotIn("5551234567", encoded)
        self.assertNotIn("Bearer abc", encoded)
        self.assertNotIn("hooks.slack.com", encoded)
        self.assertNotIn("api_key", encoded)

        raw_payload = slack_payload(
            {
                "run_id": "run2",
                "status": "failed",
                "error": {"class": "RuntimeError", "message": '{"records":[{"email":"seller@example.com"}]}'},
            },
            AlertConfig(mode="failure-only"),
        )
        raw_encoded = json.dumps(raw_payload)
        self.assertIn("[redacted]", raw_encoded)
        self.assertNotIn("seller@example.com", raw_encoded)

    def test_transcription_payload_is_source_specific_and_count_oriented(self) -> None:
        payload = slack_payload(
            {
                "source": "ghl-call-transcription",
                "run_id": "transcription-run-1",
                "status": "succeeded",
                "duration_seconds": 3.4,
                "image_tag": "image-123",
                "selection": {
                    "selected_calls": 4,
                    "skipped_existing": 2,
                    "skipped_no_recording": 1,
                },
                "transcriptions": {
                    "attempted": 1,
                    "succeeded": 1,
                    "failed": 0,
                    "pending_retry": 0,
                },
                "artifacts": {"curated_rows_submitted": 263},
                "published": {"written": {"row_count": 263}},
            },
            AlertConfig(mode="success-and-failure", cloudwatch_log_url="https://console.aws.amazon.com/cloudwatch/home"),
        )
        encoded = json.dumps(payload)

        self.assertIn("Gold Coast call transcription", encoded)
        self.assertIn("selected_calls=4", encoded)
        self.assertIn("skipped_existing=2", encoded)
        self.assertIn("skipped_no_recording=1", encoded)
        self.assertIn("attempted=1", encoded)
        self.assertIn("pending_retry=0", encoded)
        self.assertIn("263", encoded)
        self.assertIn("CloudWatch", encoded)
        self.assertNotIn("Gold Coast data lake GHL refresh", encoded)
        self.assertNotIn("entity_counts", encoded)

    def test_transcription_payload_redacts_pii_recording_urls_secrets_and_provider_payloads(self) -> None:
        recording_url = "https://example.com/audio/message_id=secret.wav"
        s3_uri = "".join(("s3", "://", "private-bucket", "/", "recordings/ghl/message_id=secret.wav"))
        email = "".join(("seller", "@", "example", ".", "com"))
        phone = "-".join(("555", "123", "4567"))
        api_key = "".join(("sk", "-", "123456789012"))
        payload = slack_payload(
            {
                "source": "ghl-call-transcription",
                "run_id": "transcription-run-2",
                "status": "failed",
                "duration_seconds": 1,
                "selection": {"selected_calls": 1, "skipped_existing": 0, "skipped_no_recording": 0},
                "transcriptions": {"attempted": 1, "succeeded": 0, "failed": 1, "pending_retry": 0},
                "provider_response": {"text": "raw words"},
                "error": {
                    "class": "RuntimeError",
                    "message": f"failed for {recording_url} {s3_uri} {email} {phone} {api_key}",
                },
            },
            AlertConfig(mode="failure-only"),
        )
        encoded = json.dumps(payload)

        self.assertIn("[redacted]", encoded)
        self.assertNotIn(recording_url, encoded)
        self.assertNotIn(s3_uri, encoded)
        self.assertNotIn(email, encoded)
        self.assertNotIn(phone, encoded)
        self.assertNotIn(api_key, encoded)
        self.assertNotIn("raw words", encoded)

    def test_missing_webhook_skips_without_sending(self) -> None:
        calls = []
        callback = alert_callback(
            AlertConfig(mode="failure-only"),
            sender=lambda webhook_url, payload, timeout: calls.append((webhook_url, payload, timeout)),
        )
        status = callback({"status": "failed", "run_id": "run1"})
        self.assertEqual(status, "skipped_missing_webhook")
        self.assertEqual(calls, [])

    def test_webhook_sender_receives_sanitized_payload(self) -> None:
        calls = []
        callback = alert_callback(
            AlertConfig(webhook_url="https://example.invalid/webhook", mode="failure-only"),
            sender=lambda webhook_url, payload, timeout: calls.append((webhook_url, payload, timeout)),
        )
        status = callback({"status": "failed", "run_id": "run1", "error": {"message": "safe failure"}})
        self.assertEqual(status, "posted")
        self.assertEqual(calls[0][0], "https://example.invalid/webhook")
        self.assertNotIn("https://example.invalid/webhook", json.dumps(calls[0][1]))


if __name__ == "__main__":
    unittest.main()
