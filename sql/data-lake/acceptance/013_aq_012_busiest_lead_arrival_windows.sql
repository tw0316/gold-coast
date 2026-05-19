-- AQ-012: Identify busiest lead-arrival windows by hour of day and day of week.
-- Assumptions: lead arrival time is opportunities.created_at.
WITH latest_snapshot AS (
    SELECT max(snapshot_date) AS snapshot_date
    FROM gold_coast.opportunities
),
lead_arrivals AS (
    SELECT
        day_of_week(created_at) AS day_of_week_number,
        CASE day_of_week(created_at)
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
            WHEN 7 THEN 'Sunday'
            ELSE 'unknown'
        END AS day_of_week_name,
        hour(created_at) AS hour_of_day,
        coalesce(nullif(source, ''), 'unknown') AS lead_source,
        opportunity_id
    FROM gold_coast.opportunities
    WHERE snapshot_date = (SELECT snapshot_date FROM latest_snapshot)
      AND created_at IS NOT NULL
)
SELECT
    day_of_week_number,
    day_of_week_name,
    hour_of_day,
    lead_source,
    count(*) AS new_leads
FROM lead_arrivals
GROUP BY 1, 2, 3, 4
ORDER BY new_leads DESC, day_of_week_number, hour_of_day, lead_source

