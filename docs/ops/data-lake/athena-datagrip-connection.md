# Athena / DataGrip Connection Notes

Status: ready for Tej
Last verified: 2026-05-18

## Connection Values

- Engine: Amazon Athena
- AWS region: us-east-1
- Catalog: AwsDataCatalog
- Database/schema: gold_coast
- Workgroup: gold_coast_data_lake
- Query result location: s3://gcoffers-data-lake/athena-results/
- Data lake bucket: s3://gcoffers-data-lake/
- Local project root: /Users/jarvis/LocalRepos/gold-coast/apps/data-lake
- Source prefixes: raw/ghl/, curated/ghl/, recordings/ghl/, manifests/ghl/, checkpoints/ghl/

## Authentication

- Use the existing local AWS credential flow or a named AWS profile with access to Athena, Glue, and the gcoffers-data-lake S3 bucket.
- Do not paste AWS access keys into this file, Slack, docs, screenshots, or query comments.
- If DataGrip asks for an S3 output location, use the query result location above.
- Keep SSL/TLS enabled. DataGrip and the Athena JDBC driver do this by default.

## Tables

Use the latest snapshot partition unless a query intentionally compares historical snapshots.

- gold_coast.contacts
- gold_coast.opportunities
- gold_coast.messages
- gold_coast.calls
- gold_coast.call_recordings
- gold_coast.mart_lead_response
- gold_coast.mart_rep_activity_daily

## First Smoke Query

~~~sql
SELECT
    count(*) AS lead_count
FROM gold_coast.opportunities
WHERE snapshot_date = (
    SELECT max(snapshot_date)
    FROM gold_coast.opportunities
);
~~~

Expected current result: 120 opportunities in the latest snapshot.

## Query Guardrails

- Run SELECT or WITH queries for business analysis.
- Use the active connection values above for new queries and documentation. Legacy resources are retained only for historical evidence and rollback context.
- Do not create dashboards, QuickSight assets, Superset assets, or scheduled Slack scorecards in MVP.
- Do not use this warehouse for GHL write-back.
- Do not generate transcription, call summaries, or coaching analysis from this dataset in MVP.
- Call recordings are private encrypted S3 objects. Query tables contain metadata and S3 references only, not audio blobs.

## Useful Local References

- Data dictionary: docs/ops/data-lake/data-dictionary.md
- dbt-style schema: docs/ops/data-lake/schema.yml
- Query library: docs/ops/data-lake/query-library.md
- Acceptance SQL: sql/data-lake/acceptance/*.sql
- Raw backfill evidence: docs/ops/data-lake/raw-backfill-evidence.md
- Curated table evidence: docs/ops/data-lake/curated-tables-evidence.md
