# Slice 9 Evidence: Athena Smoke Checks And Run-Status Table

Source epic: /Users/jarvis/.openclaw/workspace/epics/active/gold-coast-data-lake-recurring-batch-ingestion.md

## Scope

Implemented local-only SQL, docs, and runner path support for Athena-readable GHL batch run status.

This slice does not run live Athena, GHL extraction, Slack webhooks, Terraform plan/apply, deployment, or schedule enablement.

## Files Changed

Current Slice 9 files changed in this worktree:

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

## Fixes Made

- Fixed build_status_uploader so it returns None unless the CLI run is execute-mode and not extractor-dry-run. A provided --status-s3-bucket is ignored for dry-run and extractor-dry-run.
- Added a runner-level dry-run guard so BatchRefreshRunner does not upload status/log artifacts when dry_run is true, even if a status uploader is injected directly.
- Added focused tests covering dry-run status bucket input not constructing S3Uploader and direct runner dry-run not uploading through an injected uploader.
- Added sanitized top-level status payload fields image_tag and cloudwatch_log_url.
- Added CLI --image-tag defaulting from IMAGE_TAG. Existing --cloudwatch-log-url / CLOUDWATCH_LOG_URL support remains.
- Added image_tag and cloudwatch_log_url as nullable top-level string columns in gold_coast.run_status_ghl.
- Updated the latest-success smoke query to return image_tag and cloudwatch_log_url.
- Updated docs to state dry-run status S3 upload is prevented and to document IMAGE_TAG/CLOUDWATCH_LOG_URL.
- Removed stale duplicate-doc warning language. The duplicate-doc warning is no longer present.

Dry-run status S3 upload is now prevented: yes.

image_tag and cloudwatch_log_url are top-level status payload and DDL fields: yes.

## Exact Commands Run And Results

Python compile:

~~~bash
PYTHONPATH=apps/data-lake/src python3 -m py_compile apps/data-lake/src/gold_coast_data_lake/*.py apps/data-lake/src/gold_coast_data_lake/jobs/*.py apps/data-lake/tests/*.py
~~~

Result: exit 0. Passed. Run twice during the fix pass, both passed.

Unit tests:

~~~bash
cd apps/data-lake
PYTHONPATH=src python3 -m unittest discover -s tests -v
~~~

Result: exit 0. Ran 38 tests. 37 passed. 1 skipped because local pyarrow is not installed. Run twice during the fix pass, both passed.

Diff/style:

~~~bash
git diff --check
~~~

Result: exit 0. Passed.

DDL location scope:

~~~bash
set -eu
rg -n "LOCATION 's3://gcoffers-data-lake/run-status/ghl/runs/'" sql/data-lake/ddl/001_run_status_ghl.sql >/dev/null
if rg -n "LOCATION 's3://gcoffers-data-lake/run-status/ghl/'" sql/data-lake/ddl/001_run_status_ghl.sql >/dev/null; then
  exit 1
fi
~~~

Result: exit 0. DDL location is exactly s3://gcoffers-data-lake/run-status/ghl/runs/ and not the broader run-status/ghl/ prefix.

Pointer-object scope:

~~~bash
set -eu
if rg -n "run-status/ghl/runs/(latest-success|latest-failure)\.json|runs/latest-(success|failure)\.json" \
  sql/data-lake/ddl/001_run_status_ghl.sql \
  docs/ops/data-lake/batch-runner.md \
  docs/ops/data-lake/run-status-athena-smoke.md \
  docs/ops/data-lake/query-library.md \
  apps/data-lake/src/gold_coast_data_lake/batch.py \
  apps/data-lake/tests/test_batch.py >/dev/null; then
  exit 1
fi
~~~

Initial result before evidence cleanup: exit 1 because this evidence file itself had a stale negative-check example mentioning data/run-status/ghl/runs/latest-success.json.

Final result: exit 0. No pointer objects were found inside the historical table location.

Secret/webhook scan:

~~~bash
set -eu
if rg -n \
  -e 'https://hooks\.slack\.com/services/[A-Za-z0-9/_-]+' \
  -e 'SLACK_WEBHOOK_URL[[:space:]]*=[[:space:]]*https' \
  -e 'Bearer [A-Za-z0-9_./+=-]{8,}' \
  -e 'Authorization:[[:space:]]*Bearer' \
  -e 'access_token[[:space:]]*[:=][[:space:]]*[A-Za-z0-9_./+=-]{8,}' \
  apps/data-lake/src/gold_coast_data_lake/batch.py \
  apps/data-lake/src/gold_coast_data_lake/jobs/ghl_batch_refresh.py \
  apps/data-lake/tests/test_batch.py \
  docs/ops/data-lake/batch-runner.md \
  docs/ops/data-lake/fargate-refresh-runtime.md \
  docs/ops/data-lake/query-library.md \
  docs/ops/data-lake/run-status-athena-smoke.md \
  sql/data-lake/ddl/001_run_status_ghl.sql \
  sql/data-lake/smoke \
  .jks/slice-9-athena-smoke-run-status-evidence.md; then
  exit 1
fi
~~~

Initial result before fake-fixture adjustment: exit 1 because the scoped scan matched a fake test string in apps/data-lake/tests/test_batch.py.

Final result: exit 0. No matches.

Working tree status inspection:

~~~bash
git status --short --branch
git diff --name-only && git ls-files --others --exclude-standard
git diff -- goal-state.json | sed -n '1,80p'
~~~

Result: branch feat/data-lake-monorepo-slice-1. goal-state.json was already modified and only showed updatedAt/lastReportAt timestamp drift; this fix worker did not edit it.

## Guardrails Confirmed

- No live GHL extraction was run.
- No GHL write path was added under apps/data-lake.
- No Slack webhook call or routine Slack message was sent.
- No AWS CLI live Athena query was run.
- No Terraform plan/apply was run.
- No AWS resources were created or modified.
- No deployment or schedule was enabled.
- No GitHub push was run.
- No commit was made.
- GOAL.md was not modified.
- goal-state.json was not modified by this fix worker.

## Blockers

- Slice 7 Docker image build verification remains a release/deploy blocker because no local container engine is installed.
- Slice 10 schedule enablement/first production run must remain blocked until the container build/deploy prerequisite is resolved or Tej approves a different verification path.
- Live Athena smoke execution is intentionally deferred until a deploy/manual production run slice owns AWS interaction.
- Local pyarrow is missing, so one existing Parquet round-trip test remains skipped.

## Status

Accepted by owner after fix pass.

Owner verification reran:

- \`python3 -m json.tool goal-state.json\`
- \`git diff --check\`
- Python compile for data-lake scripts, package modules, job modules, and tests
- Full data-lake unit suite: 38 tests, 37 passed, 1 skipped because local pyarrow is not installed
- Local dry-run with \`--status-s3-bucket\`, \`--image-tag\`, and \`--cloudwatch-log-url\`
- JSON validation for historical status and latest-success pointer
- Pointer-exclusion checks for the historical \`runs/\` prefix
- DDL location check for \`s3://gcoffers-data-lake/run-status/ghl/runs/\`
- Scoped credential/webhook scan
- Focused GHL mutating-call scan

Result: accepted. The worker made no commit; owner committed evidence/state after verification.
