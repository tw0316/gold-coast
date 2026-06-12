-- Smoke check: required V1.1 Athena tables exist in the core and reporting databases.
WITH expected(table_schema, table_name) AS (
    VALUES
        ('gold_coast', 'run_status_ghl'),
        ('gold_coast', 'contacts_latest'),
        ('gold_coast', 'opportunities_latest'),
        ('gold_coast', 'opportunity_stage_history'),
        ('gold_coast', 'messages'),
        ('gold_coast', 'calls'),
        ('gold_coast', 'call_recordings'),
        ('gold_coast_reporting', 'lead_response'),
        ('gold_coast_reporting', 'rep_activity_daily')
),
catalog AS (
    SELECT
        lower(table_schema) AS table_schema,
        lower(table_name) AS table_name,
        table_type
    FROM information_schema.tables
    WHERE table_schema IN ('gold_coast', 'gold_coast_reporting')
)
SELECT
    'critical_table_catalog' AS check_name,
    e.table_schema,
    e.table_name,
    CASE WHEN c.table_name IS NULL THEN 'failed' ELSE 'passed' END AS result,
    c.table_type
FROM expected e
LEFT JOIN catalog c
    ON c.table_schema = e.table_schema
   AND c.table_name = e.table_name
ORDER BY e.table_schema, e.table_name;
