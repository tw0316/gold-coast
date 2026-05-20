# Gold Coast Data Lake V1.1 Code/Docs Validation

Status: PASS with minor follow-up gaps

Validation role: read-only JKS validation worker. No repo implementation files were edited, no GHL writes were run, no S3 cleanup was run, no schedule/deploy action was run, and no commit/push was made.

## Executive Finding

The checked-in implementation, docs, SQL, tests, Terraform, and V1.1 evidence substantially match the V1.1 epic requirements and guardrails.

Core curated Athena tables are first-class in code and docs: gold_coast.contacts_latest, gold_coast.opportunities_latest, gold_coast.messages, gold_coast.calls, gold_coast.call_recordings, and gold_coast.opportunity_stage_history.

gold_coast_reporting is positioned as a metric/mart namespace, not the only query surface: gold_coast_reporting.lead_response and gold_coast_reporting.rep_activity_daily.

No blocking code/doc gap was found for event-safe calls/messages, latest-state contacts/opportunities, stage/status transition history, daily audit snapshots, hourly schedule config, or cleanup approval gating.

## Requirement/Guardrail Comparison

| Area | Validation Result |
| --- | --- |
| GHL read-only | PASS. GHLClient only allows GET and raises on non-GET. Extractor uses get_json/download_to_file GET paths. No mutating GHL calls were found in scoped searches. |
| Calls/messages event-safe | PASS. curated.py builds messages keyed by message_id and calls keyed by call_message_id, then dedupes to latest source update. Docs and acceptance SQL query gold_coast.messages/gold_coast.calls directly without run_id filters. |
| Contacts/opportunities latest-state | PASS. curated.py dedupes contacts_latest by contact_id and opportunities_latest by opportunity_id. Docs call them current/latest-state default query tables. |
| Stage/status history | PASS. opportunity_stage_history loads previous table state and appends only when pipeline_id, pipeline_stage_id, or status changes. Tests cover unchanged and changed cases. |
| Daily audit snapshots | PASS. write_daily_audit_snapshots writes internal S3-only daily snapshots under snapshots/ghl/daily. Docs warn they are audit/debug only, not normal query surface. |
| Core curated query contract | PASS. Code separates CORE_TABLE_ORDER from REPORTING_TABLE_ORDER. Docs, schema.yml, acceptance SQL, and smoke SQL make core tables first-class Athena targets. |
| Reporting namespace | PASS. Terraform creates gold_coast_reporting; code routes lead_response and rep_activity_daily there; docs describe it as repeated metric/mart surface. |
| Duplicate prevention | PASS for core source-ID tables. build_curated_tables uses stable-key dedupe and smoke.py checks duplicate/null keys for core current/event tables. |
| Smoke checks | PASS with a minor gap below. In-run smoke checks require freshness, row availability, and duplicate checks. Checked-in smoke SQL covers row/catalog/duplicate checks. |
| Hourly schedule config | PASS. Terraform default schedule_expression is rate(1 hour); prod tfvars example sets schedule_enabled=false and rate(1 hour); evidence says cutover enabled hourly after validation. |
| Cleanup gating | PASS. Cleanup plan is dry-run only and approval-gated. Runtime IAM has s3:GetObject/s3:PutObject only for lake objects, not s3:DeleteObject. |
| Old V1 purge guardrail | PASS. V1.1 evidence says old generated V1 data remains; cleanup remains blocked pending explicit approval. |
| Observability | PASS. run-status DDL, batch runner, docs, smoke status fields, latest pointer rules, image_tag, and CloudWatch URL are present. |
| Cost/no NAT | PASS from docs/Terraform. Fargate uses public subnet assignPublicIp, HTTPS-only egress, no NAT resource in inspected infra files. |

## Minor Follow-Up Gaps

1. Duplicate smoke coverage is core-heavy.
   - Checked-in sql/data-lake/smoke/004_v1_1_duplicate_source_ids.sql checks contacts_latest, opportunities_latest, messages, calls, and call_recordings.
   - In-run smoke.py also checks opportunity_stage_history.transition_key.
   - Neither checked-in SQL nor smoke.py checks reporting mart grains such as gold_coast_reporting.lead_response.opportunity_id or gold_coast_reporting.rep_activity_daily(activity_date, actor_user_id).
   - Not blocking because reporting marts are built from deduped core tables, but REQ-017 says current/reporting duplicate checks should fail on duplicate source IDs.

2. No explicit Athena MCP-specific repo doc was found in the bounded paths.
   - docs/ops/data-lake/athena-datagrip-connection.md, query-library.md, data-dictionary.md, and schema.yml give the correct human/Atlas/LLM query contract.
   - If MCP behavior is expected to be driven from repo docs, add a short Athena MCP guidance doc or section pointing entity/event questions to gold_coast core tables and repeated metrics to gold_coast_reporting.

3. Two small documentation hygiene issues are stale or internally inconsistent.
   - apps/data-lake/README.md still says production recurring refresh infrastructure is not part of the imported app yet.
   - docs/ops/data-lake/batch-runner.md says extractor-dry-run runs never create the status S3 uploader, while current code/tests and run-status-athena-smoke.md allow execute-mode diagnostics, including extractor-dry-run, to upload immutable historical status/log artifacts without publishing latest pointers.

## Specific Slice Checks

### Event-Safe Calls/Messages

- apps/data-lake/src/gold_coast_data_lake/curated.py uses dedupe_latest for messages by message_id and calls by call_message_id.
- apps/data-lake/src/gold_coast_data_lake/extractor.py discovers call message IDs from call-type messages and fetches call detail through GET /conversations/messages/{messageId}.
- tests/test_curated.py verifies duplicate source rows collapse to one latest message/call row.
- sql/data-lake/acceptance includes direct core-table activity queries for calls and messages without run_id, snapshot_date, or COUNT(DISTINCT) workarounds.

### Latest-State Contacts/Opportunities

- contacts_latest and opportunities_latest are stable-key latest-state tables in curated.py.
- docs/ops/data-lake/data-dictionary.md and schema.yml document one row per contact_id/opportunity_id.
- Acceptance SQL uses opportunities_latest as the lead table and contacts_latest for joins.

### Stage/Status History

- build_opportunity_stage_history retains previous rows and appends only on stage/status key change.
- test_stage_history_does_not_append_when_stage_status_is_unchanged and test_stage_history_appends_transition_when_stage_status_changes cover the critical behavior.
- Query docs state historical stage/status movement starts with V1.1 observations unless reconstructed later.

### Daily Snapshots

- write_daily_audit_snapshots writes internal snapshots for contacts_latest, opportunities_latest, messages, calls, and call_recordings under snapshots/ghl/daily/table/snapshot_date=...
- Data dictionary and DataGrip guidance say snapshots are audit/debug only.
- No default Glue table/query guidance points users at daily snapshots.

### Schedule/Cleanup

- infra/data-lake-refresh/variables.tf defaults schedule_enabled=false and schedule_expression=rate(1 hour).
- infra/data-lake-refresh/prod.tfvars.example keeps schedule_enabled=false by default.
- .jks/gold-coast-data-lake-v1-1-incremental-correction-evidence.md records manual V1.1 backfill, smoke pass, acceptance SQL pass, schedule cutover to rate(1 hour), and first scheduled run pass.
- docs/ops/data-lake/v1-1-cleanup-plan.md blocks deletion until explicit Tej approval and lists candidate prefixes/tables only.

## Exact Files Inspected

Epic/evidence:

- /Users/jarvis/.openclaw/workspace/epics/active/gold-coast-data-lake-v1-1-incremental-correction.md
- .jks/gold-coast-data-lake-v1-1-incremental-correction-evidence.md
- .jks/slice-9-athena-smoke-run-status-evidence.md
- .jks/slice-10-enable-schedule-first-run-evidence.md
- .jks/slice-11-final-acceptance-evidence.md

Application code/scripts/tests:

- apps/data-lake/README.md
- apps/data-lake/pyproject.toml
- apps/data-lake/Dockerfile
- apps/data-lake/scripts/build_curated_tables.py
- apps/data-lake/scripts/ghl_extract_raw.py
- apps/data-lake/src/gold_coast_data_lake/config.py
- apps/data-lake/src/gold_coast_data_lake/client.py
- apps/data-lake/src/gold_coast_data_lake/extractor.py
- apps/data-lake/src/gold_coast_data_lake/storage.py
- apps/data-lake/src/gold_coast_data_lake/raw_refresh.py
- apps/data-lake/src/gold_coast_data_lake/curated.py
- apps/data-lake/src/gold_coast_data_lake/smoke.py
- apps/data-lake/src/gold_coast_data_lake/batch.py
- apps/data-lake/src/gold_coast_data_lake/alerts.py
- apps/data-lake/src/gold_coast_data_lake/jobs/ghl_batch_refresh.py
- apps/data-lake/tests/test_curated.py
- apps/data-lake/tests/test_smoke.py
- apps/data-lake/tests/test_extractor.py
- apps/data-lake/tests/test_batch.py

SQL:

- sql/data-lake/ddl/001_run_status_ghl.sql
- sql/data-lake/smoke/001_latest_success_freshness.sql
- sql/data-lake/smoke/002_latest_curated_row_availability.sql
- sql/data-lake/smoke/003_critical_table_catalog.sql
- sql/data-lake/smoke/004_v1_1_duplicate_source_ids.sql
- sql/data-lake/acceptance/001_aq_001_new_seller_leads_by_day_source.sql
- sql/data-lake/acceptance/002_aq_002_speed_to_first_touch.sql
- sql/data-lake/acceptance/003_aq_002a_speed_to_first_phone_call.sql
- sql/data-lake/acceptance/004_aq_003_contact_rate_by_source_user.sql
- sql/data-lake/acceptance/005_aq_004_call_activity_by_user_day.sql
- sql/data-lake/acceptance/006_aq_005_sms_activity_by_user_day.sql
- sql/data-lake/acceptance/007_aq_006_no_outbound_touch_sla.sql
- sql/data-lake/acceptance/008_aq_007_long_calls_with_recordings.sql
- sql/data-lake/acceptance/009_aq_008_appointment_set_rate.sql
- sql/data-lake/acceptance/010_aq_009_follow_up_needed_no_subsequent_touch.sql
- sql/data-lake/acceptance/011_aq_010_call_outcomes_metadata_only.sql
- sql/data-lake/acceptance/012_aq_011_avg_speed_to_lead_by_day.sql
- sql/data-lake/acceptance/013_aq_012_busiest_lead_arrival_windows.sql
- sql/data-lake/acceptance/014_aq_013_calls_per_day_per_agent.sql
- sql/data-lake/acceptance/015_aq_014_actor_vs_owner_call_activity.sql

Docs:

- docs/ops/data-lake/data-dictionary.md
- docs/ops/data-lake/query-library.md
- docs/ops/data-lake/athena-datagrip-connection.md
- docs/ops/data-lake/schema.yml
- docs/ops/data-lake/batch-runner.md
- docs/ops/data-lake/fargate-refresh-runtime.md
- docs/ops/data-lake/run-status-athena-smoke.md
- docs/ops/data-lake/v1-1-cleanup-plan.md

Infrastructure:

- infra/data-lake-refresh/main.tf
- infra/data-lake-refresh/variables.tf
- infra/data-lake-refresh/outputs.tf
- infra/data-lake-refresh/prod.tfvars.example

## Verification Notes

- This was a read-only validation of checked-in code/docs/SQL/tests plus the V1.1 evidence file.
- No unit tests were executed in this worker run to avoid creating local test/cache artifacts.
- No live AWS, Athena, GHL, Slack, deploy, schedule, cleanup, commit, or push action was run.

