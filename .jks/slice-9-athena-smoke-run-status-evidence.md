# Slice 9 Evidence: Athena Smoke Checks And Run-Status Table

Source epic: /Users/jarvis/.openclaw/workspace/epics/active/gold-coast-data-lake-recurring-batch-ingestion.md

## Scope

Implemented local-only SQL, docs, and runner path support for Athena-readable GHL batch run status.

This slice does not run live Athena, GHL extraction, Slack webhooks, Terraform plan/apply, deployment, or schedule enablement.

## Files Changed

- apps/data-lake/src/gold_coast_data_lake/batch.py
- apps/data-lake/src/gold_coast_data_lake/jobs/ghl_batch_refresh.py
- apps/data-lake/tests/test_batch.py
- docs/ops/data-lake/batch-runner.md
- docs/ops/data-lake/fargate-refresh-runtime.md
- docs/ops/data-lake/query-library.md
- docs/ops/data-lake/run-status-athena-smoke.md
- sql/data-lake/ddl/001_run_status_ghl.sql
- sql/data-lake/smoke/001_latest_success_freshness.sql
- sql/data-lake/smoke/002_latest_curated_row_availability.sql
- sql/data-lake/smoke/003_critical_table_catalog.sql
- .jks/slice-9-athena-smoke-run-status-evidence.md

## Behavior Implemented

- Historical run-status rows are written locally under runs/run=<run_id>/status.json.
- Historical run-status rows are single-line JSON so Athena JSON SerDe can read each file as one row.
- latest-success.json and latest-failure.json remain operational pointer objects outside the historical runs/ prefix.
- Sanitized JSONL logs live under run-status/ghl/logs/run=<run_id>.jsonl and are outside the Athena historical table.
- Non-dry-run execute mode uploads run-status artifacts to S3 when status-s3-bucket is provided, or to the same bucket as --s3-bucket when no explicit status bucket is provided.
- The Athena table gold_coast.run_status_ghl points only at s3://gcoffers-data-lake/run-status/ghl/runs/.
- Smoke SQL validates latest successful non-dry-run freshness, latest curated row availability by snapshot_date plus run_id, and required catalog table presence.
- Duplicate overlapping smoke docs were consolidated into docs/ops/data-lake/run-status-athena-smoke.md.

## Verification

Python compile:

~~~bash
PYTHONPATH=apps/data-lake/src python3 -m py_compile apps/data-lake/src/gold_coast_data_lake/*.py apps/data-lake/src/gold_coast_data_lake/jobs/*.py apps/data-lake/tests/*.py
~~~

Result: passed.

Unit tests:

~~~bash
cd apps/data-lake
PYTHONPATH=src python3 -m unittest discover -s tests -v
~~~

Result: 34 tests run, 33 passed, 1 skipped because local pyarrow is not installed.

Local dry-run status shape:

~~~bash
cd apps/data-lake
PYTHONPATH=src python3 -m gold_coast_data_lake.jobs.ghl_batch_refresh --run-id slice9-local-dry-run
wc -l data/run-status/ghl/runs/run=slice9-local-dry-run/status.json data/run-status/ghl/latest-success.json data/run-status/ghl/logs/run=slice9-local-dry-run.jsonl
~~~

Result: historical status file had exactly 1 line; latest-success remained a pointer file; JSONL log had 3 lines.

JSON validation and pointer exclusion:

~~~bash
cd apps/data-lake
python3 -m json.tool data/run-status/ghl/runs/run=slice9-local-dry-run/status.json
python3 -m json.tool data/run-status/ghl/latest-success.json
test ! -e data/run-status/ghl/runs/latest-success.json
test ! -e data/run-status/ghl/run=slice9-local-dry-run.json
~~~

Result: passed.

CLI contract:

~~~bash
cd apps/data-lake
PYTHONPATH=src python3 -m gold_coast_data_lake.jobs.ghl_batch_refresh --help
~~~

Result: passed; help includes --status-s3-bucket and --status-s3-prefix.

Diff/style:

~~~bash
git diff --check
~~~

Result: passed.

GET-only GHL static scan:

~~~bash
rg -n --glob '*.py' 'request\("(POST|PUT|PATCH|DELETE)|Request\([^\n]*method\s*=\s*"(POST|PUT|PATCH|DELETE)"|\.post\(|\.put\(|\.patch\(|\.delete\(' apps/data-lake/src apps/data-lake/scripts
~~~

Result: no matches.

Secret/webhook scan:

~~~bash
rg -n -e 'https://hooks\.slack\.com/services/[A-Za-z0-9/_-]+' -e 'SLACK_WEBHOOK_URL[[:space:]]*=[[:space:]]*https' -e 'Bearer [A-Za-z0-9_./+=-]{8,}' -e 'Authorization:[[:space:]]*Bearer' -e 'access_token[[:space:]]*[:=][[:space:]]*[A-Za-z0-9_./+=-]{8,}' apps/data-lake/src apps/data-lake/tests infra/data-lake-refresh docs/ops/data-lake sql/data-lake .jks
~~~

Result: only intentional fake test fixtures in test_batch.py and test_alerts.py.

Scoped SQL/path review:

~~~bash
rg -n "LOCATION 's3://gcoffers-data-lake/run-status/ghl/'|run-status/ghl/runs/|runs/run=<run_id>/status.json|latest-success.json|latest-failure.json" sql/data-lake docs/ops/data-lake apps/data-lake/src apps/data-lake/tests .jks/slice-9-athena-smoke-run-status-evidence.md
~~~

Result: DDL location is the narrow historical runs/ prefix. No broad historical table location was found.

## Guardrails Confirmed

- No live GHL extraction was run.
- No GHL write path was added under apps/data-lake.
- No Slack webhook call or routine Slack message was sent.
- No AWS CLI live Athena query was run.
- No Terraform plan/apply was run.
- No AWS resources were created or modified.
- No deployment or schedule was enabled.
- No GitHub push was run.

## Blockers And Notes

- Slice 7 Docker image build verification remains a release/deploy blocker because no local container engine is installed.
- Slice 10 schedule enablement/first production run must remain blocked until the container build/deploy prerequisite is resolved or Tej approves a different verification path.
- Live Athena smoke execution is intentionally deferred until a deploy/manual production run slice owns AWS interaction.
- Local pyarrow is missing, so one existing Parquet round-trip test remains skipped.

## Status

Accepted by owner after local verification.
