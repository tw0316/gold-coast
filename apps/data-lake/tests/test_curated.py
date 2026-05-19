from __future__ import annotations

from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from gold_coast_data_lake.curated import (
    TABLE_ORDER,
    build_curated_tables,
    glue_table_input,
    parse_timestamp,
    write_curated_tables,
)


def sample_raw() -> tuple[dict, dict]:
    manifest = {
        "run_id": "20260518T080441Z",
        "recordings": [
            {
                "message_id": "call1",
                "s3_uri": "s3://bucket/recordings/ghl/message_id=call1.wav",
                "object_key": "recordings/ghl/message_id=call1.wav",
                "content_type": "audio/x-wav",
                "byte_count": 123,
                "sha256": "abc",
                "archived_at": "2026-05-18T10:04:00Z",
            }
        ],
    }
    raw = {
        "pipelines": [
            {
                "id": "pipe1",
                "name": "1. Motivated Sellers",
                "stages": [{"id": "stage1", "name": "New Leads", "position": 0}],
            }
        ],
        "contacts": [
            {
                "id": "contact1",
                "locationId": "loc",
                "contactName": "Seller One",
                "phone": "+15551234567",
                "dateAdded": "2026-05-18T09:58:00Z",
            }
        ],
        "opportunities": [
            {
                "id": "opp1",
                "contactId": "contact1",
                "locationId": "loc",
                "name": "Seller One",
                "pipelineId": "pipe1",
                "pipelineStageId": "stage1",
                "assignedTo": "owner-user",
                "status": "open",
                "createdAt": "2026-05-18T10:00:00Z",
            }
        ],
        "messages": [
            {
                "id": "msg1",
                "conversationId": "conv1",
                "contactId": "contact1",
                "locationId": "loc",
                "messageType": "TYPE_SMS",
                "direction": "outbound",
                "userId": "rep1",
                "body": "Checking in",
                "dateAdded": "2026-05-18T10:05:00Z",
            },
            {
                "id": "msg2",
                "conversationId": "conv1",
                "contactId": "contact1",
                "locationId": "loc",
                "messageType": "TYPE_SMS",
                "direction": "inbound",
                "body": "Yes",
                "dateAdded": "2026-05-18T10:07:00Z",
            },
            {
                "id": "call1",
                "conversationId": "conv1",
                "contactId": "contact1",
                "locationId": "loc",
                "messageType": "TYPE_CALL",
                "direction": "outbound",
                "userId": "rep1",
                "dateAdded": "2026-05-18T10:03:00Z",
            },
        ],
        "call_message_details": [
            {
                "id": "call1",
                "conversationId": "conv1",
                "contactId": "contact1",
                "locationId": "loc",
                "messageType": "TYPE_CALL",
                "direction": "outbound",
                "status": "completed",
                "userId": "rep1",
                "dateAdded": "2026-05-18T10:03:00Z",
                "meta": {"call": {"duration": 61, "status": "completed"}},
            }
        ],
    }
    return manifest, raw


class CuratedTests(unittest.TestCase):
    def test_parse_timestamp_handles_iso_and_epoch_millis(self) -> None:
        self.assertEqual(parse_timestamp("2026-05-18T10:00:00Z").isoformat(), "2026-05-18T10:00:00")
        self.assertEqual(parse_timestamp(1779098400000).year, 2026)

    def test_curated_tables_join_stage_recording_and_response_metrics(self) -> None:
        manifest, raw = sample_raw()
        tables = build_curated_tables(raw, manifest)

        self.assertEqual(list(tables), TABLE_ORDER)
        self.assertEqual(tables["opportunities"].rows[0]["pipeline_stage_name"], "New Leads")
        self.assertTrue(tables["calls"].rows[0]["has_recording"])
        self.assertEqual(tables["calls"].rows[0]["recording_archival_status"], "archived")

        lead = tables["mart_lead_response"].rows[0]
        self.assertEqual(lead["minutes_to_first_outbound_call"], 3.0)
        self.assertEqual(lead["minutes_to_first_outbound_message"], 5.0)
        self.assertTrue(lead["has_completed_call"])

    def test_rep_activity_uses_event_actor_not_opportunity_owner(self) -> None:
        manifest, raw = sample_raw()
        tables = build_curated_tables(raw, manifest)
        rows = {(row["activity_date"], row["actor_user_id"]): row for row in tables["mart_rep_activity_daily"].rows}

        self.assertEqual(rows[("2026-05-18", "rep1")]["calls_total"], 1)
        self.assertEqual(rows[("2026-05-18", "rep1")]["messages_total"], 1)
        self.assertEqual(rows[("2026-05-18", "unknown")]["messages_inbound"], 1)
        self.assertNotIn(("2026-05-18", "owner-user"), rows)

    def test_glue_table_is_partitioned_by_snapshot_date(self) -> None:
        table_input = glue_table_input("contacts", "s3://bucket/curated/ghl/contacts/")
        self.assertEqual(table_input["PartitionKeys"], [{"Name": "snapshot_date", "Type": "string"}])
        self.assertEqual(table_input["StorageDescriptor"]["Location"], "s3://bucket/curated/ghl/contacts/")

    def test_local_parquet_write_round_trips_row_counts(self) -> None:
        try:
            import pyarrow.parquet as pq  # type: ignore
        except ImportError as exc:
            raise unittest.SkipTest("pyarrow is not installed") from exc

        manifest, raw = sample_raw()
        tables = build_curated_tables(raw, manifest)
        with tempfile.TemporaryDirectory() as tmp:
            written = write_curated_tables(tables, snapshot_date="2026-05-18", local_output_dir=tmp)
            counts = {item.name: item.row_count for item in written}
            self.assertEqual(counts["contacts"], 1)
            for item in written:
                parquet = pq.read_table(item.local_path)
                self.assertEqual(parquet.num_rows, item.row_count)


if __name__ == "__main__":
    unittest.main()
