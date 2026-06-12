# Slice 4 Evidence: Production Raw Refresh Orchestration

Source epic: /Users/jarvis/.openclaw/workspace/epics/active/gold-coast-data-lake-recurring-batch-ingestion.md

## Scope

Wired the batch runner to the existing GET-only raw GHL extractor for the full core-source refresh path.

- Added apps/data-lake/src/gold_coast_data_lake/raw_refresh.py.
- Updated apps/data-lake/src/gold_coast_data_lake/jobs/ghl_batch_refresh.py to build the raw refresh phase in execute mode.
- Updated apps/data-lake/src/gold_coast_data_lake/batch.py so phase outputs promote entity counts, recording counts, and manifest URI into run status.
- Added tests in apps/data-lake/tests/test_raw_refresh.py and expanded runner tests.
- Updated docs/ops/data-lake/batch-runner.md with the safe local raw-refresh command.

## Behavior Implemented

- Default no-argument runner remains safe: it validates the runner and does not call GHL.
- Execute mode requires GHL config from --env-file or GHL_ENV_FILE.
- Non-local execute mode requires --s3-bucket, so a production run cannot silently write only local raw output.
- Local operator verification can use --execute --extractor-dry-run with explicit output paths and bounds.
- Raw refresh uses the existing package GHLClient and GHLRawExtractor.
- Full core-source entity set is contacts, pipelines, opportunities, conversations, messages, and call-details.
- Raw phase returns sanitized manifest/checkpoint/file summaries, entity counts, entity page counts, and recording counts.

## Verification

Python compile and unit tests:

~~~
cd apps/data-lake
PYTHONPATH=src python3 -m py_compile scripts/ghl_extract_raw.py scripts/build_curated_tables.py src/gold_coast_data_lake/*.py src/gold_coast_data_lake/jobs/*.py tests/*.py
PYTHONPATH=src python3 -m unittest discover -s tests -v
~~~

Result:

~~~
Ran 23 tests in 0.020s
OK (skipped=1)
~~~

Skip reason:

- test_local_parquet_write_round_trips_row_counts skipped because local pyarrow is not installed.

CLI guard checks without live GHL calls:

~~~
cd apps/data-lake
PYTHONPATH=src python3 -m gold_coast_data_lake.jobs.ghl_batch_refresh --run-id slice4-dry-run --status-dir /tmp/gc-data-lake-slice4-status --output-dir /tmp/gc-data-lake-slice4-extracts
PYTHONPATH=src python3 -m gold_coast_data_lake.jobs.ghl_batch_refresh --execute --extractor-dry-run --run-id missing-env --status-dir /tmp/gc-data-lake-slice4-status --output-dir /tmp/gc-data-lake-slice4-extracts
~~~

Result:

- slice4-dry-run succeeded without calling GHL.
- missing-env failed as expected with ValueError: Provide --env-file or set GHL_ENV_FILE for production raw refresh runs.

## Guardrails Confirmed

- No live GHL extraction was run during verification.
- No AWS resources were created or modified.
- No EventBridge, ECS, ECR, DynamoDB, IAM, Secrets Manager, or Slack webhook infrastructure was added in this slice.
- Static scan found no mutating GHL calls in apps/data-lake/src or apps/data-lake/scripts.

## Next Slice

Run-safe curated publishing and latest-success semantics.
