# Final Acceptance Evidence

Status: completed
Resource verification: 2026-05-18T14:06:40Z
Fresh post-migration acceptance run: 2026-05-18T14:50:43Z

## Current Migration State

The Gold Coast data lake now uses source-agnostic AWS and local naming while preserving GHL as the first source namespace.

- Local project root: `/Users/jarvis/LocalRepos/gold-coast/apps/data-lake`
- S3 bucket: `gcoffers-data-lake`
- Glue database: `gold_coast`
- Athena workgroup: `gold_coast_data_lake`
- Athena results: `s3://gcoffers-data-lake/athena-results/`
- Source prefixes: `raw/ghl/`, `curated/ghl/`, `recordings/ghl/`, `manifests/ghl/`, `checkpoints/ghl/`

Fresh full acceptance against `gold_coast_data_lake` / `gold_coast` passed. The SQL files in `sql/data-lake/acceptance/` target `gold_coast.<table>`.

## Legacy Resources Retained

These resources were retained for historical evidence and rollback context. They were not deleted during the migration.

- Legacy S3 bucket: `gcoffers-ghl-data-lake`
- Legacy Glue database: `gold_coast_ghl`
- Legacy Athena workgroup: `gold_coast_ghl_data_lake`

Use the current migration-state values above for new queries, docs, and DataGrip connections.

## AWS Foundation

- Region: us-east-1
- S3 bucket: `gcoffers-data-lake`
- Athena workgroup: `gold_coast_data_lake`
- Glue database: `gold_coast`
- Athena results: `s3://gcoffers-data-lake/athena-results/`
- Controls verified: public access block, SSE-S3 encryption, versioning, bucket-owner-enforced object ownership, Athena encrypted query results, 1 GB per-query scan cutoff.

See `docs/ops/data-lake/aws-rehome-evidence.md` for the AWS rehome verification commands, row-count query, and object-copy reconciliation.

## Raw Backfill

The GHL source backfill was copied into the source-agnostic lake without deleting the retained legacy bucket.

- Manifest: `s3://gcoffers-data-lake/manifests/ghl/run=20260518T080441Z.json`
- Raw JSONL objects: 6
- Raw bytes: 2,392,941
- Checkpoint objects: 6
- Contacts: 175
- Pipelines: 2
- Opportunities: 120
- Conversations: 200
- Messages: 1,547
- Call message details: 193
- Recording attempts: 193
- Recordings archived: 157
- Recordings unavailable: 36
- Recording bytes archived: 282,680,390
- Sample recording encryption: AES256
- Sample recording content type: audio/x-wav

## Curated Tables

- Snapshot date: 2026-05-18
- Parquet objects: 7
- Parquet bytes: 742,483
- Glue tables: 7
- Partition key: snapshot_date
- Format: Parquet with Snappy compression
- Curated prefix: `s3://gcoffers-data-lake/curated/ghl/`

Tables:

- `gold_coast.contacts`
- `gold_coast.opportunities`
- `gold_coast.messages`
- `gold_coast.calls`
- `gold_coast.call_recordings`
- `gold_coast.mart_lead_response`
- `gold_coast.mart_rep_activity_daily`

## Current AWS Verification

The AWS rehome slice verified row counts through Athena against the new workgroup and database.

- Workgroup: `gold_coast_data_lake`
- Database: `gold_coast`
- Verification query ID: `ca9325b7-8fd2-4755-8fff-02778a79dc9e`

| Table | Rows |
| --- | ---: |
| call_recordings | 193 |
| calls | 193 |
| contacts | 175 |
| mart_lead_response | 120 |
| mart_rep_activity_daily | 115 |
| messages | 1,547 |
| opportunities | 120 |

## Acceptance SQL

Current acceptance SQL is source-agnostic at the database layer and keeps GHL only as the source namespace in data paths and semantics.

- Active database: `gold_coast`
- Active workgroup: `gold_coast_data_lake`
- SQL path: `sql/data-lake/acceptance/*.sql`
- Fresh 15-query acceptance run: passed, 15/15 succeeded
- Fresh total scan: 401,941 bytes
- Fresh Athena results: `s3://gcoffers-data-lake/athena-results/`

Fresh post-migration acceptance execution IDs:

| AQ | File | Query execution ID | State | Bytes scanned |
|----|------|--------------------|-------|---------------|
| AQ-001 | sql/data-lake/acceptance/001_aq_001_new_seller_leads_by_day_source.sql | d4d739e0-97d2-4e99-aa6a-64a17af3d3f8 | SUCCEEDED | 1,367 |
| AQ-002 | sql/data-lake/acceptance/002_aq_002_speed_to_first_touch.sql | e87cb373-8768-4bb0-87f0-1139d0c5cf3a | SUCCEEDED | 8,306 |
| AQ-002A | sql/data-lake/acceptance/003_aq_002a_speed_to_first_phone_call.sql | 0ae6d75a-ed80-4d30-80de-3e300db80cb9 | SUCCEEDED | 8,427 |
| AQ-003 | sql/data-lake/acceptance/004_aq_003_contact_rate_by_source_user.sql | 268d6040-fda5-428e-b216-4f3e78a8a87a | SUCCEEDED | 6,300 |
| AQ-004 | sql/data-lake/acceptance/005_aq_004_call_activity_by_user_day.sql | 2029f37c-76ff-4022-91ad-cef6cdb873f3 | SUCCEEDED | 4,538 |
| AQ-005 | sql/data-lake/acceptance/006_aq_005_sms_activity_by_user_day.sql | 0c19427b-2598-4799-84c2-d3ec6b374e51 | SUCCEEDED | 18,330 |
| AQ-006 | sql/data-lake/acceptance/007_aq_006_no_outbound_touch_sla.sql | 35886bd5-c206-40d4-bb2b-72c0d1c24d57 | SUCCEEDED | 13,088 |
| AQ-007 | sql/data-lake/acceptance/008_aq_007_long_calls_with_recordings.sql | 7d2a9957-2537-4b45-8cfc-1497235aeed9 | SUCCEEDED | 32,824 |
| AQ-008 | sql/data-lake/acceptance/009_aq_008_appointment_set_rate.sql | a56d424a-16bb-4bc2-94a5-8f78088e0fc1 | SUCCEEDED | 47,093 |
| AQ-009 | sql/data-lake/acceptance/010_aq_009_follow_up_needed_no_subsequent_touch.sql | 463a0d7d-fc97-4758-ba80-7d5558426278 | SUCCEEDED | 230,159 |
| AQ-010 | sql/data-lake/acceptance/011_aq_010_call_outcomes_metadata_only.sql | bb7e192a-9794-47ea-ac2c-3f76aab2692a | SUCCEEDED | 2,884 |
| AQ-011 | sql/data-lake/acceptance/012_aq_011_avg_speed_to_lead_by_day.sql | 21ab8144-c8f5-4dac-bdbc-723ecde10114 | SUCCEEDED | 9,230 |
| AQ-012 | sql/data-lake/acceptance/013_aq_012_busiest_lead_arrival_windows.sql | 63cbb3fe-fd3d-4eeb-9e73-e25076ec4c93 | SUCCEEDED | 1,246 |
| AQ-013 | sql/data-lake/acceptance/014_aq_013_calls_per_day_per_agent.sql | c41c8e3d-dd0f-4a25-b652-4422f385c4f1 | SUCCEEDED | 4,538 |
| AQ-014 | sql/data-lake/acceptance/015_aq_014_actor_vs_owner_call_activity.sql | f9bb4aec-ebcb-400d-9a77-62c8bf18ebbe | SUCCEEDED | 13,611 |

## Guardrails Preserved

- No GHL writes.
- No transcription.
- No call summaries.
- No coaching analysis.
- No dashboards, QuickSight, Superset, or scheduled Slack scorecards.
- No credentials stored in project docs.
- No legacy AWS resources were deleted.
- Call recordings are private encrypted S3 objects only.
- Migration driver/reporter crons were disabled after the final Slack closeout.

## Handoff

- Start with `docs/ops/data-lake/query-library.md` for business questions.
- Use `docs/ops/data-lake/data-dictionary.md` and `docs/ops/data-lake/schema.yml` to generate or review SQL.
- Use `docs/ops/data-lake/athena-datagrip-connection.md` to connect DataGrip or another Athena client.
- Raw and curated historical evidence docs remain in `docs/ops/data-lake/raw-backfill-evidence.md` and `docs/ops/data-lake/curated-tables-evidence.md`.
- Use the fresh post-migration acceptance run above as the migration completion evidence.

## Deferred

- Recurring scheduled ingestion.
- Dispositions-specific reporting once Dispo data exists.
- Dashboards or scorecards.
- Transcription, call summaries, and coaching analysis.
- Multi-user access controls beyond Tej-approved contexts.
