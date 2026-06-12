# Call Transcription Artifact Contract Evidence

Created: 2026-05-20T21:35:06-0400

## Scope

Slice: `slice-2-transcript-artifact-contract`

Goal: finalize the transcript artifact contract, Athena DDL, smoke SQL, and ops documentation.

This slice is docs/SQL only. It does not add Python implementation, Terraform, runtime scheduling, OpenAI calls, AWS calls, GHL calls, Slack webhooks, sample transcripts, backfill, summaries, coaching, or CRM extraction.

## Files Changed

- `sql/data-lake/ddl/002_call_transcripts.sql`
- `sql/data-lake/smoke/005_call_transcripts.sql`
- `docs/ops/data-lake/call-transcription.md`
- `.jks/call-transcription-artifact-contract-evidence.md`

Existing unrelated dirty files were not edited by this slice:

- `GOAL.md`
- `goal-state.json`
- `.jks/call-transcription-setup-evidence.md`
- workspace identity/context files copied into the repo worktree

## Contract Decisions

- Athena table name: `gold_coast.call_transcripts`.
- Curated table prefix: `s3://gcoffers-data-lake/curated/ghl/v1_1/core/call_transcripts/`.
- Raw provider artifact prefix: `s3://gcoffers-data-lake/ai-artifacts/ghl/transcripts/v1/`.
- Run-status prefix: `s3://gcoffers-data-lake/run-status/ghl-call-transcription/`.
- Table grain: one current row per `call_message_id`, `recording_sha256`, `artifact_schema_version`, `provider`, and `transcription_model`.
- Allowed statuses: `succeeded`, `failed`, `pending_retry`, `skipped_no_recording`.
- Transcript text is stored in Athena only for the transcript table contract; docs explicitly keep V1 access limited and prohibit raw transcript examples in logs/evidence.
- Provider posture: direct OpenAI API is the planned runtime path, with `gpt-4o-transcribe` as the primary planned model. No Bedrock routing is specified for OpenAI in V1.
- Existing hourly GHL refresh stays upstream and independent. Transcription must be downstream and must not fail, block, roll back, or alter the core refresh.
- No summaries, coaching insights, CRM datapoint extraction, dashboards, Slack scorecards, or GHL write-back were added to the contract.

## Smoke SQL Coverage

`sql/data-lake/smoke/005_call_transcripts.sql` covers:

- duplicate rows at the idempotency grain
- missing idempotency identity fields
- lineage to `gold_coast.calls`
- lineage to `gold_coast.call_recordings`
- non-empty `transcript_text` when `transcription_status = 'succeeded'`
- invalid `transcription_status` values

The smoke query returns counts and statuses only. It does not select transcript text, recording URLs, raw provider payloads, credentials, webhook URLs, or PII examples.

## Checks Run

- `git diff --check`
  - Result: clean.
- `git diff --check --no-index /dev/null sql/data-lake/ddl/002_call_transcripts.sql`
  - Result: no whitespace warnings. Exit code `1` is expected for no-index diff because the file differs from `/dev/null`.
- `git diff --check --no-index /dev/null sql/data-lake/smoke/005_call_transcripts.sql`
  - Result: no whitespace warnings. Exit code `1` is expected for no-index diff because the file differs from `/dev/null`.
- `git diff --check --no-index /dev/null docs/ops/data-lake/call-transcription.md`
  - Result: no whitespace warnings. Exit code `1` is expected for no-index diff because the file differs from `/dev/null`.
- `git diff --check --no-index /dev/null .jks/call-transcription-artifact-contract-evidence.md`
  - Result: no whitespace warnings. Exit code `1` is expected for no-index diff because the file differs from `/dev/null`.
- Direct text inspection with `sed -n` for:
  - `sql/data-lake/ddl/002_call_transcripts.sql`
  - `sql/data-lake/smoke/005_call_transcripts.sql`
  - `docs/ops/data-lake/call-transcription.md`
  - `.jks/call-transcription-artifact-contract-evidence.md`

No cloud execution was run. No Athena execution was run. No external services were called.

## Blockers

- Real OpenAI sample transcription, sample quality review, full backfill, and recurring runtime remain blocked until an approved OpenAI API key secret exists in the approved runtime secret path.
- This slice intentionally does not update `goal-state.json`; the JKS owner should reconcile slice state after reviewing these artifacts.
