-- AQ-002: Calculate speed-to-first-touch for new leads.
-- Assumptions: first_response_at is implemented as first outbound call or first outbound non-call message.
WITH lead_response AS (
    SELECT
        r.opportunity_id,
        r.contact_id,
        r.assigned_to_user_id,
        r.lead_created_at,
        r.first_response_at,
        r.minutes_to_first_response,
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
    sum(CASE WHEN first_response_at IS NOT NULL THEN 1 ELSE 0 END) AS leads_with_first_touch,
    sum(CASE WHEN first_response_at IS NULL THEN 1 ELSE 0 END) AS leads_without_first_touch,
    round(avg(minutes_to_first_response), 2) AS avg_minutes_to_first_touch,
    approx_percentile(minutes_to_first_response, 0.5) AS median_minutes_to_first_touch,
    min(minutes_to_first_response) AS min_minutes_to_first_touch,
    max(minutes_to_first_response) AS max_minutes_to_first_touch
FROM lead_response
GROUP BY 1, 2, 3, 4
ORDER BY lead_created_date DESC, lead_source, assigned_to_user_id
