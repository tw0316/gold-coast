-- AQ-008: Show appointment-set rate by source, user, and week.
-- Assumptions: no appointment fact table exists in MVP; appointment-set is a best-effort signal from current opportunity stage/status/raw text.
WITH opportunities_latest AS (
    SELECT
        opportunity_id,
        CAST(date_trunc('week', created_at) AS date) AS lead_created_week,
        coalesce(nullif(source, ''), 'unknown') AS lead_source,
        coalesce(nullif(assigned_to_user_id, ''), 'unknown') AS assigned_to_user_id,
        pipeline_name,
        pipeline_stage_name,
        status,
        lower(
            concat(
                coalesce(pipeline_stage_name, ''), ' ',
                coalesce(status, ''), ' ',
                coalesce(raw_json, '')
            )
        ) AS searchable_text
    FROM gold_coast.opportunities_latest
    WHERE created_at IS NOT NULL
)
SELECT
    lead_created_week,
    lead_source,
    assigned_to_user_id,
    coalesce(nullif(pipeline_name, ''), 'unknown') AS pipeline_name,
    count(*) AS leads,
    sum(CASE WHEN regexp_like(searchable_text, 'appointment|appt|booked|scheduled') THEN 1 ELSE 0 END) AS appointment_set_leads,
    round(
        100.0 * sum(CASE WHEN regexp_like(searchable_text, 'appointment|appt|booked|scheduled') THEN 1 ELSE 0 END) / nullif(count(*), 0),
        2
    ) AS appointment_set_rate_pct
FROM opportunities_latest
GROUP BY 1, 2, 3, 4
ORDER BY lead_created_week DESC, appointment_set_rate_pct DESC, leads DESC
