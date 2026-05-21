# Call Transcription Engine Evidence

Created: 2026-05-20T21:47:13-0400

## Scope

Slice: `slice-3-transcription-engine`

Goal: implement local transcription helpers, direct OpenAI provider wrapper, idempotency/artifact builders, safe CLI skeleton, and focused tests.

This slice does not call AWS, OpenAI, GHL, Slack webhooks, or any external service. It does not modify Terraform, production scheduling, the hourly GHL refresh, summaries, coaching insights, CRM extraction, dashboards, Slack scorecards, or GHL write-back.

## Files Changed

- `apps/data-lake/src/gold_coast_data_lake/transcription.py`
- `apps/data-lake/src/gold_coast_data_lake/jobs/ghl_call_transcription.py`
- `apps/data-lake/tests/test_transcription.py`
- `apps/data-lake/pyproject.toml`
- `goal-state.json`
- `.jks/call-transcription-engine-evidence.md`

Existing unrelated dirty files were not reverted or overwritten:

- `GOAL.md`
- `.jks/call-transcription-artifact-contract-evidence.md`
- `.jks/call-transcription-setup-evidence.md`
- workspace identity/context files copied into the repo worktree
- slice-2 SQL/docs artifacts

## Decisions

- Idempotency source string is `call_message_id|recording_sha256|artifact_schema_version|provider|transcription_model`; stored idempotency key is the SHA-256 hex digest of that source.
- Raw transcript artifact keys follow the slice-2 contract under `ai-artifacts/ghl/transcripts/<schema>/message_id=<id>/recording_sha256=<sha>/provider=<provider>/model=<model>/run=<run_id>.json`.
- S3 recording download uses injected S3 clients in tests and lazy boto3 only when no client is supplied. The helper does not log or print bucket/key/S3 URI values.
- OpenAI wrapper imports `openai` lazily only when a real default client is built. Tests inject fake clients, so no OpenAI package import or network call is required.
- Fallback path follows the Janus posture: primary `gpt-4o-transcribe`, fallback `whisper-1`, long-audio cutoff `1380` seconds, and ffmpeg MP3 transcode helper for long audio.
- Short primary provider failures retry once with the fallback model and sanitized failure metadata.
- Transcript row builder returns columns matching `sql/data-lake/ddl/002_call_transcripts.sql`, including lineage, provider metadata, usage/error JSON, attempts, run IDs, and timestamps.
- CLI skeleton supports the requested flags and writes only sanitized local run-status skeletons in dry-run/sample mode.
- `--execute` fails before runtime work when OpenAI credentials are missing. It also remains intentionally non-executing in this slice even if a key exists.
- Added `openai>=1.0` to package dependencies for later runtime packaging without requiring OpenAI at import time.
- Updated `goal-state.json` only for slice-3 completion state and evidence references.

## Checks Run

- `PYTHONPATH=apps/data-lake/src python3 -m unittest apps/data-lake/tests/test_transcription.py`
  - Result: 9 passed.
- `PYTHONPATH=apps/data-lake/src python3 -m unittest discover apps/data-lake/tests`
  - Result: 62 tests run, 61 passed, 1 skipped for the existing local `pyarrow` skip.
- `python3 -m json.tool goal-state.json >/tmp/gold-coast-goal-state.json.check`
  - Result: valid JSON.
- `PYTHONPATH=apps/data-lake/src python3 -m gold_coast_data_lake.jobs.ghl_call_transcription --help`
  - Result: CLI argument surface loads successfully without provider or cloud calls.
- `git diff --check`
  - Result: clean.
- `git diff --check --no-index /dev/null apps/data-lake/src/gold_coast_data_lake/transcription.py`
  - Result: no whitespace warnings. Exit code `1` is expected for no-index diff because the file differs from `/dev/null`.
- `git diff --check --no-index /dev/null apps/data-lake/src/gold_coast_data_lake/jobs/ghl_call_transcription.py`
  - Result: no whitespace warnings. Exit code `1` is expected for no-index diff because the file differs from `/dev/null`.
- `git diff --check --no-index /dev/null apps/data-lake/tests/test_transcription.py`
  - Result: no whitespace warnings. Exit code `1` is expected for no-index diff because the file differs from `/dev/null`.
- `git diff --check --no-index /dev/null .jks/call-transcription-engine-evidence.md`
  - Result: no whitespace warnings. Exit code `1` is expected for no-index diff because the file differs from `/dev/null`.

## Blockers

- Real OpenAI sample transcription, sample quality review, full backfill, and recurring runtime remain blocked until an approved OpenAI API key secret exists in the approved runtime secret path.
- Runtime selection from Athena/S3, curated Parquet publish, Glue/Athena updates, Fargate/IAM/Secrets Manager wiring, and production scheduling remain for later slices.
