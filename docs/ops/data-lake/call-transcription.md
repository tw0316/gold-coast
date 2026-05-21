# Gold Coast Call Transcription Contract

Status: live production transcription foundation

Scope: transcript storage/query contract, transcript-specific curated publish helpers, acceptance SQL, Fargate runtime wiring, bounded backfill, and recurring production transcription. This document does not include summaries, coaching, CRM extraction, dashboards, Slack scorecards, or GHL write-back.

## Table Contract

Athena table: `gold_coast.call_transcripts`

DDL: `sql/data-lake/ddl/002_call_transcripts.sql`

Curated S3 prefix:

```text
s3://gcoffers-data-lake/curated/ghl/v1_1/core/call_transcripts/
```

Table grain:

- One current row per `call_message_id`, `recording_sha256`, `artifact_schema_version`, `provider`, and `transcription_model`.
- Rows with `transcription_status = 'skipped_no_recording'` may have no `recording_sha256`.
- Retries update the current row for the same idempotency grain. Immutable per-run provider artifacts remain in S3 for audit.
- A new row is expected when the recording checksum changes, the artifact schema version changes, or the transcription model changes.

Allowed `transcription_status` values:

- `succeeded`
- `failed`
- `pending_retry`
- `skipped_no_recording`

Required lineage fields:

- `call_message_id`
- `conversation_id`
- `contact_id`
- `opportunity_id` when available
- `recording_s3_uri`
- `recording_object_key`
- `recording_sha256`
- `source_call_run_id`
- `source_recording_run_id`
- `source_call_snapshot_at`
- `source_recording_snapshot_at`
- `run_id`
- `snapshot_at`

Transcript fields:

- `transcript_text` stores the full transcript for successful rows.
- `transcript_segments_json` stores provider segment output when available.
- `language` stores provider language detection when available.
- `usage_json` stores provider usage metadata when available.
- `error_json` stores sanitized failure metadata for failed or retryable rows.

Provider contract:

- V1 provider is the direct OpenAI API from the transcription runtime.
- Primary model is `gpt-4o-transcribe`, with `whisper-1` fallback for long or failed uploads.
- OpenAI is not routed through Bedrock in V1.
- Runtime provider execution is live in the recurring transcription ECS task. The OpenAI key is injected from AWS Secrets Manager.

## Fargate Runtime

Terraform path:

```text
infra/data-lake-refresh/
```

Runtime resources:

- ECS task definition: `<name-prefix>-ghl-call-transcription`
- Container name: `ghl-call-transcription`
- CloudWatch log group: `/gold-coast/data-lake/<environment>/ghl-call-transcription`
- EventBridge schedule: `<name-prefix>-ghl-call-transcription`
- DynamoDB lock table: existing data-lake lock table, separate lock item name `ghl-call-transcription`

The Docker image is the same `apps/data-lake` image used by the core refresh task. The transcription task overrides the ECS container entry point so it calls the transcription module instead of the refresh module:

```text
python -m gold_coast_data_lake.jobs.ghl_call_transcription
```

Terraform passes the runtime command shape:

```text
--execute
--s3-bucket gcoffers-data-lake
--status-s3-bucket gcoffers-data-lake
--status-s3-prefix run-status/ghl-call-transcription
--max-calls <bounded_limit>
--max-transcriptions-per-run <bounded_limit>
--artifact-schema-version v1
--provider openai
--model gpt-4o-transcribe
--fallback-model whisper-1
--openai-secret-id goldcoast/openai-api-key
--lock-table-name <data-lake-lock-table>
--lock-name ghl-call-transcription
```

The core hourly GHL refresh task definition, command, secrets, and schedule remain separate.

## Secret Contract

Secret values must stay in AWS Secrets Manager. Do not put secret values in tfvars, docs, logs, run status, evidence, or Slack.

Terraform variable:

```text
openai_transcription_secret_arn
```

Container secret name:

```text
OPENAI_API_KEY
```

Manual sample runs may instead pass the approved Secrets Manager id with:

```text
--openai-secret-id goldcoast/openai-api-key
```

The runtime reads the secret value in process and does not write the secret id value, secret value, or provider credential to run status.

The transcription execution role can read the OpenAI secret only when `openai_transcription_secret_arn` is configured. Terraform also blocks enabling the transcription schedule with `provider=openai` unless the ARN is present.

## IAM Scope

The transcription task uses separate task execution and task roles from the core refresh task.

Execution role:

- Pulls the existing data-lake image and writes ECS logs through the managed ECS task execution policy.
- Reads the OpenAI transcription secret only when configured.
- Does not receive GHL or Slack webhook secrets.

Task role:

- Reads archived private recordings under `recordings/ghl/*`.
- Reads/writes transcript provider artifacts under `ai-artifacts/ghl/transcripts/*`.
- Reads/writes curated transcript output under `curated/ghl/v1_1/core/call_transcripts/*`.
- Writes run status under `run-status/ghl-call-transcription/*`.
- Reads/writes Athena result objects under `athena-results/*`.
- Uses Glue/Athena only for the Gold Coast database/workgroup needed by the transcript table flow.
- Uses the shared DynamoDB lock table but is scoped to the `ghl-call-transcription` partition key.

It must not receive write permission to `recordings/ghl/*`, raw GHL extraction prefixes, GHL checkpoints, GHL manifests, Slack webhooks, or GHL API secrets.

## Schedule

Terraform variables:

```text
transcription_schedule_enabled = true
transcription_schedule_expression = "rate(1 hour)"
transcription_max_transcriptions_per_run = 10
```

Production state as of 2026-05-21:

- Schedule: `gold-coast-data-lake-ghl-call-transcription`
- State: `ENABLED`
- Expression: `rate(1 hour)`
- Task definition: `gold-coast-data-lake-ghl-call-transcription:1`
- Runtime bounds: 10 selected calls and 10 new transcription provider calls per run.

The recurring schedule was enabled only after the OpenAI key existed in Secrets Manager, bounded sample runs passed, the throttled backfill completed, and Tej approved wrapping up recurring operation.

## Logs And Run Status

Routine logs go to the transcription CloudWatch log group. Logs must not include raw transcripts, recording URLs, credentials, request bodies, or PII examples.

Run status path:

```text
s3://gcoffers-data-lake/run-status/ghl-call-transcription/
  runs/run=<run_id>/status.json
  latest-success.json
  latest-failure.json
```

Run status is sanitized and count/status oriented. It may include provider, model, artifact schema version, lock metadata, selected/skipped/attempted/succeeded/failed counts, and sanitized errors. It must not include transcript text, raw provider payloads, raw audio data, recording URLs, webhook URLs, API keys, or raw contact examples.

## S3 Artifact Layout

Existing archived recording source:

```text
s3://gcoffers-data-lake/recordings/ghl/message_id=<call_message_id>.<ext>
```

Raw transcript provider artifacts:

```text
s3://gcoffers-data-lake/ai-artifacts/ghl/transcripts/v1/
  message_id=<call_message_id>/
  recording_sha256=<recording_sha256>/
  provider=<provider>/
  model=<transcription_model>/
  run=<run_id>.json
```

Curated Athena table output:

```text
s3://gcoffers-data-lake/curated/ghl/v1_1/core/call_transcripts/
```

Transcription run status:

```text
s3://gcoffers-data-lake/run-status/ghl-call-transcription/
  runs/run=<run_id>/status.json
  latest-success.json
  latest-failure.json
```

The raw provider artifact may contain full transcript text and provider payloads. It must stay private and must not be used as an Athena table location. The curated table is the query surface.

## Curated Publish

Transcript table publishing is intentionally separate from the normal GHL curated refresh.

`apps/data-lake/src/gold_coast_data_lake/curated.py` exposes transcript-specific helpers:

- `build_call_transcripts_table(rows)`
- `write_call_transcripts_table(...)`
- `create_or_update_call_transcripts_glue_table(...)`

`gold_coast.call_transcripts` is registered in `SCHEMAS`, but it is not in `TABLE_ORDER`, `CORE_TABLE_ORDER`, `REPORTING_TABLE_ORDER`, or `DAILY_SNAPSHOT_TABLE_ORDER`.

This matters because the hourly GHL refresh builds current core tables from raw GHL manifests. It does not produce transcript rows, so adding `call_transcripts` to the normal table order would risk overwriting real transcript output with an empty Parquet file.

Expected curated output:

```text
s3://gcoffers-data-lake/curated/ghl/v1_1/core/call_transcripts/part-00000.parquet
```

The Glue helper uses the core database `gold_coast` and the table location above. It does not touch reporting tables or daily audit snapshots.

## Lineage

The transcript table joins to existing V1.1 tables as follows:

```sql
gold_coast.call_transcripts.call_message_id = gold_coast.calls.call_message_id
gold_coast.call_transcripts.call_message_id = gold_coast.call_recordings.message_id
gold_coast.call_transcripts.recording_sha256 = gold_coast.call_recordings.sha256
gold_coast.call_transcripts.recording_object_key = gold_coast.call_recordings.object_key
```

The transcription job must read audio from the archived private S3 object referenced by `gold_coast.call_recordings`, not from GHL recording URLs.

The existing hourly GHL refresh remains the source of calls and recording archives. Transcription is downstream and must not fail, roll back, block, or change that refresh contract.

## Privacy Guardrails

Call transcripts are high-PII seller data.

Required guardrails:

- Do not write raw transcripts to Slack, routine logs, evidence files, commits, or screenshots.
- Do not store raw audio bytes, GHL recording URLs, presigned URLs, OpenAI API keys, GHL credentials, or webhook URLs in docs or run status.
- Keep transcript access limited to Tej/Jarvis in V1.
- Store audio and transcript artifacts in private S3 only.
- Sanitize `error_json` so provider errors do not include transcript text, recording URLs, headers, keys, or raw request bodies.
- Use counts, IDs, statuses, and checksum lineage in smoke checks. Do not print transcript snippets as proof.

## Sample, Backfill, And Recurring Flow

The pipeline supports bounded samples, throttled backfill, and recurring hourly incremental runs.

Runtime behavior:

1. Select archived recordings from Athena using `gold_coast.calls` joined to `gold_coast.call_recordings`.
2. Require `has_recording=true` and a non-null archived `object_key`.
3. Skip existing successful transcript rows at the current idempotency grain.
4. Download the private S3 recording object from `recordings/ghl/...`.
5. Compute missing content type, byte count, and SHA-256 from the S3 download when curated metadata is null.
6. Call the direct OpenAI provider wrapper.
7. Upload the raw provider artifact JSON to `ai-artifacts/ghl/transcripts/...`.
8. Write curated `call_transcripts` Parquet with the existing helper and update/create the Glue table.
9. Write sanitized run status to S3.

Owner one-call sample command template:

```text
cd /Users/jarvis/LocalRepos/gold-coast/apps/data-lake
PYTHONPATH=src \
python -m gold_coast_data_lake.jobs.ghl_call_transcription \
  --execute \
  --sample \
  --max-calls 1 \
  --max-transcriptions-per-run 1 \
  --s3-bucket gcoffers-data-lake \
  --status-s3-bucket gcoffers-data-lake \
  --status-s3-prefix run-status/ghl-call-transcription \
  --artifact-schema-version v1 \
  --provider openai \
  --model gpt-4o-transcribe \
  --fallback-model whisper-1 \
  --openai-secret-id goldcoast/openai-api-key \
  --lock-table-name <data-lake-lock-table> \
  --lock-name ghl-call-transcription
```

This command reads the approved OpenAI secret from AWS Secrets Manager. If running inside ECS with task secret injection, `OPENAI_API_KEY` or `OPENAI_TRANSCRIPTION_API_KEY` is also supported and the `--openai-secret-id` flag is not required.

Do not print or paste transcript text after the sample. Review quality directly from the private S3 artifact or Athena table in an approved operator context.

Production acceptance as of 2026-05-21:

- One-call sample `sample-20260520T2258Z`: succeeded.
- Longer sample `long-sample-20260520T2320Z`: succeeded on a 318-second call.
- Throttled backfill: 261 additional calls succeeded, 0 failed, 0 pending retry.
- Final table count: 263 rows, 263 succeeded.
- Final coverage: 263 eligible recorded calls, 263 covered, 0 remaining.
- Recurring smoke `recurring-smoke-20260521T1302Z`: exited 0, skipped already covered calls, and republished 263 curated rows.

## Idempotency

The idempotency grain is:

```text
call_message_id | recording_sha256 | artifact_schema_version | provider | transcription_model
```

Rules:

- If a row already exists for the idempotency grain with `transcription_status = 'succeeded'`, the runtime should skip transcription.
- If the same grain is `pending_retry`, the runtime may retry and update the same current row.
- If the same grain is `failed`, the runtime may retry only under explicit retry policy and update the same current row.
- If `recording_sha256` changes, treat the recording as a new source artifact and produce a new row.
- If `artifact_schema_version` or `transcription_model` changes, produce a new row.
- Keep raw provider artifacts immutable by `run_id`; keep Athena rows current by idempotency grain.

## Smoke SQL

Smoke file:

```text
sql/data-lake/smoke/005_call_transcripts.sql
```

Acceptance file:

```text
sql/data-lake/acceptance/016_aq_015_call_transcript_coverage_status_lineage.sql
```

Checks:

- duplicate rows at the idempotency grain
- lineage to `gold_coast.calls`
- lineage to `gold_coast.call_recordings`
- non-empty `transcript_text` when `transcription_status = 'succeeded'`
- invalid `transcription_status` values
- coverage of recorded calls by transcript rows
- status distribution for succeeded, failed, pending_retry, and skipped_no_recording rows

The smoke and acceptance queries return counts/statuses only. Acceptance SQL must not select transcript text. Neither query should expose transcript text, recording URLs, raw provider payloads, or PII samples.

## Backout

Backout is isolated from the core hourly refresh:

1. Keep or set `transcription_schedule_enabled=false`.
2. Disable the EventBridge schedule `<name-prefix>-ghl-call-transcription` if an emergency manual stop is needed.
3. Stop launching one-off transcription tasks.
4. Leave existing archived recordings, core GHL refresh schedules, raw GHL extracts, and existing V1.1 curated tables alone.
5. If a bad transcript table publish occurs, correct or revert only the transcript table/prefix after preserving evidence. Do not delete core call or recording archive data.

The existing GHL refresh schedule remains controlled by `schedule_enabled` and `schedule_expression`; those are separate from transcription.

## Known Limitations

- No speaker diarization contract is guaranteed in V1. Provider segments are stored as JSON when available.
- No summaries, coaching insights, CRM datapoint extraction, dashboards, Slack scorecards, or GHL write-back are in scope.
- The transcript table stores full text in Athena, so access control matters more than for metadata-only call tables.
