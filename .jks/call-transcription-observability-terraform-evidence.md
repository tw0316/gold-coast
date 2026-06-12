# Call Transcription Observability Terraform Evidence

Date: 2026-05-21
Slice: `slice-2-terraform-alert-wiring`
Status: completed locally, pending owner integration review

## Scope

Assigned write scope:
- `infra/data-lake-refresh/main.tf`
- `infra/data-lake-refresh/variables.tf`
- `infra/data-lake-refresh/prod.tfvars.example`
- `.jks/call-transcription-observability-terraform-evidence.md`

Guardrails:
- No Terraform apply.
- No AWS mutation, Docker, provider calls, or secret value handling.
- No schedule cadence, transcription generation, transcript table grain, or core refresh behavior changes.

## Initial Findings

- Core refresh already has `alert_mode`, `success_alert_until`, `ALERT_MODE`, `SUCCESS_ALERT_UNTIL`, `SLACK_WEBHOOK_URL`, and matching lifecycle preconditions.
- Transcription task currently has no alert mode variables, no alert env vars, and no Slack webhook secret injection.
- Transcription execution role currently only reads the optional OpenAI transcription secret.

## Commands Run

- `sed -n '1,220p' /Users/jarvis/.openclaw/workspace/skills/development/SKILL.md`
- `sed -n '1,220p' /Users/jarvis/.openclaw/workspace/memory/2026-05-21.md`
- `sed -n '1,220p' /Users/jarvis/.openclaw/workspace/memory/2026-05-20.md`
- `git status --short`
- `sed -n '1,220p' GOAL.md`
- `sed -n '1,260p' goal-state.json`
- `sed -n '1,260p' /Users/jarvis/.openclaw/workspace/epics/active/gold-coast-call-transcription-observability-v1-1.md`
- `sed -n '1,220p' AGENTS.md`
- `sed -n '1,260p' infra/data-lake-refresh/variables.tf`
- `sed -n '1,360p' infra/data-lake-refresh/main.tf`
- `sed -n '360,760p' infra/data-lake-refresh/main.tf`
- `sed -n '1,220p' infra/data-lake-refresh/prod.tfvars.example`
- `rg -n "alert_mode|success_alert_until|SLACK_WEBHOOK_URL|ALERT_MODE|SUCCESS_ALERT_UNTIL|transcription" infra/data-lake-refresh/main.tf infra/data-lake-refresh/variables.tf infra/data-lake-refresh/prod.tfvars.example`

## Planned Changes

- Add `transcription_alert_mode` and `transcription_success_alert_until` variables.
- Add transcription locals for alert enabled state and Slack webhook secret configuration.
- Add transcription-specific lifecycle preconditions.
- Inject transcription `ALERT_MODE`, `SUCCESS_ALERT_UNTIL`, and conditional `SLACK_WEBHOOK_URL`.
- Add conditional execution-role permission to read the Slack webhook secret.
- Update `prod.tfvars.example` to show separate core and transcription alert settings.

## Changes Made

- `infra/data-lake-refresh/variables.tf`
  - Added `transcription_alert_mode`, default `failure-only`.
  - Added `transcription_success_alert_until`, default `null`.
  - Kept existing core refresh `alert_mode` and `success_alert_until` variables unchanged.
- `infra/data-lake-refresh/main.tf`
  - Added transcription alert locals.
  - Added conditional transcription execution-role permission for the Gold Coast tech-alerts Slack webhook secret.
  - Added transcription task preconditions:
    - `slack_webhook_secret_arn` required when `transcription_alert_mode != "off"`.
    - `transcription_success_alert_until` required when `transcription_alert_mode == "launch-window"`.
  - Injected transcription `ALERT_MODE` and `SUCCESS_ALERT_UNTIL` env vars.
  - Injected transcription `SLACK_WEBHOOK_URL` from the existing Slack webhook secret only when transcription alerting is enabled and the secret ARN is configured.
- `infra/data-lake-refresh/prod.tfvars.example`
  - Split core refresh alert settings from call transcription alert settings.
  - Added transcription launch-window example fields.

Core refresh task env vars, secrets, preconditions, schedule settings, and IAM behavior were not changed.

## Verification

- `terraform fmt -check main.tf variables.tf` passed.
- `terraform validate` passed. Existing `.terraform/` state was present; no `terraform init` was run.
- `git diff --check` passed.
- No Terraform apply, AWS mutation, Docker, provider calls, or secret value handling was performed.

Note: `terraform fmt -check main.tf variables.tf prod.tfvars.example` was attempted first and failed because Terraform fmt only accepts `.tf` and `.tfvars` filenames. The example file uses the existing `.tfvars.example` suffix, so it was reviewed through diff instead of Terraform fmt.

## Additional Commands Run

- `terraform fmt -check main.tf variables.tf prod.tfvars.example`
- `terraform fmt -check main.tf variables.tf`
- `test -d .terraform`
- `terraform validate`
- `git diff --check`
- `git diff -- infra/data-lake-refresh/main.tf infra/data-lake-refresh/variables.tf infra/data-lake-refresh/prod.tfvars.example .jks/call-transcription-observability-terraform-evidence.md`
- `git status --short -- infra/data-lake-refresh/main.tf infra/data-lake-refresh/variables.tf infra/data-lake-refresh/prod.tfvars.example .jks/call-transcription-observability-terraform-evidence.md`
- `git status --short`
- `git diff --stat -- infra/data-lake-refresh/main.tf infra/data-lake-refresh/variables.tf infra/data-lake-refresh/prod.tfvars.example .jks/call-transcription-observability-terraform-evidence.md`
- `sed -n '1,260p' .jks/call-transcription-observability-terraform-evidence.md`
- `sed -n '1,340p' .jks/call-transcription-observability-terraform-evidence.md`
- `git diff -- infra/data-lake-refresh/main.tf infra/data-lake-refresh/variables.tf infra/data-lake-refresh/prod.tfvars.example`
