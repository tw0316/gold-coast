# Slice 3 Evidence: Batch Runner Foundation

Source epic: `/Users/jarvis/.openclaw/workspace/epics/active/gold-coast-data-lake-recurring-batch-ingestion.md`

## Scope

Implemented the local batch runner foundation for the production GHL recurring refresh.

- Added `apps/data-lake/src/gold_coast_data_lake/batch.py`.
- Added `apps/data-lake/src/gold_coast_data_lake/jobs/ghl_batch_refresh.py`.
- Added focused runner tests in `apps/data-lake/tests/test_batch.py`.
- Added operator docs in `docs/ops/data-lake/batch-runner.md`.

This slice does not create AWS resources, deploy infrastructure, run live GHL extraction, enable EventBridge, or send Slack alerts.

## Behavior Implemented

- Unique run IDs, using the existing `format_run_id` helper unless an operator supplies `--run-id`.
- Local TTL file lock with the accepted 45-minute lock duration, as the checked-in local stand-in for the later DynamoDB conditional TTL lock.
- Immutable per-run status file: `run=<run_id>.json`.
- Operational pointers: `latest-success.json` and `latest-failure.json`.
- Failed runs do not advance `latest-success.json`.
- Sanitized JSONL operator logs.
- Status payload includes `run_id`, status, source environment, `snapshot_at`, `snapshot_date`, duration, lock metadata, entity counts, recording counts, phase results, log path, alert status, metadata, and sanitized failure details.
- Safe manual dry-run entrypoint.
- `--execute` fails deliberately until production extraction orchestration is implemented.

## Verification

Python compile and unit tests:

```
cd apps/data-lake
PYTHONPATH=src python3 -m py_compile scripts/ghl_extract_raw.py scripts/build_curated_tables.py src/gold_coast_data_lake/*.py src/gold_coast_data_lake/jobs/*.py tests/*.py
PYTHONPATH=src python3 -m unittest discover -s tests -v
```

Result:

```
Ran 17 tests in 0.013s
OK (skipped=1)
```

Skip reason:

- `test_local_parquet_write_round_trips_row_counts` skipped because local `pyarrow` is not installed.

Manual dry-run:

```
cd apps/data-lake
PYTHONPATH=src python3 -m gold_coast_data_lake.jobs.ghl_batch_refresh --run-id local-dry-run
```

Result:

- status `succeeded`
- lock provider `local_ttl_file`
- lock TTL `2700`
- `latest-success.json` written
- sanitized log written under `apps/data-lake/data/run-status/ghl/logs/`

Production execute guard:

```
cd apps/data-lake
PYTHONPATH=src python3 -m gold_coast_data_lake.jobs.ghl_batch_refresh --run-id execute-not-yet --execute
```

Result:

- command exited nonzero as expected
- status `failed`
- error class `NotImplementedError`
- `latest-failure.json` written
- `latest-success.json` was not advanced by the failed run

## Guardrails Confirmed

- No GHL live extraction was run.
- No AWS resources were created or modified.
- No EventBridge, ECS, ECR, DynamoDB, IAM, Secrets Manager, or Slack webhook infrastructure was added in this slice.
- `apps/data-lake/data/` is git-ignored and generated local dry-run artifacts were removed before commit.
- Data-lake source and script paths still contain no GHL mutating API calls.

## Next Slice

Add production raw refresh orchestration using the existing GET-only extractor and full core-source refresh strategy, still locally verified before cloud scheduling or infrastructure deployment.
