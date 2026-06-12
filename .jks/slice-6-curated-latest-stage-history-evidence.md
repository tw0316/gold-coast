# Slice 6 Evidence: Run-Safe Curated Publishing

Source epic: /Users/jarvis/.openclaw/workspace/epics/active/gold-coast-data-lake-recurring-batch-ingestion.md

## Scope

Added local run-safe curated publish semantics for repeated same-day refreshes.

- Curated output paths now include snapshot_date and run_id partitions.
- Glue table definitions now use snapshot_date and run_id partition keys.
- Curated rows now include snapshot_at from the raw manifest.
- Curated build summary now emits a latest_success payload only after table writes complete.
- Added opportunity_stage_history as a lightweight per-refresh opportunity stage/status snapshot.
- Updated data dictionary notes for snapshot_date/run_id freshness semantics.

## Behavior Implemented

- Same-day runs write separate curated partitions under snapshot_date=<date>/run=<run_id>/.
- Analysts can distinguish freshness by run_id partition and snapshot_at row timestamp.
- Latest-success metadata is constructed after successful writes; failed builds raise before the summary is returned.
- The stage-history table stores opportunity_id, contact_id, pipeline/stage/status fields, observed_at, source stage/status timestamps, and a stage_status_key for future diffs.

## Verification

Python compile and unit tests:

~~~
cd apps/data-lake
PYTHONPATH=src python3 -m py_compile scripts/ghl_extract_raw.py scripts/build_curated_tables.py src/gold_coast_data_lake/*.py src/gold_coast_data_lake/jobs/*.py tests/*.py
PYTHONPATH=src python3 -m unittest discover -s tests -v
~~~

Result:

~~~
Ran 24 tests in 0.020s
OK (skipped=1)
~~~

Skip reason:

- test_local_parquet_write_round_trips_row_counts skipped because local pyarrow is not installed.

Focused assertions added:

- snapshot_at is attached to curated rows from manifest finished_at.
- opportunity_stage_history preserves current stage/status state and stage_status_key.
- Glue table partition keys include snapshot_date and run_id.
- Parquet output paths include run=<run_id> when pyarrow is installed.

## Guardrails Confirmed

- No live GHL extraction was run.
- No AWS resources were created or modified.
- No Glue tables or partitions were updated during verification.
- No EventBridge schedule, ECS task, IAM policy, or Slack alert was added.

## Next Slice

Container packaging and AWS infrastructure planning/build verification.
