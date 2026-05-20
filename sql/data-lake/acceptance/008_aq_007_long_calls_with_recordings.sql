-- AQ-007: List calls longer than 45 seconds with call metadata, recording availability, duration, status, actor, and contact/opportunity join.
-- Assumptions: when a contact has multiple opportunities, pick the latest opportunity created before the call when possible.
WITH long_calls AS (
    SELECT *
    FROM gold_coast.calls
    WHERE duration_seconds > 45
),
call_opportunity_candidates AS (
    SELECT
        c.*,
        o.opportunity_id,
        o.opportunity_name,
        o.assigned_to_user_id AS opportunity_owner_user_id,
        o.source AS lead_source,
        o.pipeline_name,
        o.pipeline_stage_name,
        o.created_at AS opportunity_created_at,
        row_number() OVER (
            PARTITION BY c.call_message_id
            ORDER BY
                CASE WHEN o.created_at IS NOT NULL AND c.date_added IS NOT NULL AND o.created_at <= c.date_added THEN 0 ELSE 1 END,
                o.created_at DESC
        ) AS opportunity_rank
    FROM long_calls c
    LEFT JOIN gold_coast.opportunities_latest o
        ON o.contact_id = c.contact_id
),
ranked_calls AS (
    SELECT *
    FROM call_opportunity_candidates
    WHERE opportunity_rank = 1
)
SELECT
    rc.call_message_id,
    rc.date_added AS call_at,
    rc.contact_id,
    ct.contact_name,
    rc.opportunity_id,
    rc.opportunity_name,
    rc.lead_source,
    rc.pipeline_name,
    rc.pipeline_stage_name,
    rc.opportunity_owner_user_id,
    rc.actor_user_id,
    rc.direction,
    rc.status,
    rc.call_status,
    rc.duration_seconds,
    rc.has_recording,
    rc.recording_archival_status,
    rc.recording_unavailable_reason,
    rc.recording_s3_uri,
    rc.recording_content_type,
    rc.recording_byte_count
FROM ranked_calls rc
LEFT JOIN gold_coast.contacts_latest ct
    ON ct.contact_id = rc.contact_id
ORDER BY rc.duration_seconds DESC, rc.date_added DESC
