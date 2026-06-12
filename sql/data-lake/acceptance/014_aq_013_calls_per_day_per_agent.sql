-- AQ-013: Count calls per day per agent.
-- Assumptions: agent = calls.actor_user_id from the call event; unknown means source userId was missing.
WITH calls_latest AS (
    SELECT
        CAST(date_added AS date) AS call_date,
        coalesce(nullif(actor_user_id, ''), 'unknown') AS actor_user_id,
        direction,
        coalesce(nullif(call_status, ''), nullif(status, ''), 'unknown') AS outcome_status,
        duration_seconds,
        contact_id
    FROM gold_coast.calls
    WHERE date_added IS NOT NULL
)
SELECT
    call_date,
    actor_user_id,
    count(*) AS calls_total,
    sum(CASE WHEN lower(coalesce(direction, '')) = 'outbound' THEN 1 ELSE 0 END) AS outbound_calls,
    sum(CASE WHEN lower(coalesce(direction, '')) = 'inbound' THEN 1 ELSE 0 END) AS inbound_calls,
    sum(CASE WHEN lower(outcome_status) = 'completed' THEN 1 ELSE 0 END) AS completed_calls,
    count(DISTINCT contact_id) AS unique_contacts_called,
    round(sum(coalesce(duration_seconds, 0)), 2) AS total_duration_seconds
FROM calls_latest
GROUP BY 1, 2
ORDER BY call_date DESC, calls_total DESC, actor_user_id
