-- AQ-006: List leads with no outbound touch within 15 minutes, 1 hour, and 24 hours.
-- Assumptions: outbound touch = first outbound call or first outbound non-call message in gold_coast_reporting.lead_response.
WITH lead_response AS (
    SELECT
        r.opportunity_id,
        r.contact_id,
        r.assigned_to_user_id,
        r.lead_created_at,
        r.first_response_at,
        r.minutes_to_first_response,
        r.first_outbound_call_at,
        r.first_outbound_message_at,
        o.source,
        o.pipeline_name,
        o.pipeline_stage_name,
        o.status AS opportunity_status
    FROM gold_coast_reporting.lead_response r
    LEFT JOIN gold_coast.opportunities_latest o
        ON o.opportunity_id = r.opportunity_id
    WHERE r.lead_created_at IS NOT NULL
)
SELECT
    opportunity_id,
    contact_id,
    coalesce(nullif(source, ''), 'unknown') AS lead_source,
    coalesce(nullif(assigned_to_user_id, ''), 'unknown') AS assigned_to_user_id,
    pipeline_name,
    pipeline_stage_name,
    opportunity_status,
    lead_created_at,
    first_response_at AS first_outbound_touch_at,
    minutes_to_first_response AS minutes_to_first_outbound_touch,
    CASE WHEN first_response_at IS NULL OR minutes_to_first_response > 15 THEN true ELSE false END AS missed_15_minute_sla,
    CASE WHEN first_response_at IS NULL OR minutes_to_first_response > 60 THEN true ELSE false END AS missed_1_hour_sla,
    CASE WHEN first_response_at IS NULL OR minutes_to_first_response > 1440 THEN true ELSE false END AS missed_24_hour_sla,
    first_outbound_call_at,
    first_outbound_message_at
FROM lead_response
WHERE first_response_at IS NULL
   OR minutes_to_first_response > 15
ORDER BY lead_created_at DESC
