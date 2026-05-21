# Call Transcription Final Acceptance Evidence

Date: 2026-05-21

Scope: enable recurring production transcription after Tej approval, verify transcript coverage, verify the separate core GHL refresh remains healthy, and close the JKS goal.

## Approval

- Tej approved wrapping up pending items in Slack thread `1779326885.613529` on 2026-05-21.
- Scope of approval used here: enable the recurring transcription schedule, run controlled smoke checks, update final evidence/state, and close the epic.

## Production Deployment

- Docker image pushed to ECR:
  - Repository: `108750423275.dkr.ecr.us-east-1.amazonaws.com/gold-coast-data-lake`
  - Tag: `0ac834a4c160b7a6736e8610bf7ec92e5a3a47a4`
  - Digest: `sha256:64eb7bed9cceffc5a25523fd2c0c9920ce96b4c2fcaedf8996226d14233aec9b`
- Terraform apply enabled recurring transcription:
  - Transcription task definition: `arn:aws:ecs:us-east-1:108750423275:task-definition/gold-coast-data-lake-ghl-call-transcription:1`
  - Transcription schedule: `gold-coast-data-lake-ghl-call-transcription`
  - Transcription schedule state: `ENABLED`
  - Transcription schedule expression: `rate(1 hour)`
  - Core refresh task definition advanced to `arn:aws:ecs:us-east-1:108750423275:task-definition/gold-coast-data-lake-ghl-refresh:8`
  - Core refresh schedule remains `ENABLED` at `rate(1 hour)`
- Scheduled transcription command is bounded:
  - `--max-calls 10`
  - `--max-transcriptions-per-run 10`

## Deployment Fixes Caught During Smoke

- First controlled ECS transcription smoke exposed an IAM scope gap:
  - Run ID: `recurring-smoke-20260521T1258Z`
  - ECS task: `arn:aws:ecs:us-east-1:108750423275:task/gold-coast-data-lake/ccbaa127a7af40b3b9c57a007f44a039`
  - Result: exit 1, sanitized `AthenaQueryError`, selected 0 calls.
- Root cause:
  - The transcription task role could write transcript outputs, but Athena source selection also needed S3 read access to curated source tables for `calls`, `call_recordings`, and `opportunities_latest`.
- Fix:
  - Added scoped read access for:
    - `curated/ghl/v1_1/core/calls/*`
    - `curated/ghl/v1_1/core/call_recordings/*`
    - `curated/ghl/v1_1/core/opportunities_latest/*`
  - Terraform apply changed the transcription task IAM policy only.

## Recurring Transcription Smoke

- Controlled run ID: `recurring-smoke-20260521T1302Z`
- ECS task: `arn:aws:ecs:us-east-1:108750423275:task/gold-coast-data-lake/e59d7e36eb76405ba103a173bf8fb3ee`
- ECS result: exit 0.
- Sanitized S3 run status:
  - `status`: `succeeded`
  - `existing_rows_loaded`: 263
  - `selected_calls`: 0
  - `attempted`: 0
  - `succeeded`: 0
  - `failed`: 0
  - `pending_retry`: 0
  - `curated_rows_submitted`: 263
  - Published row count: 263
- Interpretation:
  - The recurring job starts cleanly, takes the DynamoDB lock, reads Athena/source data, skips already covered calls, and republishes the transcript table without retranscribing existing calls.

## Transcript Table Verification

- Athena smoke query:
  - Query ID: `4801cd07-6dae-4061-9c1d-293f1d301fe5`
  - SQL file: `sql/data-lake/smoke/005_call_transcripts.sql`
  - Result: 5 of 5 checks passed.
- Smoke checks passed:
  - Duplicate idempotency grain: 263 inspected, 0 failed.
  - Invalid status: 263 inspected, 0 failed.
  - Lineage to calls: 263 inspected, 0 failed.
  - Lineage to recordings: 263 inspected, 0 failed.
  - Succeeded transcript non-empty: 263 inspected, 0 failed.
- Count query:
  - Query ID: `4b1c6480-50bc-4f43-baaf-6a89e63322e4`
  - `row_count`: 263
  - `succeeded_count`: 263
  - `failed_count`: 0
  - `pending_retry_count`: 0
- Coverage query:
  - Query ID: `ea83a814-723f-4b43-8e96-c6e5badec14c`
  - `eligible_calls`: 263
  - `succeeded_covered_calls`: 263
  - `remaining_calls`: 0

## Core Refresh Health

- Core refresh schedule:
  - Name: `gold-coast-data-lake-ghl-refresh`
  - State: `ENABLED`
  - Expression: `rate(1 hour)`
  - Task definition: `arn:aws:ecs:us-east-1:108750423275:task-definition/gold-coast-data-lake-ghl-refresh:8`
- Manual ECS core refresh smoke:
  - Run ID: `20260521T130422Z`
  - ECS task: `arn:aws:ecs:us-east-1:108750423275:task/gold-coast-data-lake/d7c5ce8de1bf41b7bf5565bb2ba90fc1`
  - ECS result: exit 0.
  - Latest success pointer published: true.
  - In-run Athena smoke: passed.
  - Curated tables: 8.
- Latest row availability counts from in-run smoke:
  - `gold_coast.contacts_latest`: 185
  - `gold_coast.opportunities_latest`: 129
  - `gold_coast.opportunity_stage_history`: 136
  - `gold_coast.messages`: 2536
  - `gold_coast.calls`: 326
  - `gold_coast.call_recordings`: 326
  - `gold_coast_reporting.lead_response`: 129
  - `gold_coast_reporting.rep_activity_daily`: 144

## Local Verification

- Full data-lake unit suite passed before deploy:
  - Command: `PYTHONPATH=apps/data-lake/src apps/data-lake/.venv/bin/python -m unittest discover apps/data-lake/tests`
  - Result: 72 tests passed.
- Terraform checks passed before apply:
  - `terraform fmt -check`
  - `terraform validate`
- Diff and state checks passed:
  - `git diff --check`
  - `python3 -m json.tool goal-state.json`
- Secret/transcript handling:
  - No OpenAI key value, Slack webhook value, transcript text, raw audio, recording URL, provider payload, or raw PII was written to Slack, evidence, docs, or committed code.

## Acceptance Result

- All archived eligible recorded calls are covered: 263 of 263.
- Recurring transcription is live and bounded hourly.
- Existing hourly GHL refresh remains live and healthy.
- Final status: completed.
