# Gold Coast Data Lake Query Library

Database: `gold_coast`

SQL dialect: Athena/Presto

Location: `sql/data-lake/acceptance/`

Athena workgroup: `gold_coast_data_lake`

Data lake bucket: `s3://gcoffers-data-lake/`

Local project root: `/Users/jarvis/LocalRepos/gold-coast/apps/data-lake`

## Usage Rules

- Queries are read-only and start from `SELECT` or `WITH`.
- Every query uses the latest available `snapshot_date` unless the file comments say otherwise.
- Lead means GHL opportunity.
- GHL remains the source namespace inside the Gold Coast lake. Source objects stay under `raw/ghl/`, `curated/ghl/`, `recordings/ghl/`, `manifests/ghl/`, and `checkpoints/ghl/`.
- Speed-to-lead starts at `opportunities.created_at`, exposed as `mart_lead_response.lead_created_at`.
- Activity attribution uses the event `actor_user_id` from calls/messages, not current opportunity owner.
- Recording fields are metadata only. Audio remains private encrypted S3 object storage.
- No query uses transcription, call summaries, or coaching analysis.
- No query depends on dashboards, Slack scorecards, or GHL writes.

## Acceptance Queries

| File | Acceptance Query | Primary Tables | Notes |
| --- | --- | --- | --- |
| `001_aq_001_new_seller_leads_by_day_source.sql` | AQ-001: Count new seller leads by day and source | `opportunities` | Uses opportunity created time and source. |
| `002_aq_002_speed_to_first_touch.sql` | AQ-002: Calculate speed-to-first-touch for new leads | `mart_lead_response`, `opportunities` | `first_response_at` is implemented as first outbound call or message. |
| `003_aq_002a_speed_to_first_phone_call.sql` | AQ-002A: Calculate speed-to-first-phone-call | `mart_lead_response`, `opportunities` | Primary speed-to-lead metric. |
| `004_aq_003_contact_rate_by_source_user.sql` | AQ-003: Calculate contact rate by lead source and assigned user | `mart_lead_response`, `opportunities` | Completed call rate plus attempted-touch rate. |
| `005_aq_004_call_activity_by_user_day.sql` | AQ-004: Count outbound/completed/no-answer calls and unique leads touched | `calls` | Uses call actor, not opportunity owner. |
| `006_aq_005_sms_activity_by_user_day.sql` | AQ-005: Count SMS/text sent and received by user/day | `messages` | Separates attributed and unknown actors. |
| `007_aq_006_no_outbound_touch_sla.sql` | AQ-006: List leads with no outbound touch within 15 minutes, 1 hour, and 24 hours | `mart_lead_response`, `opportunities` | Uses first outbound call/message touch. |
| `008_aq_007_long_calls_with_recordings.sql` | AQ-007: List calls longer than 45 seconds with recording availability and lead join | `calls`, `opportunities`, `contacts` | Chooses the nearest opportunity created before the call for contacts with multiple opportunities. |
| `009_aq_008_appointment_set_rate.sql` | AQ-008: Show appointment-set rate by source, user, and week | `opportunities` | Best-effort from stage/status/raw opportunity text. No appointment fact exists in MVP. |
| `010_aq_009_follow_up_needed_no_subsequent_touch.sql` | AQ-009: Surface follow-up-needed leads with no subsequent touch | `opportunities`, `contacts`, `messages`, `calls` | Best-effort from stage/status/tags/custom/raw text. |
| `011_aq_010_call_outcomes_metadata_only.sql` | AQ-010: Summarize call outcomes/statuses from metadata only | `calls` | No transcript or coaching fields. |
| `012_aq_011_avg_speed_to_lead_by_day.sql` | AQ-011: Calculate average speed-to-lead by day | `mart_lead_response`, `opportunities` | Reports outbound call speed and first outbound touch side by side. |
| `013_aq_012_busiest_lead_arrival_windows.sql` | AQ-012: Identify busiest lead-arrival windows by hour and day of week | `opportunities` | Uses opportunity created timestamp. |
| `014_aq_013_calls_per_day_per_agent.sql` | AQ-013: Count calls per day per agent | `calls` | Uses call actor ID. |
| `015_aq_014_actor_vs_owner_call_activity.sql` | AQ-014: Compare caller activity by actor userId when opportunity owner differs | `calls`, `opportunities` | Demonstrates actor attribution separate from owner. |

## Known MVP Gaps

- No user dimension exists yet, so user fields are source GHL user IDs.
- No appointment fact table exists yet. AQ-008 uses current opportunity stage/status text as a practical MVP proxy.
- No follow-up classification fact exists yet. AQ-009 searches current stage/status/tags/custom/raw text for follow-up signals.
- No point-in-time opportunity stage history exists yet. Current-stage queries are latest-state analyses.
- Multiple opportunities can share a contact. Row-level call-to-opportunity joins pick the latest opportunity created before the event when possible.
