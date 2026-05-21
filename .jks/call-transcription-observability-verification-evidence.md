# Call Transcription Observability V1.1 Verification Evidence

Date: 2026-05-21

Scope: owner review and local verification before deploy.

## Worker Artifacts Reviewed

- Runtime/alerts: `.jks/call-transcription-observability-runtime-evidence.md`
- Terraform: `.jks/call-transcription-observability-terraform-evidence.md`
- Athena/docs: `.jks/call-transcription-observability-athena-docs-evidence.md`

## Owner Review Fixes

- Updated transcription smoke SQL filters to accept both `prod` and `production` source environments. The live ECS task uses `prod`.
- Updated transcription coverage smoke SQL to match the job's eligible-source shape: `calls` joined to `call_recordings` with an archived object key.
- Added Terraform `CLOUDWATCH_LOG_URL` env injection for the transcription task using the transcription CloudWatch log group URL.
- After the first controlled ECS smoke showed the runtime was sanitizing the allowed CloudWatch console URL to `[redacted-url]`, added an allowlist for AWS CloudWatch console URLs while preserving redaction for non-CloudWatch URLs.
- Corrected the transcription run-status raw DDL `published` field to match the status JSON object shape.
- After live Athena DDL validation caught `database` as an invalid nested struct field name in the unused `published` column, removed that column from the raw run-status table schema. The shared `job_run_status` view does not depend on it.
- After live Athena view validation caught `execute` as a reserved identifier, renamed the normalized shared-view column to `execute_flag` and updated transcription smoke SQL.

## Local Verification

- Focused alert/transcription tests:
  - Command: `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=src python3 -m unittest tests.test_alerts tests.test_transcription`
  - Result: 27 tests passed after the CloudWatch URL allowlist fix.
- Full data-lake unit suite:
  - Command: `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=src python3 -m unittest discover tests`
  - Result: 78 tests passed, 2 skipped after the CloudWatch URL allowlist fix.
- Terraform checks:
  - `terraform fmt -check main.tf variables.tf` passed.
  - `terraform validate` passed.
- Diff/state checks:
  - `git diff --check` passed.
  - `python3 -m json.tool goal-state.json` passed.

## Static Safety Checks

- Run-status table locations point only at historical `runs/` prefixes:
  - `s3://gcoffers-data-lake/run-status/ghl/runs/`
  - `s3://gcoffers-data-lake/run-status/ghl-call-transcription/runs/`
- New transcription smoke SQL files all query `gold_coast.job_run_status` with `job_name = 'ghl-call-transcription'`.
- Static scan of observability docs/evidence/SQL found only privacy guardrail wording for forbidden concepts, not actual transcript text, raw audio, recording URLs, webhook URLs, API keys, emails, phones, or raw PII.

## Read-Only Live Context Checked

- AWS caller identity: account `108750423275`, IAM user `jarvis-bot`.
- Current transcription schedule before deploy:
  - Name: `gold-coast-data-lake-ghl-call-transcription`
  - State: `ENABLED`
  - Expression: `rate(1 hour)`
  - Task definition before deploy: revision 1
- Current core refresh schedule before deploy:
  - Name: `gold-coast-data-lake-ghl-refresh`
  - State: `ENABLED`
  - Expression: `rate(1 hour)`
  - Task definition before deploy: revision 8
- Current transcription coverage before deploy:
  - Eligible calls: 285
  - Succeeded covered calls: 283
  - Remaining calls: 2

## Result

Local verification passed. Proceed to deploy and live acceptance.
