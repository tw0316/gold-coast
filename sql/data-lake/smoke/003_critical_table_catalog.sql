-- Smoke check: required Athena tables exist in the gold_coast database.
-- Missing tables usually fail other smoke queries too, but this gives a direct catalog view.
WITH expected(table_name) AS (
    VALUES
        ('run_status_ghl'),
        ('contacts'),
        ('opportunities'),
        ('opportunity_stage_history'),
        ('messages'),
        ('calls'),
        ('call_recordings'),
        ('mart_lead_response'),
        ('mart_rep_activity_daily')
),
catalog AS (
    SELECT
        lower(table_name) AS table_name,
        table_type
    FROM information_schema.tables
    WHERE table_schema = 'gold_coast'
)
SELECT
    'critical_table_catalog' AS check_name,
    e.table_name,
    CASE WHEN c.table_name IS NULL THEN 'fail' ELSE 'pass' END AS result,
    c.table_type
FROM expected e
LEFT JOIN catalog c ON e.table_name = c.table_name
ORDER BY e.table_name;
