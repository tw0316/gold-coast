-- AQ-003: Calculate contact rate by lead source and by assigned user.
-- Assumptions: contacted = at least one completed call; attempted = outbound call or message after lead creation.
WITH lead_response AS (
    SELECT
        r.opportunity_id,
        r.assigned_to_user_id,
        r.has_contact_attempt,
        r.has_completed_call,
        o.source,
        o.pipeline_name
    FROM gold_coast_reporting.lead_response r
    LEFT JOIN gold_coast.opportunities_latest o
        ON o.opportunity_id = r.opportunity_id
)
SELECT
    coalesce(nullif(source, ''), 'unknown') AS lead_source,
    coalesce(nullif(assigned_to_user_id, ''), 'unknown') AS assigned_to_user_id,
    coalesce(nullif(pipeline_name, ''), 'unknown') AS pipeline_name,
    count(*) AS leads,
    sum(CASE WHEN has_contact_attempt THEN 1 ELSE 0 END) AS leads_with_outbound_attempt,
    sum(CASE WHEN has_completed_call THEN 1 ELSE 0 END) AS leads_with_completed_call,
    round(100.0 * sum(CASE WHEN has_contact_attempt THEN 1 ELSE 0 END) / nullif(count(*), 0), 2) AS outbound_attempt_rate_pct,
    round(100.0 * sum(CASE WHEN has_completed_call THEN 1 ELSE 0 END) / nullif(count(*), 0), 2) AS completed_call_contact_rate_pct
FROM lead_response
GROUP BY 1, 2, 3
ORDER BY completed_call_contact_rate_pct DESC, leads DESC, lead_source, assigned_to_user_id
