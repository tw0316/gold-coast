# Gold Coast Data Lake V1.1 Approved Cleanup Evidence

Status: completed

Approval: Tej approved old V1 cleanup in Slack thread #jarvis-development `1779234305.097569` at 2026-05-19 20:52 ET and explicitly asked to execute it using JKS.

## Scope

Deleted only the documented old V1 generated snapshot prefixes and old partitioned Glue tables from `docs/ops/data-lake/v1-1-cleanup-plan.md`.

No bucket-wide purge was run.

## Pre-Delete Validation

Live V1.1 state before cleanup:

- EventBridge schedule: `gold-coast-data-lake-ghl-refresh`
- State: `ENABLED`
- Schedule expression: `rate(1 hour)`
- Task definition: `gold-coast-data-lake-ghl-refresh:7`
- Running ECS tasks before cleanup: none

Old V1 S3 objects found by dry-run:

- `curated/ghl/contacts/`: 25
- `curated/ghl/opportunities/`: 25
- `curated/ghl/messages/`: 25
- `curated/ghl/calls/`: 25
- `curated/ghl/call_recordings/`: 25
- `curated/ghl/opportunity_stage_history/`: 24
- `curated/ghl/mart_lead_response/`: 25
- `curated/ghl/mart_rep_activity_daily/`: 25

Total approved current objects deleted: 199.

Old Glue table locations were validated before deletion:

- `gold_coast.contacts` -> `s3://gcoffers-data-lake/curated/ghl/contacts/`
- `gold_coast.opportunities` -> `s3://gcoffers-data-lake/curated/ghl/opportunities/`
- `gold_coast.mart_lead_response` -> `s3://gcoffers-data-lake/curated/ghl/mart_lead_response/`
- `gold_coast.mart_rep_activity_daily` -> `s3://gcoffers-data-lake/curated/ghl/mart_rep_activity_daily/`

## Actions Executed

S3 current-object deletion:

- `aws s3 rm s3://gcoffers-data-lake/curated/ghl/contacts/ --recursive`
- `aws s3 rm s3://gcoffers-data-lake/curated/ghl/opportunities/ --recursive`
- `aws s3 rm s3://gcoffers-data-lake/curated/ghl/messages/ --recursive`
- `aws s3 rm s3://gcoffers-data-lake/curated/ghl/calls/ --recursive`
- `aws s3 rm s3://gcoffers-data-lake/curated/ghl/call_recordings/ --recursive`
- `aws s3 rm s3://gcoffers-data-lake/curated/ghl/opportunity_stage_history/ --recursive`
- `aws s3 rm s3://gcoffers-data-lake/curated/ghl/mart_lead_response/ --recursive`
- `aws s3 rm s3://gcoffers-data-lake/curated/ghl/mart_rep_activity_daily/ --recursive`

Glue table deletion:

- `aws glue delete-table --database-name gold_coast --name contacts`
- `aws glue delete-table --database-name gold_coast --name opportunities`
- `aws glue delete-table --database-name gold_coast --name mart_lead_response`
- `aws glue delete-table --database-name gold_coast --name mart_rep_activity_daily`

## Post-Delete Verification

All old V1 prefixes now list zero current objects:

- `curated/ghl/contacts/`: 0
- `curated/ghl/opportunities/`: 0
- `curated/ghl/messages/`: 0
- `curated/ghl/calls/`: 0
- `curated/ghl/call_recordings/`: 0
- `curated/ghl/opportunity_stage_history/`: 0
- `curated/ghl/mart_lead_response/`: 0
- `curated/ghl/mart_rep_activity_daily/`: 0

Remaining `gold_coast` tables are the V1.1 core/query tables:

- `call_recordings`
- `calls`
- `contacts_latest`
- `messages`
- `opportunities_latest`
- `opportunity_stage_history`
- `run_status_ghl`

Remaining `gold_coast_reporting` tables are:

- `lead_response`
- `rep_activity_daily`

## Post-Cleanup Smoke

All checked-in V1.1 smoke SQL passed after cleanup:

- `001_latest_success_freshness.sql`: `db1becc0-9014-42c5-8f22-3bfa0390c58e`
- `002_latest_curated_row_availability.sql`: `9f5b2648-a5c1-41b7-a432-3c63a6208fe1`
- `003_critical_table_catalog.sql`: `4f7500e2-82c8-4105-b29f-023503ea5591`
- `004_v1_1_duplicate_source_ids.sql`: `757d458e-b3c4-4411-aa75-5ea98f3f4576`

Latest-success remained valid:

- Run ID: `20260520T004655Z`
- Image: `25d481057420fb09abfa71b2be8f0aa0f0514061`
- Status: `succeeded`

## Post-Cleanup Reconciliation Follow-Up

Tej asked whether the cleanup validation was strong enough. The owner reran a deeper live reconciliation at 2026-05-19 21:24-21:27 ET.

Latest successful run-status row:

- Run ID: `20260520T004655Z`
- Manifest: `s3://gcoffers-data-lake/manifests/ghl/run=20260520T004655Z.json`
- Snapshot date: `2026-05-20`
- Snapshot at: `2026-05-20T00:48:58.075894Z`
- In-run smoke: `athena_curated_snapshot:passed`
- Query ID: `684d0a17-30d8-4bbf-97f9-f9d1ffda365f`

Manifest and raw JSONL line counts matched:

- `contacts`: manifest 181, raw lines 181, Athena `contacts_latest` 181
- `opportunities`: manifest 125, raw lines 125, Athena `opportunities_latest` 125
- `messages`: manifest 2,444, raw lines 2,444, Athena `messages` 2,444
- `call_message_details`: manifest 276, raw lines 276, Athena `calls` 276 and `call_recordings` 276
- `conversations`: manifest 153, raw lines 153
- `pipelines`: manifest 2, raw lines 2
- Recordings: 276 attempts, 222 `skipped_existing`, 54 `unavailable`

Published table grain and raw-id checks passed:

- `contacts_latest.contact_id`, `opportunities_latest.opportunity_id`, `messages.message_id`, and `calls.call_message_id` all matched their embedded `raw_json.id` values with zero mismatches.
- Query ID: `e853c273-e0bf-4f29-987c-e7d7c950785f`
- Core/reporting duplicate/null-key smoke across all eight query tables passed.
- Query ID: `a5ccb1f5-e8ae-40f8-a4aa-8a10e0f059bd`

Derived-table consistency checks passed:

- `lead_response` rows matched `opportunities_latest`: 125 vs 125.
- `call_recordings` rows matched `calls`: 276 vs 276.
- `opportunity_stage_history` covered all current opportunities: 125 vs 125.
- Latest stage-history state matched current opportunity stage/status for all 125 opportunities with zero missing history, stage ID mismatches, stage name mismatches, or status mismatches.
- `rep_activity_daily.calls_total` matched calls with dates: 276 vs 276.
- `rep_activity_daily.messages_total` matched non-call messages with dates: 2,168 vs 2,168. The remaining 276 `messages` rows are `TYPE_CALL` and are intentionally represented in `calls`, not counted as messages in the rep activity mart.
- Query IDs: `bddb3e92-5459-4b99-8b9f-3fda3c2b1fc0`, `39166bcf-07bc-4de3-a5e8-5bca1393a5b2`, `6f2859dd-f5c6-443a-9fdd-82384cc1498c`

All checked-in acceptance SQL files passed after cleanup:

- `001_aq_001_new_seller_leads_by_day_source.sql`: `b7d57b45-91c3-4c75-b608-ee8846c67515`
- `002_aq_002_speed_to_first_touch.sql`: `4f886d48-b171-4604-81eb-2f9a35eb3bbd`
- `003_aq_002a_speed_to_first_phone_call.sql`: `e0546458-3f6d-411f-a671-89e5ba100f83`
- `004_aq_003_contact_rate_by_source_user.sql`: `0b1e2e4a-b080-4a12-af83-b4d0bbf2fef3`
- `005_aq_004_call_activity_by_user_day.sql`: `a6629ace-fd25-407c-acee-16f9bb650794`
- `006_aq_005_sms_activity_by_user_day.sql`: `a8ec3e17-48d2-4842-9eb0-aff74facc3bf`
- `007_aq_006_no_outbound_touch_sla.sql`: `e1c4e59f-a3d6-4428-b963-1a3ae7af08b3`
- `008_aq_007_long_calls_with_recordings.sql`: `b679674a-58d1-4109-9105-50296edf2bef`
- `009_aq_008_appointment_set_rate.sql`: `33a38c4a-f526-40e3-a002-0b2994e6d327`
- `010_aq_009_follow_up_needed_no_subsequent_touch.sql`: `c2352b38-bc9e-4d24-8c6f-679982de1640`
- `011_aq_010_call_outcomes_metadata_only.sql`: `9f85f144-2cf8-4a40-b297-d56ccea30f71`
- `012_aq_011_avg_speed_to_lead_by_day.sql`: `8b845cc2-fc06-4d95-aabc-2ae78125fd98`
- `013_aq_012_busiest_lead_arrival_windows.sql`: `fc2cc5b4-3567-4edc-a722-5e5c58ab0660`
- `014_aq_013_calls_per_day_per_agent.sql`: `30055ec7-bee6-4289-84ea-d8ef2b18a1c3`
- `015_aq_014_actor_vs_owner_call_activity.sql`: `f0205857-1cff-4a1a-8e27-02319374e80a`

S3 surface check passed:

- `curated/ghl/` now contains only `v1_1/`.
- `curated/ghl/v1_1/core/` contains the six core query-table prefixes.
- `curated/ghl/v1_1/reporting/` contains the two reporting mart prefixes.
- `snapshots/ghl/daily/` remains present for internal audit snapshots.

## Guardrails

- No GHL writes.
- No blind S3 bucket purge.
- No deletion outside documented old V1 prefixes.
- No deletion of V1.1 `curated/ghl/v1_1/` outputs.
- No deletion of `snapshots/ghl/daily/`.
- No deletion of `recordings/ghl/`, `manifests/ghl/`, `checkpoints/ghl/`, or `run-status/ghl/`.
- No dashboards, transcription, coaching artifacts, website leads, or marketing sources added.
