-- AQ-011: Calculate average speed-to-lead by day.
-- Assumptions: primary speed-to-lead is minutes_to_first_outbound_call; first outbound touch is reported as secondary context.
WITH lead_response AS (
    SELECT
        CAST(r.lead_created_at AS date) AS lead_created_date,
        r.minutes_to_first_outbound_call,
        r.minutes_to_first_response,
        r.first_outbound_call_at,
        r.first_response_at,
        o.source,
        o.pipeline_name
    FROM gold_coast_reporting.lead_response r
    LEFT JOIN gold_coast.opportunities_latest o
        ON o.opportunity_id = r.opportunity_id
    WHERE r.lead_created_at IS NOT NULL
)
SELECT
    lead_created_date,
    coalesce(nullif(source, ''), 'unknown') AS lead_source,
    coalesce(nullif(pipeline_name, ''), 'unknown') AS pipeline_name,
    count(*) AS leads,
    sum(CASE WHEN first_outbound_call_at IS NOT NULL THEN 1 ELSE 0 END) AS leads_with_outbound_call,
    round(avg(minutes_to_first_outbound_call), 2) AS avg_minutes_to_first_outbound_call,
    approx_percentile(minutes_to_first_outbound_call, 0.5) AS median_minutes_to_first_outbound_call,
    sum(CASE WHEN first_response_at IS NOT NULL THEN 1 ELSE 0 END) AS leads_with_first_outbound_touch,
    round(avg(minutes_to_first_response), 2) AS avg_minutes_to_first_outbound_touch,
    approx_percentile(minutes_to_first_response, 0.5) AS median_minutes_to_first_outbound_touch
FROM lead_response
GROUP BY 1, 2, 3
ORDER BY lead_created_date DESC, lead_source
