-- Smoke check: V1.1 core and reporting tables have rows without snapshot/run filters.
WITH expected(table_name, min_rows) AS (
    VALUES
        ('gold_coast.contacts_latest', 1),
        ('gold_coast.opportunities_latest', 1),
        ('gold_coast.opportunity_stage_history', 1),
        ('gold_coast.messages', 1),
        ('gold_coast.calls', 1),
        ('gold_coast.call_recordings', 1),
        ('gold_coast_reporting.lead_response', 1),
        ('gold_coast_reporting.rep_activity_daily', 1)
),
observed AS (
    SELECT 'gold_coast.contacts_latest' AS table_name, count(*) AS row_count
    FROM gold_coast.contacts_latest

    UNION ALL
    SELECT 'gold_coast.opportunities_latest' AS table_name, count(*) AS row_count
    FROM gold_coast.opportunities_latest

    UNION ALL
    SELECT 'gold_coast.opportunity_stage_history' AS table_name, count(*) AS row_count
    FROM gold_coast.opportunity_stage_history

    UNION ALL
    SELECT 'gold_coast.messages' AS table_name, count(*) AS row_count
    FROM gold_coast.messages

    UNION ALL
    SELECT 'gold_coast.calls' AS table_name, count(*) AS row_count
    FROM gold_coast.calls

    UNION ALL
    SELECT 'gold_coast.call_recordings' AS table_name, count(*) AS row_count
    FROM gold_coast.call_recordings

    UNION ALL
    SELECT 'gold_coast_reporting.lead_response' AS table_name, count(*) AS row_count
    FROM gold_coast_reporting.lead_response

    UNION ALL
    SELECT 'gold_coast_reporting.rep_activity_daily' AS table_name, count(*) AS row_count
    FROM gold_coast_reporting.rep_activity_daily
)
SELECT
    'v1_1_row_availability' AS check_name,
    e.table_name,
    coalesce(o.row_count, 0) AS row_count,
    e.min_rows,
    CASE WHEN coalesce(o.row_count, 0) >= e.min_rows THEN 'passed' ELSE 'failed' END AS result
FROM expected e
LEFT JOIN observed o ON e.table_name = o.table_name
ORDER BY e.table_name;
