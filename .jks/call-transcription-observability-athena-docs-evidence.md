# Call Transcription Observability V1.1 - Athena/Smoke/Docs Evidence

Slice: `slice-3-athena-smoke-docs`
Started: 2026-05-21
Project root: `/Users/jarvis/LocalRepos/gold-coast`
Source epic: `/Users/jarvis/.openclaw/workspace/epics/active/gold-coast-call-transcription-observability-v1-1.md`

## Guardrails

- Static inspection only. No AWS, Athena, provider, Slack, secret, transcript, audio, recording URL, contact-example, email, phone, or other PII access.
- Assigned write scope only:
  - new files under `sql/data-lake/ddl/`
  - new files under `sql/data-lake/smoke/`
  - `docs/ops/data-lake/call-transcription-observability.md`
  - `docs/ops/data-lake/run-status-athena-smoke.md`
  - `docs/ops/data-lake/schema.yml`
  - this evidence file
- Do not edit existing runtime Python, Terraform, goal owner state, or existing smoke/DDL files.
- Official operator query surface must be `gold_coast.job_run_status`, filtered by `job_name`.
- Per-job run-status external tables are implementation details only.
- Table locations must point only at historical `runs/` prefixes, not parent prefixes with latest pointer files or JSONL logs.

## Initial Inspection

- Read `GOAL.md`, `goal-state.json`, and the source epic.
- Existing modified files before this slice:
  - `GOAL.md`
  - `goal-state.json`
- Existing unrelated untracked root files before this slice:
  - `.openclaw/`
  - `AGENTS.md`
  - `HEARTBEAT.md`
  - `IDENTITY.md`
  - `SOUL.md`
  - `TOOLS.md`
  - `USER.md`
- Existing DDL:
  - `sql/data-lake/ddl/001_run_status_ghl.sql`
  - `sql/data-lake/ddl/002_call_transcripts.sql`
- Existing smoke SQL:
  - `sql/data-lake/smoke/001_latest_success_freshness.sql`
  - `sql/data-lake/smoke/002_latest_curated_row_availability.sql`
  - `sql/data-lake/smoke/003_critical_table_catalog.sql`
  - `sql/data-lake/smoke/004_v1_1_duplicate_source_ids.sql`
  - `sql/data-lake/smoke/005_call_transcripts.sql`

## Planned Changes

- Add implementation-detail DDL for transcription historical run status under:
  - `s3://gcoffers-data-lake/run-status/ghl-call-transcription/runs/`
- Add shared operator query surface:
  - `gold_coast.job_run_status`
  - includes `job_name`
  - normalizes at least `ghl-refresh` and `ghl-call-transcription`
- Add transcription observability smoke SQL using:
  - `gold_coast.job_run_status`
  - `WHERE job_name = 'ghl-call-transcription'`
- Update operator docs and schema metadata.

## Changed Files

- Added `sql/data-lake/ddl/003_run_status_ghl_call_transcription_raw.sql`
  - Implementation-detail external table.
  - Location is only `s3://gcoffers-data-lake/run-status/ghl-call-transcription/runs/`.
  - Comments explicitly forbid parent prefix use because it contains latest pointer files and JSONL logs.
- Added `sql/data-lake/ddl/004_job_run_status.sql`
  - Shared `gold_coast.job_run_status` view.
  - Adds filterable `job_name`.
  - Normalizes `ghl-refresh` and `ghl-call-transcription`.
- Added `sql/data-lake/smoke/006_transcription_run_status_freshness.sql`
  - Checks latest transcription success freshness through `gold_coast.job_run_status`.
- Added `sql/data-lake/smoke/007_transcription_failure_pending_retry_counts.sql`
  - Checks latest transcription failed/pending retry counts and recent failed runs through `gold_coast.job_run_status`.
- Added `sql/data-lake/smoke/008_transcription_transcript_coverage.sql`
  - Checks eligible recorded-call transcript coverage while anchoring to the latest transcription success through `gold_coast.job_run_status`.
- Added `sql/data-lake/smoke/009_transcription_alert_log_fields.sql`
  - Checks status/log/alert field presence through `gold_coast.job_run_status`.
- Added `docs/ops/data-lake/call-transcription-observability.md`
  - Documents operator query contract, DDL order, alert policy, smoke checks, triage, privacy, and backout.
- Updated `docs/ops/data-lake/run-status-athena-smoke.md`
  - Adds shared operator surface, transcription run-status path contract, DDL order, transcription smoke checks, triage, and privacy constraints.
- Updated `docs/ops/data-lake/schema.yml`
  - Adds `job_run_status` metadata.
  - PII level: `Low/Sanitized metadata`.

## Checks Run

- `git diff --check`
  - Result: passed.
  - Scope note: checked the whole worktree diff, including parallel worker edits outside this slice.
- Static path check:
  - Command pattern: `rg "^LOCATION 's3://gcoffers-data-lake/run-status" sql/data-lake/ddl/001_run_status_ghl.sql sql/data-lake/ddl/003_run_status_ghl_call_transcription_raw.sql`
  - Result: only historical `runs/` locations found:
    - `s3://gcoffers-data-lake/run-status/ghl/runs/`
    - `s3://gcoffers-data-lake/run-status/ghl-call-transcription/runs/`
- Static query-surface check:
  - Confirmed new transcription smoke SQL files query `gold_coast.job_run_status`.
  - Confirmed each new transcription smoke SQL filters `job_name = 'ghl-call-transcription'`.
- Static privacy scans on this slice's changed files:
  - Email regex: no matches.
  - Phone regex: no matches.
  - Slack webhook/token/OpenAI/AWS key patterns: no matches.
  - A broader forbidden-term scan only matched privacy guardrail wording, not actual secrets or PII.

## Verification Not Run

- No AWS commands.
- No Athena execution.
- No provider calls.
- No secret reads.
- No transcript, raw audio, recording URL, contact example, email, phone, or PII access.

## Parallel Worker Changes Observed

These files were modified or added by other workers while this slice was active. They were not edited by this slice:

- `apps/data-lake/src/gold_coast_data_lake/alerts.py`
- `apps/data-lake/src/gold_coast_data_lake/jobs/ghl_call_transcription.py`
- `apps/data-lake/tests/test_alerts.py`
- `apps/data-lake/tests/test_transcription.py`
- `infra/data-lake-refresh/main.tf`
- `infra/data-lake-refresh/variables.tf`
- `infra/data-lake-refresh/prod.tfvars.example`
- `GOAL.md`
- `goal-state.json`
- `.jks/call-transcription-observability-runtime-evidence.md`
- `.jks/call-transcription-observability-terraform-evidence.md`
