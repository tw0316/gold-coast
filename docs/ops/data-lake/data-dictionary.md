# Gold Coast Data Lake Data Dictionary

Status: V1.1 query contract

Core database: gold_coast

Reporting database: gold_coast_reporting

Athena workgroup: gold_coast_data_lake

Curated S3 prefix: s3://gcoffers-data-lake/curated/ghl/v1_1/

Internal daily snapshots: s3://gcoffers-data-lake/snapshots/ghl/daily/

## Scope And Guardrails

This dictionary documents the GHL-source V1.1 Athena query surface implemented in apps/data-lake/src/gold_coast_data_lake/curated.py.

- GHL is read-only. No GHL writes, notes, field updates, tasks, pipeline moves, or workflow triggers.
- Core curated tables are first-class query targets for entity/event exploration.
- gold_coast_reporting is for repeated business metrics and marts.
- Daily snapshots are internal audit/debug data, not the normal query surface.
- No dashboards, call summaries, coaching analysis, website leads, or marketing data are part of V1.1.
- Call recordings are private encrypted S3 objects only. Tables store metadata and object references, not audio payloads.
- Call transcripts are a downstream table published by the transcription pipeline only. The normal hourly GHL refresh must not overwrite `gold_coast.call_transcripts`.

V1.1 default query tables are not repeated snapshot_date/run_id partitions. Current-state tables are overwritten, event tables are deduped by stable source IDs, and stage history appends only when stage/status changes.

Rows include run_id and snapshot_at for observability. Users should not need to filter by either field for normal questions.

## Table Summary

| Database | Table | Grain | PII |
| --- | --- | --- | --- |
| gold_coast | contacts_latest | One latest row per GHL contact_id | High |
| gold_coast | opportunities_latest | One latest row per GHL opportunity_id | High |
| gold_coast | messages | One durable row per GHL message_id | High |
| gold_coast | calls | One durable row per GHL call_message_id | High |
| gold_coast | call_recordings | One row per call recording archive result keyed by message_id | High |
| gold_coast | call_transcripts | One current transcript/status row per call recording idempotency grain | High |
| gold_coast | opportunity_stage_history | One row per observed stage/status transition | Moderate |
| gold_coast_reporting | lead_response | One row per opportunity with speed-to-lead/contact metrics | Moderate |
| gold_coast_reporting | rep_activity_daily | One row per actor/day activity bucket | Moderate |

## Common Join Keys

- contacts_latest.contact_id = opportunities_latest.contact_id = messages.contact_id = calls.contact_id
- messages.message_id = calls.call_message_id for call messages when both raw message and fetched call detail exist.
- calls.call_message_id = call_recordings.message_id
- call_transcripts.call_message_id = calls.call_message_id = call_recordings.message_id
- call_transcripts.recording_sha256 = call_recordings.sha256
- call_transcripts.recording_object_key = call_recordings.object_key
- opportunities_latest.opportunity_id = gold_coast_reporting.lead_response.opportunity_id
- messages.actor_user_id and calls.actor_user_id identify the event actor. Do not substitute current opportunity owner for activity attribution.

## Core Tables

### gold_coast.contacts_latest

Purpose: latest contact identity, contactability, attribution fields, tags, and custom fields.

Primary key: contact_id

Source endpoint: GET /contacts/?locationId=...

Important fields: contact_id, contact_name, phone, email, source, assigned_to_user_id, tags_json, custom_fields_json, date_added, date_updated, raw_json, run_id, snapshot_at.

### gold_coast.opportunities_latest

Purpose: latest lead/opportunity state. In Gold Coast, lead = GHL opportunity.

Primary key: opportunity_id

Source endpoint: GET /opportunities/search?location_id=...&pipeline_id=..., enriched with pipeline/stage names from GET /opportunities/pipelines?locationId=....

Important fields: opportunity_id, contact_id, pipeline_id, pipeline_name, pipeline_stage_id, pipeline_stage_name, status, source, assigned_to_user_id, created_at, updated_at, last_stage_change_at, last_status_change_at, raw_json, run_id, snapshot_at.

### gold_coast.messages

Purpose: event-safe conversation message/activity fact table for SMS, email, Facebook, Instagram, and activity events.

Primary key: message_id

Source endpoint: GET /conversations/{conversationId}/messages

Important fields: message_id, conversation_id, contact_id, message_type, direction, status, body, from_phone, to_phone, actor_user_id, date_added, date_updated, raw_json, run_id, snapshot_at.

### gold_coast.calls

Purpose: event-safe call fact table built from fetched GHL call message detail, enriched with recording metadata.

Primary key: call_message_id

Source endpoint: GET /conversations/messages/{messageId}

Important fields: call_message_id, conversation_id, contact_id, actor_user_id, direction, status, call_status, duration_seconds, has_recording, recording_s3_uri, recording_archival_status, date_added, date_updated, raw_json, run_id, snapshot_at.

### gold_coast.call_recordings

Purpose: recording archive ledger. Tracks archived, skipped-existing, and unavailable recording outcomes.

Primary key: message_id

Source endpoint: GET /conversations/messages/{messageId}/locations/{locationId}/recording

Important fields: message_id, archival_status, s3_uri, object_key, content_type, byte_count, sha256, unavailable_reason, archived_at, run_id, snapshot_at.

### gold_coast.call_transcripts

Purpose: downstream transcript status and text table for archived GHL call recordings.

Primary grain: call_message_id, recording_sha256, artifact_schema_version, provider, transcription_model

Source process: `gold_coast_data_lake.jobs.ghl_call_transcription`, after sample/backfill/incremental transcription runs. This table is not part of `TABLE_ORDER` in `curated.py` and is not written by the normal hourly GHL refresh.

Important fields: call_message_id, conversation_id, contact_id, opportunity_id, recording_object_key, recording_sha256, transcription_status, transcript_text, provider, transcription_model, artifact_schema_version, idempotency_key, attempt_count, transcribed_at, source_call_run_id, source_recording_run_id, run_id, snapshot_at.

Allowed statuses: succeeded, failed, pending_retry, skipped_no_recording.

Privacy note: transcript_text is high-PII seller data. Do not paste transcript text into Slack, evidence files, logs, tickets, or docs. Use counts/statuses for smoke and acceptance evidence.

### gold_coast.opportunity_stage_history

Purpose: transition history for stage/status movement without full snapshot spam.

Primary key: transition_key

Append rule: first V1.1 observation creates a baseline row. Later runs append only when pipeline_id, pipeline_stage_id, or status changes for the opportunity.

Important fields: opportunity_id, contact_id, previous_pipeline_stage_id, previous_pipeline_stage_name, previous_status, pipeline_stage_id, pipeline_stage_name, status, observed_at, source_stage_changed_at, source_status_changed_at, stage_status_key, transition_key, run_id, snapshot_at.

## Reporting Marts

### gold_coast_reporting.lead_response

Purpose: speed-to-lead and contact-attempt metrics for repeated business questions.

Primary key: opportunity_id

Important fields: opportunity_id, contact_id, assigned_to_user_id, lead_created_at, first_outbound_call_at, minutes_to_first_outbound_call, first_outbound_message_at, minutes_to_first_outbound_message, first_response_at, minutes_to_first_response, call_count, message_count, has_contact_attempt, has_completed_call.

### gold_coast_reporting.rep_activity_daily

Purpose: daily call/message activity by event actor.

Primary grain: activity_date, actor_user_id

Important fields: activity_date, actor_user_id, calls_total, calls_outbound, calls_inbound, calls_completed, call_duration_seconds, messages_total, messages_outbound, messages_inbound, sms_messages, email_messages, unique_contacts_touched, first_activity_at, last_activity_at.

## Internal Audit Snapshots

Daily audit snapshots are written under snapshots/ghl/daily/ with a snapshot_date path. They are for recovery/debugging only.

Do not point Atlas, DataGrip, or business SQL at this prefix unless the task is explicitly audit or recovery work.
