# Gold Coast Data Lake V1.1 Validation Reconciliation Evidence

Status: completed, cleanup blocked pending explicit approval

Epic: /Users/jarvis/.openclaw/workspace/epics/active/gold-coast-data-lake-v1-1-incremental-correction.md

Repo: /Users/jarvis/LocalRepos/gold-coast

## Summary

V1.1 was already built and live. This JKS pass validated the repo, docs, runtime state, Athena query surface, and guardrails, then patched narrow repo-side validation gaps.

## Live Production State Verified

- EventBridge schedule: gold-coast-data-lake-ghl-refresh.
- Schedule state: ENABLED.
- Schedule expression: rate(1 hour).
- Target task definition: gold-coast-data-lake-ghl-refresh:6.
- Image tag: d3656922160254c2a1efa1fd15b951ce41c2166f.
- Latest-success run: 20260520T002801Z.
- Latest-success status: succeeded.
- Latest-success snapshot_at: 2026-05-20T00:30:07.032117Z.

## Current Query Surface Verified

Core first-class tables in gold_coast:

- contacts_latest
- opportunities_latest
- messages
- calls
- call_recordings
- opportunity_stage_history
- run_status_ghl

Reporting marts in gold_coast_reporting:

- lead_response
- rep_activity_daily

V1.1 row availability smoke passed for all core/reporting query tables. Latest live counts observed:

- contacts_latest: 181
- opportunities_latest: 125
- messages: 2444
- calls: 276
- call_recordings: 276
- opportunity_stage_history: 125
- lead_response: 125
- rep_activity_daily: 140

## Verification Commands

Local verification passed:

- git diff --check
- python compileall for apps/data-lake/src and apps/data-lake/scripts
- PYTHONPATH=apps/data-lake/src pytest apps/data-lake/tests, 53 passed
- terraform -chdir=infra/data-lake-refresh init -backend=false -input=false
- terraform -chdir=infra/data-lake-refresh fmt -check
- terraform -chdir=infra/data-lake-refresh validate

Read-only AWS/Athena verification passed:

- aws scheduler get-schedule confirmed ENABLED rate(1 hour).
- aws ecs describe-task-definition confirmed rev 6 image d3656922160254c2a1efa1fd15b951ce41c2166f.
- aws glue get-tables confirmed V1.1 core/reporting table locations.
- latest-success status confirmed passed in-run smoke.
- All 4 checked-in smoke SQL files succeeded.
- All 15 checked-in acceptance SQL files succeeded.

Smoke query IDs from this validation pass:

- 001_latest_success_freshness.sql: cc8c99d8-6333-4bcf-abd6-e896523f727f.
- 002_latest_curated_row_availability.sql: 9d9a424e-5ebc-4bc8-870c-607c5c455000.
- 003_critical_table_catalog.sql: 06ee62b8-ef72-411f-9114-571e685cc3bf.
- Final patched 004_v1_1_duplicate_source_ids.sql: 5beb0092-457d-4e84-b7e0-44d5372db2ef.

## Patches Accepted

- Added checked-in and runtime duplicate/grain smoke coverage for:
  - opportunity_stage_history.transition_key
  - gold_coast_reporting.lead_response.opportunity_id
  - gold_coast_reporting.rep_activity_daily(activity_date, actor_user_id)
- Added tests for reporting duplicate/grain smoke coverage.
- Added docs/ops/data-lake/athena-mcp-guidance.md.
- Updated apps/data-lake/README.md so it no longer says production refresh infrastructure is absent.
- Updated docs/ops/data-lake/batch-runner.md so execute-mode diagnostic status-upload behavior matches current code.
- Updated GOAL.md and goal-state.json from the old 30-minute batch-refresh goal to the V1.1 validation/correction goal.

## Guardrails Confirmed

- No GHL write path was added or run.
- No S3 purge was run.
- No Glue table cleanup was run.
- Old V1 generated snapshot prefixes remain in S3.
- Cleanup remains blocked until Tej explicitly approves deletion.
- No dashboards, transcription, coaching artifacts, website leads, or marketing sources were added.

## Remaining Approval Gate

Cleanup is the only remaining gate. The candidate cleanup paths remain documented in docs/ops/data-lake/v1-1-cleanup-plan.md and must not be executed without explicit Tej approval.
+
## 2026-05-19 20:51 ET Rev 7 Runtime Smoke Hardening Deploy

After repo validation found reporting mart grain checks were not explicit in runtime smoke, the runtime smoke checker was hardened and shipped.

Commit/image:

- Commit: 25d481057420fb09abfa71b2be8f0aa0f0514061.
- Image: 108750423275.dkr.ecr.us-east-1.amazonaws.com/gold-coast-data-lake:25d481057420fb09abfa71b2be8f0aa0f0514061.
- ECS task definition: gold-coast-data-lake-ghl-refresh:7.
- EventBridge schedule: ENABLED at rate(1 hour).

Deploy verification:

- Docker ARM64 build passed.
- ECR push passed.
- Terraform apply updated the scheduler target from task definition rev 6 to rev 7.
- Manual production ECS run succeeded: task arn:aws:ecs:us-east-1:108750423275:task/gold-coast-data-lake/836a8de8ef7a4277bd685a91e2058eb6.
- Manual run ID: 20260520T004655Z.
- Latest-success status: succeeded.
- Snapshot at: 2026-05-20T00:48:58.075894Z.

Live in-run duplicate/grain smoke passed with zero duplicate/null keys for:

- contacts_latest.contact_id
- opportunities_latest.opportunity_id
- messages.message_id
- calls.call_message_id
- call_recordings.message_id
- opportunity_stage_history.transition_key
- lead_response.opportunity_id
- rep_activity_daily.activity_date+actor_user_id

Cleanup remains approval-gated. No S3 deletion or Glue cleanup was run.

