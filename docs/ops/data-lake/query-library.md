# Gold Coast Data Lake Query Library

Core database: gold_coast

Reporting database: gold_coast_reporting

SQL dialect: Athena/Presto

Acceptance query location: sql/data-lake/acceptance/

Smoke query location: sql/data-lake/smoke/

Athena workgroup: gold_coast_data_lake

MCP/LLM guidance: docs/ops/data-lake/athena-mcp-guidance.md

## Usage Rules

- Queries are read-only and start from SELECT or WITH.
- Core entity/event questions should use gold_coast tables directly.
- Repeated metric questions should use gold_coast_reporting marts.
- Do not add snapshot_date, run_id, or COUNT(DISTINCT ...) workarounds to normal V1.1 questions.
- Lead means GHL opportunity.
- Speed-to-lead starts at gold_coast.opportunities_latest.created_at, exposed as gold_coast_reporting.lead_response.lead_created_at.
- Activity attribution uses event actor_user_id from calls/messages, not current opportunity owner.
- Recording fields are metadata only. Audio remains private encrypted S3 object storage.
- No query uses transcription, call summaries, coaching analysis, dashboards, Slack scorecards, or GHL writes.
- MCP-backed SQL generation should follow the same split: core `gold_coast` tables for entity/event exploration and `gold_coast_reporting` marts for repeated metrics.

Run-status smoke checks use gold_coast.run_status_ghl, backed only by s3://gcoffers-data-lake/run-status/ghl/runs/. Pointer files such as latest-success.json and latest-failure.json are not historical rows.

## Acceptance Queries

| File | Acceptance Query | Primary Tables | Notes |
| --- | --- | --- | --- |
| 001_aq_001_new_seller_leads_by_day_source.sql | Count new seller leads by day and source | gold_coast.opportunities_latest | Uses opportunity created time and source. |
| 002_aq_002_speed_to_first_touch.sql | Calculate speed-to-first-touch for new leads | gold_coast_reporting.lead_response, gold_coast.opportunities_latest | First response is first outbound call or message. |
| 003_aq_002a_speed_to_first_phone_call.sql | Calculate speed-to-first-phone-call | gold_coast_reporting.lead_response, gold_coast.opportunities_latest | Primary speed-to-lead metric. |
| 004_aq_003_contact_rate_by_source_user.sql | Calculate contact rate by lead source and assigned user | gold_coast_reporting.lead_response, gold_coast.opportunities_latest | Completed call rate plus attempted-touch rate. |
| 005_aq_004_call_activity_by_user_day.sql | Count outbound/completed/no-answer calls and unique leads touched | gold_coast.calls | Uses call actor, not opportunity owner. |
| 006_aq_005_sms_activity_by_user_day.sql | Count SMS/text sent and received by user/day | gold_coast.messages | Separates attributed and unknown actors. |
| 007_aq_006_no_outbound_touch_sla.sql | List leads with no outbound touch within SLA windows | gold_coast_reporting.lead_response, gold_coast.opportunities_latest | Uses first outbound call/message touch. |
| 008_aq_007_long_calls_with_recordings.sql | List long calls with recording availability and lead join | gold_coast.calls, gold_coast.opportunities_latest, gold_coast.contacts_latest | Chooses nearest opportunity created before the call. |
| 009_aq_008_appointment_set_rate.sql | Show appointment-set rate by source, user, and week | gold_coast.opportunities_latest | Best-effort from stage/status/raw opportunity text. |
| 010_aq_009_follow_up_needed_no_subsequent_touch.sql | Surface follow-up-needed leads with no subsequent touch | gold_coast.opportunities_latest, gold_coast.contacts_latest, gold_coast.messages, gold_coast.calls | Best-effort from stage/status/tags/custom/raw text. |
| 011_aq_010_call_outcomes_metadata_only.sql | Summarize call outcomes/statuses from metadata only | gold_coast.calls | No transcript or coaching fields. |
| 012_aq_011_avg_speed_to_lead_by_day.sql | Calculate average speed-to-lead by day | gold_coast_reporting.lead_response, gold_coast.opportunities_latest | Reports outbound call speed and first outbound touch. |
| 013_aq_012_busiest_lead_arrival_windows.sql | Identify busiest lead-arrival windows | gold_coast.opportunities_latest | Uses opportunity created timestamp. |
| 014_aq_013_calls_per_day_per_agent.sql | Count calls per day per agent | gold_coast.calls | Uses call actor ID. |
| 015_aq_014_actor_vs_owner_call_activity.sql | Compare caller activity by actor and owner | gold_coast.calls, gold_coast.opportunities_latest | Demonstrates actor attribution separate from owner. |

## Known MVP Gaps

- No user dimension exists yet, so user fields are source GHL user IDs.
- No appointment fact table exists yet. AQ-008 uses current opportunity stage/status text as a practical proxy.
- No follow-up classification fact exists yet. AQ-009 searches current stage/status/tags/custom/raw text for follow-up signals.
- Historical stage/status movement starts with V1.1 observations unless reconstructed later from trusted snapshots.
- Multiple opportunities can share a contact. Row-level call-to-opportunity joins pick the latest opportunity created before the event when possible.
