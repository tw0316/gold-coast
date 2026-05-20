from __future__ import annotations

from datetime import datetime, timezone
import unittest

from gold_coast_data_lake.smoke import default_athena_output_location, run_athena_smoke_checks


class FakeAthenaClient:
    def __init__(self) -> None:
        self.queries = []
        self.results = {
            "query-1": [
                {
                    "snapshot_at": "2026-05-19 16:00:00.000",
                    "age_minutes": "1",
                    "max_age_minutes": "120",
                    "status": "passed",
                }
            ],
            "query-2": [
                {"table_name": "gold_coast.contacts_latest", "row_count": "10", "min_rows": "1", "status": "passed"},
                {"table_name": "gold_coast.opportunities_latest", "row_count": "2", "min_rows": "1", "status": "passed"},
                {"table_name": "gold_coast.opportunity_stage_history", "row_count": "2", "min_rows": "1", "status": "passed"},
                {"table_name": "gold_coast.messages", "row_count": "20", "min_rows": "1", "status": "passed"},
                {"table_name": "gold_coast.calls", "row_count": "4", "min_rows": "1", "status": "passed"},
                {"table_name": "gold_coast.call_recordings", "row_count": "4", "min_rows": "1", "status": "passed"},
                {"table_name": "gold_coast_reporting.lead_response", "row_count": "2", "min_rows": "1", "status": "passed"},
                {"table_name": "gold_coast_reporting.rep_activity_daily", "row_count": "1", "min_rows": "1", "status": "passed"},
            ],
            "query-3": [
                {"check_name": "contacts_latest.contact_id", "table_name": "gold_coast.contacts_latest", "key_column": "contact_id", "duplicate_count": "0", "null_key_count": "0", "status": "passed"},
                {"check_name": "opportunities_latest.opportunity_id", "table_name": "gold_coast.opportunities_latest", "key_column": "opportunity_id", "duplicate_count": "0", "null_key_count": "0", "status": "passed"},
                {"check_name": "messages.message_id", "table_name": "gold_coast.messages", "key_column": "message_id", "duplicate_count": "0", "null_key_count": "0", "status": "passed"},
                {"check_name": "calls.call_message_id", "table_name": "gold_coast.calls", "key_column": "call_message_id", "duplicate_count": "0", "null_key_count": "0", "status": "passed"},
                {"check_name": "call_recordings.message_id", "table_name": "gold_coast.call_recordings", "key_column": "message_id", "duplicate_count": "0", "null_key_count": "0", "status": "passed"},
                {"check_name": "opportunity_stage_history.transition_key", "table_name": "gold_coast.opportunity_stage_history", "key_column": "transition_key", "duplicate_count": "0", "null_key_count": "0", "status": "passed"},
            ],
        }

    def start_query_execution(self, **kwargs):
        query_id = f"query-{len(self.queries) + 1}"
        self.queries.append(kwargs)
        return {"QueryExecutionId": query_id}

    def get_query_execution(self, QueryExecutionId):
        return {"QueryExecution": {"Status": {"State": "SUCCEEDED"}}}

    def get_query_results(self, QueryExecutionId):
        rows = self.results[QueryExecutionId]
        headers = list(rows[0])
        return {
            "ResultSet": {
                "Rows": [
                    {"Data": [{"VarCharValue": header} for header in headers]},
                    *[
                        {"Data": [{"VarCharValue": "" if row[header] is None else str(row[header])} for header in headers]}
                        for row in rows
                    ],
                ]
            }
        }


class AthenaSmokeTests(unittest.TestCase):
    def test_run_athena_smoke_checks_returns_passed_status_with_required_fields(self) -> None:
        client = FakeAthenaClient()
        checks = run_athena_smoke_checks(
            run_id="run1",
            snapshot_date="2026-05-19",
            database="gold_coast",
            reporting_database="gold_coast_reporting",
            workgroup="gold_coast_data_lake",
            output_location="s3://gcoffers-data-lake/athena-results/ghl/smoke/",
            table_counts={"contacts": 10},
            client=client,
            now=datetime(2026, 5, 19, 16, 1, tzinfo=timezone.utc),
            poll_interval_seconds=0,
        )

        self.assertEqual(len(checks), 1)
        check = checks[0]
        self.assertEqual(check["status"], "passed")
        self.assertEqual(check["checked_at"], "2026-05-19T16:01:00Z")
        self.assertIn("gold_coast.contacts_latest", check["queried_tables"])
        self.assertIn("gold_coast.messages", check["queried_tables"])
        self.assertIn("gold_coast_reporting.lead_response", check["queried_tables"])
        self.assertEqual(check["query_execution_ids"], ["query-1", "query-2", "query-3"])
        self.assertEqual(check["freshness_result"]["status"], "passed")
        self.assertEqual(check["row_availability_result"]["status"], "passed")
        self.assertEqual(check["row_availability_result"]["table_counts"]["gold_coast.contacts_latest"], 10)
        self.assertEqual(check["duplicate_result"]["status"], "passed")
        self.assertEqual(len(client.queries), 3)
        self.assertIn('"gold_coast"."contacts_latest"', client.queries[0]["QueryString"])
        self.assertIn('"gold_coast_reporting"."lead_response"', client.queries[1]["QueryString"])

    def test_run_athena_smoke_checks_returns_not_run_when_config_is_missing(self) -> None:
        checks = run_athena_smoke_checks(
            run_id="run1",
            snapshot_date="2026-05-19",
            database="gold_coast",
            reporting_database="gold_coast_reporting",
            workgroup="gold_coast_data_lake",
            output_location=None,
            table_counts={"contacts": 10},
        )

        self.assertEqual(checks[0]["status"], "not_run")
        self.assertIn("missing Athena output location", checks[0]["error"])
        self.assertEqual(checks[0]["freshness_result"]["status"], "not_run")
        self.assertEqual(checks[0]["row_availability_result"]["status"], "not_run")

    def test_default_athena_output_location_uses_bucket_and_prefix(self) -> None:
        self.assertEqual(
            default_athena_output_location("lake", "prod"),
            "s3://lake/prod/athena-results/ghl/smoke/",
        )
        self.assertEqual(
            default_athena_output_location("lake", ""),
            "s3://lake/athena-results/ghl/smoke/",
        )


if __name__ == "__main__":
    unittest.main()
