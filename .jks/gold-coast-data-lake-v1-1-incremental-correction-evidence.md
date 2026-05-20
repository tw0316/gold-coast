# Gold Coast Data Lake V1.1 Incremental Correction Evidence

Status: complete, cleanup blocked pending explicit approval

Epic: /Users/jarvis/.openclaw/workspace/epics/active/gold-coast-data-lake-v1-1-incremental-correction.md

Commit: d3656922160254c2a1efa1fd15b951ce41c2166f
Image: 108750423275.dkr.ecr.us-east-1.amazonaws.com/gold-coast-data-lake:d3656922160254c2a1efa1fd15b951ce41c2166f

## Guardrails

- No GHL writes added or run.
- No S3 purge or Glue cleanup executed.
- Old generated V1 snapshot data remains in S3.
- Cleanup is documented as dry-run only until explicit Tej approval.
- No dashboards, transcription, coaching artifacts, website leads, or marketing sources added.

## Baseline

- EventBridge schedule was disabled before V1.1 deploy.
- Pre-cutover schedule expression was rate(30 minutes).
- Terraform state initially had schedule_enabled=true, so V1.1 deploy explicitly forced schedule_enabled=false before manual validation.

## Local Verification

- Python compile passed for curated.py, smoke.py, ghl_batch_refresh.py, and build_curated_tables.py.
- Unit tests passed: 53 run, 1 skipped for missing local pyarrow.
- git diff --check passed.
- terraform fmt and terraform validate passed.
- Docker ARM64 build passed.
- Container --help smoke passed.

## Infrastructure Deploy

- Terraform applied task definition rev 6 with schedule_enabled=false first.
- Created Glue database gold_coast_reporting.
- Updated scheduler expression to rate(1 hour).
- Added V1.1 IAM coverage for reporting Glue tables and daily snapshot S3 prefix.
- Pushed immutable ECR image for commit d3656922160254c2a1efa1fd15b951ce41c2166f.

## Manual V1.1 Backfill

- Manual ECS task: arn:aws:ecs:us-east-1:108750423275:task/gold-coast-data-lake/40bad28ce0694543a7136462f4930f08
- Task definition: gold-coast-data-lake-ghl-refresh:6
- Exit code: 0
- Run ID: 20260520T000919Z
- Latest-success status: succeeded
- Snapshot at: 2026-05-20T00:11:36.454777Z

Curated row counts:

- contacts_latest: 181
- opportunities_latest: 125
- messages: 2444
- calls: 276
- call_recordings: 276
- opportunity_stage_history: 125
- lead_response: 125
- rep_activity_daily: 140

## Smoke Checks

In-run smoke status: passed.

Checked-in smoke SQL:

- 001_latest_success_freshness.sql: passed, query 85aa0859-1661-4b18-abb3-7e3a601bba21
- 002_latest_curated_row_availability.sql: passed, query 4d7d6971-e838-42c5-b449-8aa1bfdef649
- 003_critical_table_catalog.sql: passed, query 3ad2eb74-8576-4b43-88d9-02e76243c1e3
- 004_v1_1_duplicate_source_ids.sql: passed, query dca99fb6-c3de-48b3-be63-5a311c31d5b8

In-run duplicate check query IDs:

- Freshness: a0756df8-6676-421b-92c8-4158b470effd
- Row availability: 55f586c8-b679-4619-9b4f-28760a8b3bde
- Duplicate stable IDs: 48c2e6eb-9cd7-4f27-9d53-1c1ec3fe797a

## Acceptance SQL

All 15 acceptance SQL files under sql/data-lake/acceptance succeeded against V1.1 core/reporting tables.

Representative query IDs:

- AQ-001: b6c4c4f4-4425-4971-8ae6-f746cec6ef71
- AQ-002: fc9b30bd-34cb-480f-9b81-70adedfb4b17
- AQ-007: 561330e6-57f9-4583-8ac7-3cfde09bed01
- AQ-014: a7ba524f-dbc3-479e-b8d3-b10da625b9b4

## Schedule Cutover

- EventBridge schedule enabled after manual validation.
- Current schedule expression: rate(1 hour).
- Current task definition target: gold-coast-data-lake-ghl-refresh:6.

## First Scheduled Run Verification

- Scheduler-launched ECS task: arn:aws:ecs:us-east-1:108750423275:task/gold-coast-data-lake/ea80596f97f04f2c963f69fdface12d5
- Started by: chronos-schedule/gold-coast-data-lak
- Task definition: gold-coast-data-lake-ghl-refresh:6
- Exit code: 0
- Run ID: 20260520T001540Z
- Latest-success status: succeeded
- Snapshot at: 2026-05-20T00:18:02.141396Z
- In-run smoke status: passed.
- Duplicate stable ID checks: passed.

Scheduled run row counts matched the manual V1.1 backfill:

- contacts_latest: 181
- opportunities_latest: 125
- messages: 2444
- calls: 276
- call_recordings: 276
- opportunity_stage_history: 125
- lead_response: 125
- rep_activity_daily: 140

## Remaining Approval Gate

Old V1 snapshot data remains in place. Cleanup is documented in docs/ops/data-lake/v1-1-cleanup-plan.md and must not be executed until Tej explicitly approves deletion.
