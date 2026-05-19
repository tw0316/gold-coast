-- AQ-004: Count outbound calls, completed calls, no-answer calls, and unique leads touched by user/day.
-- Assumptions: user/day attribution uses calls.actor_user_id from the call event, not opportunity owner.
WITH latest_snapshot AS (
    SELECT max(snapshot_date) AS snapshot_date
    FROM gold_coast.calls
),
calls_latest AS (
    SELECT
        CAST(date_added AS date) AS activity_date,
        coalesce(nullif(actor_user_id, ''), 'unknown') AS actor_user_id,
        contact_id,
        direction,
        lower(coalesce(nullif(call_status, ''), nullif(status, ''), 'unknown')) AS normalized_call_status,
        duration_seconds
    FROM gold_coast.calls
    WHERE snapshot_date = (SELECT snapshot_date FROM latest_snapshot)
      AND date_added IS NOT NULL
)
SELECT
    activity_date,
    actor_user_id,
    count(*) AS calls_total,
    sum(CASE WHEN lower(coalesce(direction, '')) = 'outbound' THEN 1 ELSE 0 END) AS outbound_calls,
    sum(CASE WHEN normalized_call_status = 'completed' THEN 1 ELSE 0 END) AS completed_calls,
    sum(
        CASE
            WHEN normalized_call_status IN ('no-answer', 'no_answer', 'missed', 'busy', 'failed', 'voicemail', 'canceled', 'cancelled')
            THEN 1 ELSE 0
        END
    ) AS no_answer_or_unsuccessful_calls,
    count(DISTINCT contact_id) AS unique_leads_touched,
    round(sum(coalesce(duration_seconds, 0)), 2) AS total_call_duration_seconds
FROM calls_latest
GROUP BY 1, 2
ORDER BY activity_date DESC, calls_total DESC, actor_user_id

