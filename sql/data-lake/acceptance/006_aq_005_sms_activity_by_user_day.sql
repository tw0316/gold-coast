-- AQ-005: Count SMS/text messages sent and received by user/day where source data supports attribution.
-- Assumptions: inbound SMS may have no actor_user_id; those rows are grouped as unknown and flagged unattributed.
WITH sms_messages AS (
    SELECT
        CAST(date_added AS date) AS activity_date,
        coalesce(nullif(actor_user_id, ''), 'unknown') AS actor_user_id,
        CASE WHEN actor_user_id IS NULL OR actor_user_id = '' THEN 'unattributed' ELSE 'attributed' END AS attribution_status,
        direction,
        contact_id,
        message_id
    FROM gold_coast.messages
    WHERE message_type IN ('TYPE_SMS', 'TYPE_SMS_REACTION')
      AND date_added IS NOT NULL
)
SELECT
    activity_date,
    actor_user_id,
    attribution_status,
    count(*) AS sms_messages_total,
    sum(CASE WHEN lower(coalesce(direction, '')) = 'outbound' THEN 1 ELSE 0 END) AS sms_sent,
    sum(CASE WHEN lower(coalesce(direction, '')) = 'inbound' THEN 1 ELSE 0 END) AS sms_received,
    count(DISTINCT contact_id) AS unique_contacts_touched
FROM sms_messages
GROUP BY 1, 2, 3
ORDER BY activity_date DESC, sms_messages_total DESC, actor_user_id
