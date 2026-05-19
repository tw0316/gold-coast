# Slice 9 Evidence: Athena Smoke Checks And Run-Status Table

Source epic: /Users/jarvis/.openclaw/workspace/epics/active/gold-coast-data-lake-recurring-batch-ingestion.md

## Scope

Implemented local-only SQL, docs, and runner path support for Athena-readable GHL batch run status.

This slice does not run live Athena, GHL extraction, Slack webhooks, Terraform plan/apply, deployment, or schedule enablement.

## Files Changed

Current Slice 9 files in scope:

- apps/data-lake/src/gold_coast_data_lake/batch.py
- apps/data-lake/src/gold_coast_data_lake/jobs/ghl_batch_refresh.py
- apps/data-lake/tests/test_batch.py
- docs/ops/data-lake/batch-runner.md
- docs/ops/data-lake/fargate-refresh-runtime.md
- docs/ops/data-lake/query-library.md
- docs/ops/data-lake/run-status-athena-smoke.md
- sql/data-lake/ddl/001_run_status_ghl.sql
- sql/data-lake/smoke/001_latest_success_freshness.sql
- .jks/slice-9-athena-smoke-run-status-evidence.md

Working tree note: goal-state.json was already modified outside this fix-worker scope and was not touched.

## Behavior Implemented

- Historical run-status rows are written locally under runs/run=<run_id>/status.json.
- Historical run-status rows are single-line JSON so Athena JSON SerDe can read each file as one row.
- latest-success.json and latest-failure.json remain operational pointer objects outside the historical runs/ prefix.
- Sanitized JSONL logs live under run-status/ghl/logs/run=<run_id>.jsonl and are outside the Athena historical table.
- Non-dry-run execute mode uploads run-status artifacts to S3 when status-s3-bucket is provided, or to the same bucket as --s3-bucket when no explicit status bucket is provided.
- Dry-run and extractor-dry-run invocations do not create a status S3 uploader. The runner also skips status uploads for direct dry-run payloads even if an uploader is injected.
- Run-status payloads expose sanitized top-level image_tag and cloudwatch_log_url fields when provided through runner inputs or metadata.
- The CLI reads IMAGE_TAG through --image-tag and keeps CLOUDWATCH_LOG_URL support through --cloudwatch-log-url.
- The Athena table gold_coast.run_status_ghl points only at s3://gcoffers-data-lake/run-status/ghl/runs/.
- The run-status DDL includes nullable string columns for image_tag and cloudwatch_log_url.
- Smoke SQL validates latest successful non-dry-run freshness, latest curated row availability by snapshot_date plus run_id, and required catalog table presence.
- The latest-success freshness smoke query returns image_tag and cloudwatch_log_url for deployment/log traceability.

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

Result: 38 tests run, 37 passed, 1 skipped because local pyarrow is not installed.

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

Owner hardening smoke, 2026-05-19 00:30 ET:

~~~bash
cd apps/data-lake
PYTHONPATH=src python3 -m gold_coast_data_lake.jobs.ghl_batch_refresh --run-id slice9-observability-dry-run --status-dir "$tmp/status" --output-dir "$tmp/output" --status-s3-bucket fake-status-bucket --image-tag test-sha --cloudwatch-log-url https://console.aws.amazon.com/cloudwatch/home
wc -l "$tmp/status/runs/run=slice9-observability-dry-run/status.json" "$tmp/status/logs/run=slice9-observability-dry-run.jsonl"
python3 -m json.tool "$tmp/status/runs/run=slice9-observability-dry-run/status.json" | rg -n '"(image_tag|cloudwatch_log_url|log_path)"'
~~~

Result: passed. Historical status had exactly 1 line, the sanitized log had 3 lines, image_tag and cloudwatch_log_url were top-level fields, and dry-run log_path remained local even with --status-s3-bucket supplied.

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

Container engine blocker recheck:

~~~bash
for c in docker podman finch nerdctl colima limactl lima; do command -v $c && $c --version 2>/dev/null | head -n 1; done
~~~

Result: no docker, podman, finch, nerdctl, colima, limactl, or lima binary found locally.

Scoped SQL/path review:

~~~bash
rg -n "LOCATION 's3://gcoffers-data-lake/run-status/ghl/runs/'" sql/data-lake/ddl/001_run_status_ghl.sql
rg -n "LOCATION 's3://gcoffers-data-lake/run-status/ghl/'" sql/data-lake/ddl/001_run_status_ghl.sql
rg -n "run-status/ghl/runs/(latest-success|latest-failure)\.json|runs/latest-(success|failure)\.json" \
  sql/data-lake/ddl/001_run_status_ghl.sql \
  docs/ops/data-lake/batch-runner.md \
  docs/ops/data-lake/run-status-athena-smoke.md \
  docs/ops/data-lake/query-library.md \
  apps/data-lake/src/gold_coast_data_lake/batch.py \
  apps/data-lake/tests/test_batch.py
~~~

Result: DDL location is the narrow historical runs/ prefix. No broad historical table location was found. No pointer objects were found inside the historical table location.

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
- Owner rechecked local container availability at 2026-05-19 00:30 ET; no supported container engine was found.

## Status

Accepted by owner after local verification and hardening smoke pass.
