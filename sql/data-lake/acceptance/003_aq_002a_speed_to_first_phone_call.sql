-- AQ-002A: Calculate speed-to-first-phone-call for new leads using opportunity created time as the start timestamp.
-- Assumptions: phone-call speed uses first outbound call from gold_coast_reporting.lead_response.
WITH lead_response AS (
    SELECT
        r.opportunity_id,
        r.assigned_to_user_id,
        r.lead_created_at,
        r.first_outbound_call_at,
        r.first_outbound_call_user_id,
        r.minutes_to_first_outbound_call,
        o.source,
        o.pipeline_name
    FROM gold_coast_reporting.lead_response r
    LEFT JOIN gold_coast.opportunities_latest o
        ON o.opportunity_id = r.opportunity_id
    WHERE r.lead_created_at IS NOT NULL
)
SELECT
    CAST(lead_created_at AS date) AS lead_created_date,
    coalesce(nullif(source, ''), 'unknown') AS lead_source,
    coalesce(nullif(assigned_to_user_id, ''), 'unknown') AS assigned_to_user_id,
    coalesce(nullif(pipeline_name, ''), 'unknown') AS pipeline_name,
    count(*) AS leads,
    sum(CASE WHEN first_outbound_call_at IS NOT NULL THEN 1 ELSE 0 END) AS leads_with_outbound_call,
    sum(CASE WHEN first_outbound_call_at IS NULL THEN 1 ELSE 0 END) AS leads_without_outbound_call,
    round(avg(minutes_to_first_outbound_call), 2) AS avg_minutes_to_first_outbound_call,
    approx_percentile(minutes_to_first_outbound_call, 0.5) AS median_minutes_to_first_outbound_call,
    min(minutes_to_first_outbound_call) AS min_minutes_to_first_outbound_call,
    max(minutes_to_first_outbound_call) AS max_minutes_to_first_outbound_call
FROM lead_response
GROUP BY 1, 2, 3, 4
ORDER BY lead_created_date DESC, lead_source, assigned_to_user_id
