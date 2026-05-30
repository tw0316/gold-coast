from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from gold_coast_data_lake.client import GHLAPIError, GHLClient
from gold_coast_data_lake.config import GHLConfig
from gold_coast_data_lake.extractor import (
    ExtractOptions,
    GHLRawExtractor,
    extract_items,
    normalize_entities,
)
from gold_coast_data_lake.storage import LocalRunStorage, raw_object_key, recording_object_key


class FakeClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict | None]] = []

    def get_json(self, path: str, params: dict | None = None):
        self.calls.append((path, dict(params or {})))
        if path == "/contacts/":
            if params and "skip" not in params:
                return {"contacts": [{"id": "c1"}, {"id": "c2"}], "total": 3}
            if params and params.get("skip") == 2:
                return {"contacts": [{"id": "c3"}], "total": 3}
            return {"contacts": []}
        if path == "/opportunities/pipelines":
            return {"pipelines": [{"id": "pipe1"}]}
        if path == "/opportunities/search":
            return {"opportunities": [{"id": "opp1"}]}
        raise AssertionError(f"unexpected path: {path}")


class MissingRecordingClient:
    def download_to_file(self, path: str, destination: Path, params: dict | None = None, *, max_bytes: int):
        raise GHLAPIError('GET /recording failed with HTTP 422: {"message":"Message does not have recording"}')


class FakeUploader:
    def find_key_by_prefix(self, relative_prefix: str) -> str | None:
        return None

    def uri(self, relative_key: str) -> str:
        return f"s3://bucket/{relative_key}"

    def upload_file(self, path: Path, relative_key: str, *, content_type: str | None = None) -> str:
        return f"s3://bucket/{relative_key}"


class ExistingRecordingUploader(FakeUploader):
    def __init__(self) -> None:
        self.uploads = 0

    def find_key_by_prefix(self, relative_prefix: str) -> str | None:
        return f"{relative_prefix}wav"

    def upload_file(self, path: Path, relative_key: str, *, content_type: str | None = None) -> str:
        self.uploads += 1
        return super().upload_file(path, relative_key, content_type=content_type)


class ConversationPagingClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict | None]] = []

    def get_json(self, path: str, params: dict | None = None):
        self.calls.append((path, dict(params or {})))
        if path == "/conversations/search":
            if params and "startAfterDate" not in params:
                return {
                    "conversations": [
                        {"id": "conv1", "lastMessageDate": 30},
                        {"id": "conv2", "lastMessageDate": 20},
                    ],
                    "total": 3,
                }
            return {
                "conversations": [
                    {"id": "conv3", "lastMessageDate": 10},
                ],
                "total": 3,
            }
        raise AssertionError(f"unexpected path: {path}")


class FlakyCallDetailClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict | None]] = []

    def get_json(self, path: str, params: dict | None = None):
        self.calls.append((path, dict(params or {})))
        if path == "/conversations/messages/bad-message-id":
            exc = GHLAPIError("GET /conversations/messages/bad-message-id failed with HTTP 429: rate limited")
            setattr(exc, "method", "GET")
            setattr(exc, "path", path)
            setattr(exc, "status_code", 429)
            setattr(exc, "retry_attempts", 4)
            setattr(exc, "retry_after", "60")
            raise exc
        if path.startswith("/conversations/messages/"):
            message_id = path.rsplit("/", 1)[-1]
            return {"message": {"id": message_id, "messageType": "TYPE_CALL"}}
        raise AssertionError(f"unexpected path: {path}")


class AlwaysFailCallDetailClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict | None]] = []

    def get_json(self, path: str, params: dict | None = None):
        self.calls.append((path, dict(params or {})))
        exc = GHLAPIError(f"GET {path} failed with HTTP 503: upstream unavailable")
        setattr(exc, "method", "GET")
        setattr(exc, "path", path)
        setattr(exc, "status_code", 503)
        setattr(exc, "retry_attempts", 4)
        setattr(exc, "retry_after", None)
        raise exc


class FailingRecordingClient:
    def get_json(self, path: str, params: dict | None = None):
        if path.startswith("/conversations/messages/"):
            message_id = path.rsplit("/", 1)[-1]
            return {"message": {"id": message_id, "messageType": "TYPE_CALL"}}
        raise AssertionError(f"unexpected path: {path}")

    def download_to_file(self, path: str, destination: Path, params: dict | None = None, *, max_bytes: int):
        exc = GHLAPIError(f"GET {path} failed with HTTP 503: upstream unavailable")
        setattr(exc, "method", "GET")
        setattr(exc, "path", path)
        setattr(exc, "status_code", 503)
        setattr(exc, "retry_attempts", 4)
        setattr(exc, "retry_after", None)
        raise exc


class ExtractorTests(unittest.TestCase):
    def test_client_refuses_non_get_methods(self) -> None:
        client = GHLClient(GHLConfig(api_key="secret", location_id="loc"))
        with self.assertRaises(ValueError):
            client.request_json("POST", "/contacts/", {"locationId": "loc"})

    def test_raw_object_key_is_partitioned_for_s3_raw_storage(self) -> None:
        key = raw_object_key("contacts", "20260518T010203Z", "2026-05-18")
        self.assertEqual(key, "raw/ghl/entity=contacts/ingest_date=2026-05-18/run=20260518T010203Z.jsonl")

    def test_recording_object_key_is_stable_by_message_id(self) -> None:
        key = recording_object_key("call 1", "2026-05-18", ".wav")
        self.assertEqual(key, "recordings/ghl/message_id=call1.wav")

    def test_entity_aliases(self) -> None:
        self.assertEqual(normalize_entities(["call-details"]), ["call_message_details"])
        self.assertEqual(normalize_entities(["pipeline-stages"]), ["pipelines"])

    def test_extract_items_supports_nested_ghl_shapes(self) -> None:
        payload = {"messages": {"messages": [{"id": "m1"}]}}
        self.assertEqual(extract_items(payload, ("messages",)), [{"id": "m1"}])

    def test_contacts_extraction_writes_jsonl_and_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = LocalRunStorage(tmp, run_id="20260518T010203Z")
            fake_client = FakeClient()
            extractor = GHLRawExtractor(
                fake_client,  # type: ignore[arg-type]
                storage,
                location_id="loc",
                options=ExtractOptions(page_limit=2, max_pages=2),
            )
            manifest = extractor.run(["contacts"])
            self.assertEqual(manifest["summary"]["entity_counts"]["contacts"], 3)
            raw_path = Path(tmp) / raw_object_key("contacts", storage.run_id, storage.ingest_date)
            self.assertTrue(raw_path.exists())
            lines = raw_path.read_text(encoding="utf-8").splitlines()
            self.assertEqual(len(lines), 3)
            first = json.loads(lines[0])
            self.assertEqual(first["_ingest"]["entity"], "contacts")
            self.assertEqual(first["record"]["id"], "c1")
            self.assertNotIn("skip", fake_client.calls[0][1])
            self.assertEqual(fake_client.calls[1][1]["skip"], 2)

    def test_opportunities_search_uses_endpoint_specific_snake_case_params(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = LocalRunStorage(tmp, run_id="20260518T010203Z")
            fake_client = FakeClient()
            extractor = GHLRawExtractor(
                fake_client,  # type: ignore[arg-type]
                storage,
                location_id="loc",
                options=ExtractOptions(page_limit=2, max_pages=1),
            )
            extractor.run(["opportunities"])
            self.assertEqual(fake_client.calls[1][0], "/opportunities/search")
            self.assertEqual(fake_client.calls[1][1]["location_id"], "loc")
            self.assertEqual(fake_client.calls[1][1]["pipeline_id"], "pipe1")
            self.assertNotIn("locationId", fake_client.calls[1][1])
            self.assertNotIn("pipelineId", fake_client.calls[1][1])

    def test_missing_recording_is_recorded_without_aborting_archive(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = LocalRunStorage(tmp, run_id="20260518T010203Z")
            extractor = GHLRawExtractor(
                MissingRecordingClient(),  # type: ignore[arg-type]
                storage,
                location_id="loc",
                s3_uploader=FakeUploader(),  # type: ignore[arg-type]
                options=ExtractOptions(download_recordings=True, max_recordings=1),
            )
            extractor.archive_recording("msg1")
            self.assertEqual(extractor.recording_attempts, 1)
            self.assertEqual(storage.recordings[0]["message_id"], "msg1")
            self.assertEqual(storage.recordings[0]["archival_status"], "unavailable")
            self.assertEqual(storage.recordings[0]["reason"], "message_does_not_have_recording")

    def test_existing_recording_key_is_not_redownloaded(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = LocalRunStorage(tmp, run_id="20260518T010203Z")
            uploader = ExistingRecordingUploader()
            extractor = GHLRawExtractor(
                MissingRecordingClient(),  # type: ignore[arg-type]
                storage,
                location_id="loc",
                s3_uploader=uploader,  # type: ignore[arg-type]
                options=ExtractOptions(download_recordings=True, max_recordings=1),
            )
            extractor.archive_recording("msg1")
            self.assertEqual(uploader.uploads, 0)
            self.assertEqual(storage.recordings[0]["archival_status"], "skipped_existing")
            self.assertEqual(storage.recordings[0]["object_key"], "recordings/ghl/message_id=msg1.wav")

    def test_conversation_search_uses_start_after_date_pagination(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = LocalRunStorage(tmp, run_id="20260518T010203Z")
            fake_client = ConversationPagingClient()
            extractor = GHLRawExtractor(
                fake_client,  # type: ignore[arg-type]
                storage,
                location_id="loc",
                options=ExtractOptions(page_limit=2),
            )
            manifest = extractor.run(["conversations"])
            self.assertEqual(manifest["summary"]["entity_counts"]["conversations"], 3)
            self.assertEqual(fake_client.calls[0][1]["sortBy"], "last_message_date")
            self.assertNotIn("skip", fake_client.calls[1][1])
            self.assertEqual(fake_client.calls[1][1]["startAfterDate"], 20)
            self.assertEqual(fake_client.calls[1][1]["startAfterId"], "conv2")

    def test_call_message_detail_api_errors_are_recorded_without_aborting_run(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = LocalRunStorage(tmp, run_id="20260518T010203Z")
            fake_client = FlakyCallDetailClient()
            extractor = GHLRawExtractor(
                fake_client,  # type: ignore[arg-type]
                storage,
                location_id="loc",
                options=ExtractOptions(message_ids=["good-message-id", "bad-message-id", "next-message-id"]),
            )

            manifest = extractor.run(["call-details"])

            summary = manifest["summary"]
            self.assertEqual(summary["entity_counts"]["call_message_details"], 2)
            self.assertEqual(summary["entity_error_counts"], {"call_message_details": 1})
            errors = summary["entity_errors"]["call_message_details"]
            self.assertEqual(len(errors), 1)
            self.assertEqual(errors[0]["endpoint"], "/conversations/messages/{messageId}")
            self.assertEqual(errors[0]["status_code"], 429)
            self.assertEqual(errors[0]["retry_attempts"], 4)
            self.assertEqual(errors[0]["retry_after"], "60")
            self.assertNotIn("bad-message-id", json.dumps(errors))
            raw_path = Path(tmp) / raw_object_key("call_message_details", storage.run_id, storage.ingest_date)
            self.assertEqual(len(raw_path.read_text(encoding="utf-8").splitlines()), 2)
            self.assertEqual(
                [call[0] for call in fake_client.calls],
                [
                    "/conversations/messages/good-message-id",
                    "/conversations/messages/bad-message-id",
                    "/conversations/messages/next-message-id",
                ],
            )

    def test_call_detail_circuit_breaker_records_explicit_terminal_event(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = LocalRunStorage(tmp, run_id="20260518T010203Z")
            fake_client = AlwaysFailCallDetailClient()
            extractor = GHLRawExtractor(
                fake_client,  # type: ignore[arg-type]
                storage,
                location_id="loc",
                options=ExtractOptions(
                    message_ids=["bad-1", "bad-2", "bad-3"],
                    max_consecutive_call_detail_errors=2,
                ),
            )

            manifest = extractor.run(["call-details"])

            summary = manifest["summary"]
            self.assertEqual(summary["entity_counts"]["call_message_details"], 0)
            self.assertEqual(summary["entity_error_counts"], {"call_message_details": 3})
            errors = summary["entity_errors"]["call_message_details"]
            self.assertEqual(errors[-1]["class"], "ConsecutiveGHLAPIErrorLimitReached")
            self.assertEqual(errors[-1]["consecutive_errors"], 2)
            self.assertEqual(errors[-1]["unattempted_count"], 1)
            self.assertNotIn("bad-", json.dumps(errors))
            self.assertEqual([call[0] for call in fake_client.calls], ["/conversations/messages/bad-1", "/conversations/messages/bad-2"])

    def test_recording_api_errors_are_recorded_without_aborting_call_detail_run(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            storage = LocalRunStorage(tmp, run_id="20260518T010203Z")
            extractor = GHLRawExtractor(
                FailingRecordingClient(),  # type: ignore[arg-type]
                storage,
                location_id="actual-location-id",
                s3_uploader=FakeUploader(),  # type: ignore[arg-type]
                options=ExtractOptions(
                    message_ids=["msg1", "msg2"],
                    download_recordings=True,
                    max_recordings=2,
                ),
            )

            manifest = extractor.run(["call-details"])

            summary = manifest["summary"]
            self.assertEqual(summary["entity_counts"]["call_message_details"], 2)
            self.assertEqual(summary["recording_attempts"], 2)
            self.assertEqual(summary["entity_error_counts"], {"call_message_details": 2})
            errors = summary["entity_errors"]["call_message_details"]
            self.assertEqual(errors[0]["endpoint"], "/conversations/messages/{messageId}/locations/{locationId}/recording")
            self.assertEqual(errors[0]["status_code"], 503)
            self.assertNotIn("msg1", json.dumps(errors))
            self.assertNotIn("actual-location-id", json.dumps(errors))


if __name__ == "__main__":
    unittest.main()
