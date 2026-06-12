-- AQ-009: Surface leads with follow-up-needed classification and no subsequent touch.
-- Assumptions: no follow-up fact table exists in MVP; classification is a best-effort text signal from opportunity/contact fields.
WITH follow_up_candidates AS (
    SELECT
        o.opportunity_id,
        o.contact_id,
        o.opportunity_name,
        o.source,
        o.assigned_to_user_id,
        o.pipeline_name,
        o.pipeline_stage_name,
        o.status,
        coalesce(o.last_stage_change_at, o.last_status_change_at, o.updated_at, o.created_at) AS follow_up_signal_at,
        lower(
            concat(
                coalesce(o.pipeline_stage_name, ''), ' ',
                coalesce(o.status, ''), ' ',
                coalesce(o.custom_fields_json, ''), ' ',
                coalesce(o.raw_json, ''), ' ',
                coalesce(c.tags_json, ''), ' ',
                coalesce(c.custom_fields_json, '')
            )
        ) AS searchable_text
    FROM gold_coast.opportunities_latest o
    LEFT JOIN gold_coast.contacts_latest c
        ON c.contact_id = o.contact_id
),
follow_up_leads AS (
    SELECT *
    FROM follow_up_candidates
    WHERE regexp_like(searchable_text, 'follow[-_ ]?up|followup|call back|callback|nurture|reconnect')
),
touches AS (
    SELECT
        f.opportunity_id,
        'message' AS touch_type,
        m.message_id AS touch_id,
        m.date_added AS touch_at
    FROM follow_up_leads f
    INNER JOIN gold_coast.messages m
        ON m.contact_id = f.contact_id
       AND m.date_added > f.follow_up_signal_at
       AND lower(coalesce(m.direction, '')) = 'outbound'
       AND m.message_type <> 'TYPE_CALL'
    UNION ALL
    SELECT
        f.opportunity_id,
        'call' AS touch_type,
        c.call_message_id AS touch_id,
        c.date_added AS touch_at
    FROM follow_up_leads f
    INNER JOIN gold_coast.calls c
        ON c.contact_id = f.contact_id
       AND c.date_added > f.follow_up_signal_at
       AND lower(coalesce(c.direction, '')) = 'outbound'
),
subsequent_touches AS (
    SELECT
        opportunity_id,
        sum(CASE WHEN touch_type = 'message' THEN 1 ELSE 0 END) AS subsequent_messages,
        sum(CASE WHEN touch_type = 'call' THEN 1 ELSE 0 END) AS subsequent_calls,
        min(touch_at) AS first_subsequent_touch_at
    FROM touches
    GROUP BY 1
)
SELECT
    f.opportunity_id,
    f.contact_id,
    f.opportunity_name,
    coalesce(nullif(f.source, ''), 'unknown') AS lead_source,
    coalesce(nullif(f.assigned_to_user_id, ''), 'unknown') AS assigned_to_user_id,
    f.pipeline_name,
    f.pipeline_stage_name,
    f.status AS opportunity_status,
    f.follow_up_signal_at,
    coalesce(t.subsequent_messages, 0) AS subsequent_outbound_messages,
    coalesce(t.subsequent_calls, 0) AS subsequent_outbound_calls,
    t.first_subsequent_touch_at
FROM follow_up_leads f
LEFT JOIN subsequent_touches t
    ON t.opportunity_id = f.opportunity_id
WHERE coalesce(t.subsequent_messages, 0) = 0
  AND coalesce(t.subsequent_calls, 0) = 0
ORDER BY f.follow_up_signal_at DESC
