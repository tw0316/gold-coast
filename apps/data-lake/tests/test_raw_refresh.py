from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

from gold_coast_data_lake.batch import BatchRunContext
from gold_coast_data_lake.raw_refresh import RawRefreshConfig, run_ghl_raw_refresh


class FullRefreshClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict | None]] = []

    def get_json(self, path: str, params: dict | None = None):
        self.calls.append((path, dict(params or {})))
        if path == "/contacts/":
            return {"contacts": [{"id": "contact1"}]}
        if path == "/opportunities/pipelines":
            return {"pipelines": [{"id": "pipeline1"}]}
        if path == "/opportunities/search":
            return {"opportunities": [{"id": "opp1", "pipelineId": "pipeline1"}]}
        if path == "/conversations/search":
            return {"conversations": [{"id": "conv1", "lastMessageDate": 1}], "total": 1}
        if path == "/conversations/conv1/messages":
            return {"messages": [{"id": "msg1", "messageType": "TYPE_CALL"}]}
        if path == "/conversations/messages/msg1":
            return {"message": {"id": "msg1", "messageType": "TYPE_CALL", "meta": {"call": {"duration": 42}}}}
        raise AssertionError(f"unexpected path: {path}")


class RawRefreshTests(unittest.TestCase):
    def test_full_core_refresh_uses_existing_get_only_extractor(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            context = BatchRunContext(
                run_id="20260518T230000Z",
                source="ghl",
                source_environment="production",
                dry_run=False,
                status_dir=root / "status",
                output_dir=root / "extracts",
                started_at=datetime(2026, 5, 18, 23, 0, tzinfo=timezone.utc),
            )
            client = FullRefreshClient()
            result = run_ghl_raw_refresh(
                context,
                RawRefreshConfig(local_only=True),
                client=client,
                location_id="loc",
            )

            self.assertEqual(result["entity_counts"]["contacts"], 1)
            self.assertEqual(result["entity_counts"]["pipelines"], 1)
            self.assertEqual(result["entity_counts"]["opportunities"], 1)
            self.assertEqual(result["entity_counts"]["conversations"], 1)
            self.assertEqual(result["entity_counts"]["messages"], 1)
            self.assertEqual(result["entity_counts"]["call_message_details"], 1)
            self.assertEqual(result["recordings"]["attempted"], 0)
            self.assertEqual(result["manifest_key"], "manifests/ghl/run=20260518T230000Z.json")
            manifest_path = Path(result["manifest_path"])
            self.assertTrue(manifest_path.exists())
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            self.assertEqual(manifest["run_id"], "20260518T230000Z")
            self.assertTrue(all(call[0].startswith("/") for call in client.calls))

    def test_env_file_is_required_without_injected_client(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            context = BatchRunContext(
                run_id="run1",
                source="ghl",
                source_environment="production",
                dry_run=False,
                status_dir=root / "status",
                output_dir=root / "extracts",
                started_at=datetime(2026, 5, 18, 23, 0, tzinfo=timezone.utc),
            )
            with mock.patch.dict("os.environ", {}, clear=True):
                with self.assertRaises(ValueError):
                    run_ghl_raw_refresh(context, RawRefreshConfig(env_file=None))

    def test_s3_bucket_is_required_for_non_local_raw_refresh(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            context = BatchRunContext(
                run_id="run1",
                source="ghl",
                source_environment="production",
                dry_run=False,
                status_dir=root / "status",
                output_dir=root / "extracts",
                started_at=datetime(2026, 5, 18, 23, 0, tzinfo=timezone.utc),
            )
            with self.assertRaises(ValueError):
                run_ghl_raw_refresh(context, RawRefreshConfig(local_only=False), client=FullRefreshClient(), location_id="loc")


if __name__ == "__main__":
    unittest.main()
