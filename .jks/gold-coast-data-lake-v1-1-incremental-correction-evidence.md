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

## 2026-05-19 20:45 ET Validation Reconciliation

Tej requested a rerun of the original prompt as validation-first JKS work because V1.1 was likely already built.

Result: validation passed. No blocking gaps remain.

Additional validation performed:

- Confirmed live EventBridge schedule is ENABLED at rate(1 hour).
- Confirmed live target task definition is gold-coast-data-lake-ghl-refresh:6.
- Confirmed latest-success run 20260520T002801Z succeeded with image d3656922160254c2a1efa1fd15b951ce41c2166f.
- Re-ran all checked-in smoke SQL and all 15 acceptance SQL files against Athena successfully.
- Re-ran local compile, data-lake tests, diff hygiene, and Terraform validation successfully.

Repo reconciliation patches:

- Added runtime and checked-in duplicate/grain smoke checks for opportunity_stage_history.transition_key, lead_response.opportunity_id, and rep_activity_daily(activity_date, actor_user_id).
- Added docs/ops/data-lake/athena-mcp-guidance.md.
- Updated apps/data-lake/README.md and docs/ops/data-lake/batch-runner.md to remove stale V1 wording.
- Updated GOAL.md and goal-state.json to track the V1.1 validation/correction JKS goal instead of the older 30-minute batch-refresh goal.

Final duplicate/grain smoke query:

- 5beb0092-457d-4e84-b7e0-44d5372db2ef, passed with zero duplicate/null keys across core stable IDs and reporting mart grains.

Cleanup remains approval-gated. No S3 deletion or Glue cleanup was run.

## 2026-05-19 21:00 ET Approved Cleanup Completed

Tej explicitly approved the old V1 cleanup in Slack thread `1779234305.097569` and asked that it be executed using JKS.

Cleanup completed:

- Deleted 199 current S3 objects from the documented old V1 generated prefixes under `curated/ghl/{contacts,opportunities,messages,calls,call_recordings,opportunity_stage_history,mart_lead_response,mart_rep_activity_daily}/`.
- Dropped old partitioned Glue tables after validating each location:
  - `gold_coast.contacts`
  - `gold_coast.opportunities`
  - `gold_coast.mart_lead_response`
  - `gold_coast.mart_rep_activity_daily`
- Preserved V1.1 outputs under `curated/ghl/v1_1/`.
- Preserved daily audit snapshots, recordings, manifests, checkpoints, run-status artifacts, and Athena results.

Post-cleanup verification:

- All old V1 prefixes returned zero current objects.
- Remaining `gold_coast` tables are V1.1 core/query tables only.
- Remaining `gold_coast_reporting` tables are `lead_response` and `rep_activity_daily`.
- All four V1.1 smoke SQL files passed after cleanup:
  - `db1becc0-9014-42c5-8f22-3bfa0390c58e`
  - `9f5b2648-a5c1-41b7-a432-3c63a6208fe1`
  - `4f7500e2-82c8-4105-b29f-023503ea5591`
  - `757d458e-b3c4-4411-aa75-5ea98f3f4576`

Evidence: `.jks/v1-1-approved-cleanup-evidence.md`.

## 2026-05-19 20:51 ET Rev 7 Runtime Smoke Hardening Deploy

Runtime smoke hardening was deployed after validation found reporting mart grain checks should be explicit in live in-run smoke, not only operator SQL.

- Commit/image: 25d481057420fb09abfa71b2be8f0aa0f0514061.
- ECS task definition: gold-coast-data-lake-ghl-refresh:7.
- EventBridge schedule: ENABLED at rate(1 hour).
- Manual production run: 20260520T004655Z.
- Latest-success status: succeeded.
- Snapshot at: 2026-05-20T00:48:58.075894Z.
- In-run smoke status: passed.

The live duplicate/grain smoke now checks and passes:

- contacts_latest.contact_id
- opportunities_latest.opportunity_id
- messages.message_id
- calls.call_message_id
- call_recordings.message_id
- opportunity_stage_history.transition_key
- lead_response.opportunity_id
- rep_activity_daily.activity_date+actor_user_id

Cleanup remains approval-gated. No S3 deletion or Glue cleanup was run.
