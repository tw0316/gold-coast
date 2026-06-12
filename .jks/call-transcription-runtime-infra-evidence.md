# Call Transcription Runtime Infrastructure Evidence

Created: 2026-05-20T22:10:00-04:00

## Scope

Slice: `slice-4-runtime-infrastructure`

Goal: add disabled Fargate runtime wiring for downstream GHL call transcription: ECS task definition, IAM, OpenAI secret contract, separate lock name, CloudWatch logs, run-status contract, docs, and evidence.

This slice does not run Terraform apply, AWS CLI, OpenAI, GHL, Slack webhook calls, Docker build/push, real sample transcription, backfill, recurring enablement, summaries, coaching insights, CRM datapoint extraction, dashboards, Slack scorecards, or GHL write-back.

## Files Changed

- `infra/data-lake-refresh/main.tf`
- `infra/data-lake-refresh/variables.tf`
- `infra/data-lake-refresh/prod.tfvars.example`
- `apps/data-lake/src/gold_coast_data_lake/jobs/ghl_call_transcription.py`
- `docs/ops/data-lake/call-transcription.md`
- `docs/ops/data-lake/fargate-refresh-runtime.md`
- `docs/ops/data-lake/batch-runner.md`
- `goal-state.json`
- `.jks/call-transcription-runtime-infra-evidence.md`

Existing unrelated dirty worktree entries were not reverted or overwritten.

## Decisions

- Added a separate ECS task definition, `gold-coast-data-lake-ghl-call-transcription`, using the existing data-lake image.
- Preserved the Dockerfile and existing refresh runtime behavior. The transcription task overrides ECS `entryPoint` to `python -m gold_coast_data_lake.jobs.ghl_call_transcription`.
- Added a separate transcription task execution role and task role. The existing refresh execution/task roles were not given OpenAI access.
- Added optional `openai_transcription_secret_arn`. The execution role can read that secret only when configured.
- Added a Terraform precondition so the transcription schedule cannot be enabled with `provider=openai` unless the OpenAI secret ARN is configured.
- Added `transcription_schedule_enabled=false` by default and a separate disabled EventBridge schedule. The core `schedule_enabled` refresh flag remains unchanged.
- Added bounded runtime variables for schedule expression, max transcriptions per run, artifact schema version, provider, primary model, and fallback model.
- Scoped the transcription task role to read archived recordings and read/write only transcript artifacts, transcript curated output, transcription run status, Athena results, Glue/Athena transcript-table operations, and the `ghl-call-transcription` DynamoDB lock key.
- Used the existing lock table with a separate lock name, `ghl-call-transcription`, so transcription overlap protection does not use the core `ghl-refresh` lock name.
- Updated the transcription CLI to accept the Terraform runtime-contract flags:
  - `--status-s3-bucket`
  - `--status-s3-prefix`
  - `--lock-table-name`
  - `--lock-name`
  - `--source-environment`
  - `--image-tag`
  - `--glue-database`
  - `--athena-workgroup`
- Kept execution safe. The CLI records sanitized status/lock/runtime metadata and still stops before real transcription selection/provider execution.
- Added optional S3 run-status publishing for execute mode only. Dry-run/sample mode does not publish even when status S3 args are provided.

## Checks Run

- `terraform fmt -recursive infra/data-lake-refresh`
  - Result: formatted `infra/data-lake-refresh/main.tf`.
- `terraform -chdir=infra/data-lake-refresh init -backend=false`
  - Result: succeeded using the previously installed `hashicorp/aws v5.100.0` provider.
- `terraform -chdir=infra/data-lake-refresh validate`
  - Result: success, configuration is valid.
- `terraform fmt -check -recursive infra/data-lake-refresh`
  - Result: passed.
- `PYTHONPATH=apps/data-lake/src python3 -m unittest discover apps/data-lake/tests`
  - Result: 62 tests run, 61 passed, 1 skipped for the existing local `pyarrow` skip.
- `PYTHONPATH=src python3 -m gold_coast_data_lake.jobs.ghl_call_transcription --help`
  - Result: help output includes all Terraform runtime-contract args listed above.
- Safe CLI compatibility check from `apps/data-lake`:
  - Command shape matched Terraform flags but used `--sample`, not `--execute`, to avoid DynamoDB/S3/OpenAI/GHL calls.
  - Result: succeeded and wrote sanitized local status to `/tmp/gc-transcription-runtime-contract-check/run-status/ghl-call-transcription/runs/run=runtime-contract-check/status.json`.
  - Verified status payload includes `status_s3_configured`, `source_environment`, `image_tag`, `glue_database`, `athena_workgroup`, and lock metadata.
- `git diff --check`
  - Result: clean for tracked-file diffs.
- `git diff --check --no-index /dev/null apps/data-lake/src/gold_coast_data_lake/jobs/ghl_call_transcription.py`
  - Result: no whitespace warnings. Exit code `1` is expected for no-index diff because the file differs from `/dev/null`.
- `git diff --check --no-index /dev/null docs/ops/data-lake/call-transcription.md`
  - Result: no whitespace warnings. Exit code `1` is expected for no-index diff because the file differs from `/dev/null`.
- `git diff --check --no-index /dev/null .jks/call-transcription-runtime-infra-evidence.md`
  - Result: no whitespace warnings. Exit code `1` is expected for no-index diff because the file differs from `/dev/null`.
- Scoped leak scan across slice-4 Terraform, Python, docs, goal-state, and evidence files for OpenAI key-like strings, Slack webhook URLs/tokens, bearer auth strings, and literal env assignment leaks.
  - Result: clean. No credential/webhook token matches.
- `python3 -m json.tool goal-state.json`
  - Result: valid JSON.

## Blockers

- Real sample transcription, sample quality review, backfill, and recurring enablement remain blocked until an approved OpenAI API key is stored in the approved Secrets Manager path.
- Runtime selection from Athena/S3 and curated Parquet publish remain for later slices.
- No production schedule was enabled.
