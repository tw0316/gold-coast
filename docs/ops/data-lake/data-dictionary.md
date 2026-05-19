# Gold Coast Data Lake Data Dictionary

Database: `gold_coast`

Current verified snapshot: `snapshot_date = '2026-05-18'`

Curated S3 prefix: `s3://gcoffers-data-lake/curated/ghl/`

Athena workgroup: `gold_coast_data_lake`

Local project root: `/Users/jarvis/LocalRepos/gold-coast/apps/data-lake`

## Scope And Guardrails

This dictionary documents the GHL-source MVP Glue/Athena curated tables exactly as implemented in `src/gold_coast_data_lake/curated.py`.

MVP guardrails:

- GHL is read-only. No GHL writes, notes, field updates, tasks, pipeline moves, or workflow triggers.
- No transcription, no call summaries, no coaching analysis, no dashboards, no QuickSight, no Superset, and no scheduled Slack scorecards.
- No credentials or raw secrets belong in docs, SQL, logs, or query output.
- Call recordings are private encrypted S3 objects only. Tables store metadata and object references, not audio payloads.

All tables are external Parquet Glue tables partitioned by `snapshot_date`. Query the latest partition unless a historical snapshot comparison is intentional.

GHL remains the first source namespace inside the source-agnostic Gold Coast data lake. Source-specific objects stay under `raw/ghl/`, `curated/ghl/`, `recordings/ghl/`, `manifests/ghl/`, and `checkpoints/ghl/`.

## Table Summary

| Table | Grain | Rows In Current Snapshot | PII Level |
| --- | --- | ---: | --- |
| `contacts` | One row per GHL contact | 175 | High |
| `opportunities` | One row per GHL opportunity | 120 | High |
| `messages` | One row per GHL conversation message/activity | 1,547 | High |
| `calls` | One row per fetched GHL call message detail | 193 | High |
| `call_recordings` | One row per recording archive attempt | 193 | High |
| `mart_lead_response` | One row per opportunity with response metrics | 120 | Moderate |
| `mart_rep_activity_daily` | One row per activity date and actor user ID | 115 | Moderate |

## Common Join Keys

- `contacts.contact_id` = `opportunities.contact_id` = `messages.contact_id` = `calls.contact_id`
- `messages.message_id` = `calls.call_message_id` for call messages when the raw message and fetched call detail both exist.
- `calls.call_message_id` = `call_recordings.message_id`
- `opportunities.opportunity_id` = `mart_lead_response.opportunity_id`
- `messages.actor_user_id` and `calls.actor_user_id` identify the event actor. Do not substitute current opportunity owner for activity attribution.
- Every join across curated tables should include matching `snapshot_date`.

## contacts

Purpose: Current contact-level attributes from GHL for seller identity, contactability, attribution fields, tags, and custom fields.

Grain: One row per GHL contact in the curated snapshot.

Source endpoint/raw entity: `GET /contacts/?locationId=...` into raw entity `contacts`.

Refresh/snapshot cadence: Rebuilt as a snapshot partition by the curated build. Current verified partition is `2026-05-18`; use `max(snapshot_date)` for latest-state queries.

PII level: High. Contains names, phone numbers, email addresses, location fields, tags, custom fields, and raw JSON.

Join keys:

- Primary analytical key: `contact_id`
- Common joins: `opportunities.contact_id`, `messages.contact_id`, `calls.contact_id`

Caveats:

- This is latest-known contact state only. It is not a point-in-time contact history.
- `tags_json`, `custom_fields_json`, and `attributions_json` are JSON strings preserved from source payloads.
- Phone/email values may also appear in opportunity embedded contact fields and message/call records.

Important fields:

- `contact_id`, `location_id`: Source identifiers.
- `contact_name`, `first_name`, `last_name`, `phone`, `email`: PII contact fields.
- `source`, `assigned_to_user_id`, `tags_json`, `custom_fields_json`, `attributions_json`: Attribution and segmentation fields.
- `date_added`, `date_updated`: Source timestamps.
- `raw_json`: Full normalized source record as JSON text.

## opportunities

Purpose: Lead/opportunity table. In V1, a lead is a GHL opportunity.

Grain: One row per GHL opportunity in the curated snapshot.

Source endpoint/raw entity: `GET /opportunities/search?location_id=...&pipeline_id=...` into raw entity `opportunities`. Pipeline and stage names are enriched from raw entity `pipelines`, fetched from `GET /opportunities/pipelines?locationId=...`.

Refresh/snapshot cadence: Rebuilt as a latest-state snapshot partition. Current verified partition is `2026-05-18`.

PII level: High. Contains seller name, phone/email fields when embedded in the opportunity, source fields, and raw JSON.

Join keys:

- Primary analytical key: `opportunity_id`
- Contact join: `contact_id`
- Stage joins by source IDs: `pipeline_id`, `pipeline_stage_id`
- Mart join: `mart_lead_response.opportunity_id`

Caveats:

- Current table stores latest-known opportunity state, not full stage movement history.
- Speed-to-lead calculations use `created_at` as the lead start timestamp.
- Schema supports additional pipelines, including Dispositions, through `pipeline_id` and `pipeline_name`, even though the MVP acceptance pass starts with Motivated Sellers.
- Stage names come from the pipeline lookup available during extraction. Missing stage lookups will leave names null.

Important fields:

- `opportunity_id`, `contact_id`, `location_id`: Source identifiers.
- `pipeline_id`, `pipeline_name`, `pipeline_stage_id`, `pipeline_stage_name`, `pipeline_stage_position`: Pipeline state.
- `status`, `source`, `assigned_to_user_id`: Current lead state and owner.
- `created_at`, `updated_at`, `last_stage_change_at`, `last_status_change_at`: Source timestamps.
- `contact_name`, `contact_phone`, `contact_email`: Embedded contact fields from opportunity payload.
- `custom_fields_json`, `attributions_json`, `raw_json`: Preserved source details.

## messages

Purpose: Conversation message and activity fact table for SMS, email, Facebook, Instagram, appointment/contact/opportunity activity, and raw call message rows.

Grain: One row per GHL conversation message/activity from the messages endpoint.

Source endpoint/raw entity: `GET /conversations/{conversationId}/messages` into raw entity `messages`. Conversation IDs come from `GET /conversations/search?locationId=...`.

Refresh/snapshot cadence: Rebuilt as a snapshot partition from the latest raw backfill. Current verified partition is `2026-05-18`.

PII level: High. SMS bodies are stored in full by requirement. Phone numbers and raw JSON may contain additional PII.

Join keys:

- Primary analytical key: `message_id`
- Conversation key: `conversation_id`
- Contact join: `contact_id`
- Call detail join: `message_id = calls.call_message_id` for `TYPE_CALL` rows when fetched detail exists.

Caveats:

- `actor_user_id` comes from `userId` on the source message. Inbound messages often have no actor and should be treated as unattributed or `unknown` in activity queries.
- `body` is populated for message types that expose a body. Calls and activity messages may have null body.
- Call analytics should usually use `calls`, because it includes fetched detail and recording metadata.

Important fields:

- `message_id`, `conversation_id`, `contact_id`, `location_id`: Source identifiers.
- `message_type`, `direction`, `status`: Message classification.
- `body`: Full source body where available, including SMS text.
- `from_phone`, `to_phone`, `actor_user_id`: Contact and attribution fields.
- `date_added`, `date_updated`: Source timestamps.
- `attachments_json`, `activity_json`, `meta_json`, `error_json`, `raw_json`: Preserved nested payloads.

## calls

Purpose: Call metadata fact table built from fetched GHL call message detail, enriched with recording archive metadata.

Grain: One row per fetched call message detail.

Source endpoint/raw entity: `GET /conversations/messages/{messageId}` into raw entity `call_message_details`. Recording metadata is joined from the extractor manifest.

Refresh/snapshot cadence: Rebuilt as a snapshot partition from raw call details and recording archive metadata. Current verified partition is `2026-05-18`.

PII level: High. Contains phone numbers, event actor, raw call JSON, and private S3 object references for recordings.

Join keys:

- Primary analytical key: `call_message_id`
- Recording join: `call_recordings.message_id`
- Contact join: `contact_id`
- Raw message join: `messages.message_id` when the original message row exists.

Caveats:

- `actor_user_id` is the user on the call event. This is the required attribution field for call activity.
- `status` is the message status. `call_status` comes from `meta.call.status`; both are useful because source payloads vary.
- `duration_seconds` comes from `meta.call.duration`.
- `has_recording` is true only when a recording object was archived to S3. Unavailable recordings are still represented with status/reason metadata.
- No transcription, summary, sentiment, or coaching fields exist in MVP.

Important fields:

- `call_message_id`, `conversation_id`, `contact_id`, `location_id`: Source identifiers.
- `actor_user_id`, `direction`, `status`, `call_status`, `duration_seconds`: Call analytics fields.
- `from_phone`, `to_phone`: Phone metadata.
- `has_recording`, `recording_s3_uri`, `recording_object_key`, `recording_content_type`, `recording_byte_count`, `recording_sha256`, `recording_archival_status`, `recording_unavailable_reason`: Recording metadata only.
- `date_added`, `date_updated`, `raw_json`: Source timestamp and full call detail payload.

## call_recordings

Purpose: Recording archive ledger. Tracks whether each attempted GHL call recording was archived or unavailable.

Grain: One row per recording archive attempt.

Source endpoint/raw entity: Extractor manifest `recordings` array populated by `GET /conversations/messages/{messageId}/locations/{locationId}/recording`.

Refresh/snapshot cadence: Rebuilt as a snapshot partition from the raw extraction manifest. Current verified partition is `2026-05-18`.

PII level: High. S3 object references point to private call audio objects. Audio is not embedded in the table.

Join keys:

- Primary analytical key: `message_id`
- Call join: `calls.call_message_id`

Caveats:

- `archival_status = 'archived'` means the recording binary was uploaded to private encrypted S3.
- `archival_status = 'unavailable'` means GHL returned a missing-recording response for that message.
- `s3_uri` and `object_key` must be treated as sensitive references. Do not expose them outside approved Tej/Jarvis/Atlas contexts.

Important fields:

- `message_id`: GHL call message ID.
- `archival_status`, `unavailable_reason`: Archive result.
- `s3_uri`, `object_key`: Private encrypted S3 object reference.
- `content_type`, `byte_count`, `sha256`: File metadata.
- `archived_at`, `endpoint`: Fetch metadata.

## mart_lead_response

Purpose: Query-friendly lead response mart for speed-to-lead, first outbound touch, first phone call, completed call, and activity counts.

Grain: One row per opportunity.

Source endpoint/raw entity: Derived from `opportunities`, `messages`, and `calls`.

Refresh/snapshot cadence: Rebuilt with curated tables as a snapshot partition. Current verified partition is `2026-05-18`.

PII level: Moderate. It stores IDs and response metrics, but joins back to high-PII tables.

Join keys:

- Primary analytical key: `opportunity_id`
- Contact join: `contact_id`
- Opportunity join: `opportunities.opportunity_id`

Caveats:

- Lead start time is `lead_created_at`, sourced from `opportunities.created_at`.
- Primary phone-call speed metric is `minutes_to_first_outbound_call`.
- `first_response_at` is implemented as the earlier of first outbound call and first outbound non-call message. Treat it as first outbound touch, not a seller reply.
- Activity counts include only events on or after the opportunity created time for the same contact.

Important fields:

- `opportunity_id`, `contact_id`, `assigned_to_user_id`: Lead identifiers and current owner.
- `lead_created_at`: Speed-to-lead starting timestamp.
- `first_outbound_call_at`, `first_outbound_call_user_id`, `minutes_to_first_outbound_call`: Primary speed-to-call metric.
- `first_completed_call_at`, `minutes_to_first_completed_call`, `has_completed_call`: Contact-rate support.
- `first_outbound_message_at`, `first_outbound_message_type`, `minutes_to_first_outbound_message`: Message touch support.
- `first_response_at`, `minutes_to_first_response`: First outbound touch support.
- `call_count`, `completed_call_count`, `message_count`, `outbound_activity_count`, `inbound_activity_count`, `has_contact_attempt`: Activity summary fields.

## mart_rep_activity_daily

Purpose: Query-friendly daily activity mart by event actor.

Grain: One row per `activity_date` and `actor_user_id`.

Source endpoint/raw entity: Derived from `messages` and `calls`.

Refresh/snapshot cadence: Rebuilt with curated tables as a snapshot partition. Current verified partition is `2026-05-18`.

PII level: Moderate. It stores user IDs and aggregate counts, but no message bodies or phone numbers.

Join keys:

- Analytical key: `activity_date`, `actor_user_id`
- There is no user dimension in the MVP, so `actor_user_id` remains the source GHL user ID or `unknown`.

Caveats:

- Activity is attributed to the event actor on call/message records, not the opportunity owner.
- Inbound messages often have no user ID and are grouped under `unknown`.
- This mart is aggregate only. Use `calls` and `messages` for row-level detail.

Important fields:

- `activity_date`, `actor_user_id`: Mart grain.
- `calls_total`, `calls_outbound`, `calls_inbound`, `calls_completed`, `call_duration_seconds`: Call activity.
- `messages_total`, `messages_outbound`, `messages_inbound`, `sms_messages`, `email_messages`, `facebook_messages`, `instagram_messages`: Message activity.
- `unique_contacts_touched`: Distinct contacts touched by that actor/day.
- `first_activity_at`, `last_activity_at`: Daily bounds.
