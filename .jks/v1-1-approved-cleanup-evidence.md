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

## Guardrails

- No GHL writes.
- No blind S3 bucket purge.
- No deletion outside documented old V1 prefixes.
- No deletion of V1.1 `curated/ghl/v1_1/` outputs.
- No deletion of `snapshots/ghl/daily/`.
- No deletion of `recordings/ghl/`, `manifests/ghl/`, `checkpoints/ghl/`, or `run-status/ghl/`.
- No dashboards, transcription, coaching artifacts, website leads, or marketing sources added.

