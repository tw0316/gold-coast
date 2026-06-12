# Call Transcription Curated Publish Smoke Evidence

Created: 2026-05-20T22:24:00-04:00

## Scope

Slice: `slice-5-curated-publish-smoke`

Goal: publish support for `gold_coast.call_transcripts`, add acceptance checks, update query-surface docs, and preserve the existing hourly GHL refresh behavior.

This slice does not call AWS, OpenAI, GHL, Slack webhooks, Athena, Docker, Terraform, or any external service. It does not enable schedules, run sample/backfill, implement summaries, coaching insights, CRM extraction, dashboards, Slack scorecards, or GHL write-back.

## Files Changed

- `apps/data-lake/src/gold_coast_data_lake/curated.py`
- `apps/data-lake/tests/test_curated.py`
- `sql/data-lake/acceptance/016_aq_015_call_transcript_coverage_status_lineage.sql`
- `docs/ops/data-lake/schema.yml`
- `docs/ops/data-lake/data-dictionary.md`
- `docs/ops/data-lake/query-library.md`
- `docs/ops/data-lake/call-transcription.md`
- `goal-state.json`
- `.jks/call-transcription-curated-smoke-evidence.md`

Existing dirty worktree changes from prior slices were not reverted or overwritten.

## Decisions

- Added `SCHEMAS["call_transcripts"]` matching the transcript DDL column order and Glue types.
- Kept `call_transcripts` out of `TABLE_ORDER`, `CORE_TABLE_ORDER`, `REPORTING_TABLE_ORDER`, and `DAILY_SNAPSHOT_TABLE_ORDER`.
- Added transcript-specific helpers instead of wiring transcripts into the normal core refresh:
  - `build_call_transcripts_table(rows)`
  - `write_call_transcripts_table(...)`
  - `create_or_update_call_transcripts_glue_table(...)`
- Wrote transcript Parquet output under the core table location: `curated/ghl/v1_1/core/call_transcripts/`.
- Added current-row dedupe for the transcript idempotency grain: `call_message_id`, `recording_sha256`, `artifact_schema_version`, `provider`, `transcription_model`.
- Fixed the owner-reviewed `attempt_count` write-path bug by adding logical `int` support to `arrow_type()` with `pa.int32()`.
- Added focused tests proving:
  - `call_transcripts` is not in normal `TABLE_ORDER`.
  - the transcript schema matches `TRANSCRIPT_ROW_COLUMNS`.
  - logical `int` resolves to `pa.int32()`.
  - transcript rows dedupe to the latest idempotency row.
  - transcript table writes to the core location and round-trips when pyarrow is available.
  - the Glue helper uses the core `gold_coast` table location.
- Added acceptance SQL for coverage, allowed status distribution, status validity, and lineage to calls/recordings. It returns counts/statuses only and does not select transcript text.
- Updated docs to describe `gold_coast.call_transcripts` as a downstream transcription table, not an hourly GHL refresh output.

## Checks Run

- `PYTHONPATH=apps/data-lake/src python3 -m unittest apps/data-lake/tests/test_curated.py apps/data-lake/tests/test_transcription.py`
  - Result: 22 tests run, 20 passed, 2 skipped because local pyarrow is not installed.
- `PYTHONPATH=apps/data-lake/src python3 -m unittest discover apps/data-lake/tests`
  - Result: 66 tests run, 64 passed, 2 skipped because local pyarrow is not installed.
- `git diff --check`
  - Result: passed.
- Scoped transcript/credential leak scan across slice-5 changed files.
  - Result: clean for credential-looking strings, webhook URLs, bearer tokens, raw transcript fixtures, recording URLs, and presigned URLs.

## Blockers

- Local pyarrow is not installed, so Parquet round-trip tests are present but skipped in this environment. The `int -> pa.int32()` mapping is still covered by a fake-pyarrow unit test.
- Real sample transcription, backfill, Athena smoke execution, and recurring enablement remain blocked until an approved OpenAI API key secret exists and Tej approves the next gates.
