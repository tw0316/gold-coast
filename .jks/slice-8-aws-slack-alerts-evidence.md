# Slice 8 Evidence: AWS-Native Slack Alerts

Source epic: /Users/jarvis/.openclaw/workspace/epics/active/gold-coast-data-lake-recurring-batch-ingestion.md

## Scope

Implemented and reviewed sanitized Slack webhook alerts for the AWS Fargate batch refresh runtime.

- Added apps/data-lake/src/gold_coast_data_lake/alerts.py.
- Wired BatchRefreshRunner to an injectable alert callback.
- Wired the GHL batch job to read SLACK_WEBHOOK_URL, ALERT_MODE, SUCCESS_ALERT_UNTIL, and CLOUDWATCH_LOG_URL from process env.
- Wired Terraform task environment for ALERT_MODE and SUCCESS_ALERT_UNTIL, and SLACK_WEBHOOK_URL via Secrets Manager.
- Added Terraform preconditions requiring a Slack webhook secret when alerts are enabled and requiring success_alert_until for launch-window mode.
- Documented alert mode operation and the C0B4JTC5VPF target channel contract.

## Behavior Implemented

- Default local alert mode is off.
- Default deployed Terraform alert mode is failure-only.
- Failure-only mode posts failed runs only.
- Launch-window mode posts successful runs only until SUCCESS_ALERT_UNTIL and posts failures always.
- Launch-window success alerts fail closed without SUCCESS_ALERT_UNTIL instead of silently continuing or silently skipping.
- Success-and-failure mode exists for bounded operator testing.
- Missing webhook URL returns skipped_missing_webhook and does not send.
- Payload includes run ID, status, duration, snapshot timestamp, entity counts, recording counts, optional CloudWatch link, and sanitized error class/message.
- Payload does not include metadata, raw records, SMS bodies, phone/email fields, credentials, or webhook URL.
- Batch run status records alert_status. If alert sending raises, it records sanitized alert_error.

## Files Changed

- apps/data-lake/src/gold_coast_data_lake/alerts.py
- apps/data-lake/src/gold_coast_data_lake/batch.py
- apps/data-lake/src/gold_coast_data_lake/jobs/ghl_batch_refresh.py
- apps/data-lake/tests/test_alerts.py
- apps/data-lake/tests/test_batch.py
- infra/data-lake-refresh/main.tf
- infra/data-lake-refresh/variables.tf
- infra/data-lake-refresh/prod.tfvars.example
- docs/ops/data-lake/fargate-refresh-runtime.md
- .jks/slice-8-aws-slack-alerts-evidence.md

## Verification

Python compile, unit tests, Terraform validation:

~~~
cd apps/data-lake
PYTHONPATH=src python3 -m py_compile scripts/ghl_extract_raw.py scripts/build_curated_tables.py src/gold_coast_data_lake/*.py src/gold_coast_data_lake/jobs/*.py tests/*.py
PYTHONPATH=src python3 -m unittest discover -s tests -v
cd infra/data-lake-refresh
terraform fmt -check -recursive
terraform validate
~~~

Result:

~~~
py_compile: passed
Ran 33 tests in 0.027s
OK (skipped=1)
terraform fmt -check -recursive: passed
terraform validate: Success! The configuration is valid.
~~~

Owner recheck at 2026-05-19T00:01:30-04:00 also passed:

- git diff --check
- Python compile
- 33 data-lake unit tests, 32 passed and 1 skipped for missing local pyarrow
- terraform fmt -check -recursive infra/data-lake-refresh
- terraform -chdir=infra/data-lake-refresh validate

Skip reason:

- test_local_parquet_write_round_trips_row_counts skipped because local pyarrow is not installed.

Static scans:

~~~
rg -n "https://hooks\.slack\.com/services/[A-Za-z0-9/_-]+|SLACK_WEBHOOK_URL[[:space:]]*=[[:space:]]*https" apps/data-lake/src/gold_coast_data_lake apps/data-lake/tests infra/data-lake-refresh docs/ops/data-lake/fargate-refresh-runtime.md .jks/slice-8-aws-slack-alerts-evidence.md
rg -n "Bearer [A-Za-z0-9_./+=-]{8,}|Authorization:[[:space:]]*Bearer|access_token[[:space:]]*[:=][[:space:]]*['\"]?[A-Za-z0-9_./+=-]{8,}" apps/data-lake/src/gold_coast_data_lake infra/data-lake-refresh docs/ops/data-lake/fargate-refresh-runtime.md .jks/slice-8-aws-slack-alerts-evidence.md
rg -n "requests\.(post|put|patch|delete)|client\.(post|put|patch|delete)|method[[:space:]]*=[\"'](POST|PUT|PATCH|DELETE)|\b(POST|PUT|PATCH|DELETE)\b" apps/data-lake/src/gold_coast_data_lake/extractor.py apps/data-lake/src/gold_coast_data_lake/raw_refresh.py apps/data-lake/scripts/ghl_extract_raw.py
~~~

Results:

- No committed real Slack webhook URL or SLACK_WEBHOOK_URL assignment found.
- No real bearer/access token value found. Broader owner scan hits are limited to sanitizer marker strings, the documented scan command, and intentional fake test fixtures.
- GHL extractor/raw-refresh paths still contain no mutating request paths. The new POST path is limited to Slack webhook alert delivery, not GHL access.

## Guardrails Confirmed

- No Slack webhook call was made.
- No live GHL extraction was run.
- No AWS resource was created or modified.
- No EventBridge schedule was enabled.
- No terraform plan/apply was run.
- No GitHub push was run.

## Next Slice

Add Athena smoke checks and run-status Athena table semantics. Slice 7's Docker image build verification remains a scoped deployment blocker until a local/containerized build path is available or an approved AWS-native build verification path is used.
