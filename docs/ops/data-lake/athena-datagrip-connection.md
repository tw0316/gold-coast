# Athena / DataGrip Connection Notes

Status: V1.1 ready
Last updated: 2026-05-19

## Connection Values

- Engine: Amazon Athena
- AWS region: us-east-1
- Catalog: AwsDataCatalog
- Core database/schema: gold_coast
- Reporting database/schema: gold_coast_reporting
- Workgroup: gold_coast_data_lake
- Query result location: s3://gcoffers-data-lake/athena-results/
- Data lake bucket: s3://gcoffers-data-lake/
- Local project root: /Users/jarvis/LocalRepos/gold-coast/apps/data-lake

## Tables

Use gold_coast for entity/event exploration:

- gold_coast.contacts_latest
- gold_coast.opportunities_latest
- gold_coast.messages
- gold_coast.calls
- gold_coast.call_recordings
- gold_coast.opportunity_stage_history

Use gold_coast_reporting for repeated business metrics:

- gold_coast_reporting.lead_response
- gold_coast_reporting.rep_activity_daily

Do not filter normal V1.1 queries by snapshot_date or run_id. Those fields are observability metadata, not the default query contract.

## First Smoke Query

~~~sql
SELECT
    count(*) AS lead_count
FROM gold_coast.opportunities_latest;
~~~

## Query Guardrails

- Run SELECT or WITH queries for business analysis.
- Do not query internal daily snapshots unless the task is explicitly audit or recovery work.
- Do not create dashboards, QuickSight assets, Superset assets, or scheduled Slack scorecards in V1.1.
- Do not use this warehouse for GHL write-back.
- Do not generate transcription, call summaries, or coaching analysis from this dataset.
- Call recordings are private encrypted S3 objects. Query tables contain metadata and S3 references only, not audio blobs.

## Useful Local References

- Data dictionary: docs/ops/data-lake/data-dictionary.md
- dbt-style schema: docs/ops/data-lake/schema.yml
- Query library: docs/ops/data-lake/query-library.md
- Acceptance SQL: sql/data-lake/acceptance/*.sql
- Smoke SQL: sql/data-lake/smoke/*.sql
