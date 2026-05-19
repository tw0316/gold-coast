-- Smoke check: latest eligible production-success run has rows in every critical curated table.
-- This query intentionally joins on both snapshot_date and run_id so repeated same-day runs
-- cannot accidentally read a stale partition.
WITH latest_success AS (
    SELECT
        run_id,
        snapshot_date
    FROM gold_coast.run_status_ghl
    WHERE status = 'succeeded'
      AND coalesce(dry_run, false) = false
      AND (
          coalesce(latest_pointers_published, false) = true
          OR (
              latest_pointers_published IS NULL
              AND manifest_s3_uri IS NOT NULL
              AND coalesce(cardinality(curated_tables), 0) > 0
          )
      )
    ORDER BY try(from_iso8601_timestamp(completed_at)) DESC
    LIMIT 1
),
expected(table_name, min_rows) AS (
    VALUES
        ('contacts', 1),
        ('opportunities', 1),
        ('opportunity_stage_history', 1),
        ('messages', 1),
        ('calls', 1),
        ('call_recordings', 1),
        ('mart_lead_response', 1),
        ('mart_rep_activity_daily', 1)
),
observed AS (
    SELECT 'contacts' AS table_name, count(*) AS row_count
    FROM gold_coast.contacts t
    JOIN latest_success r ON t.snapshot_date = r.snapshot_date AND t.run_id = r.run_id

    UNION ALL
    SELECT 'opportunities' AS table_name, count(*) AS row_count
    FROM gold_coast.opportunities t
    JOIN latest_success r ON t.snapshot_date = r.snapshot_date AND t.run_id = r.run_id

    UNION ALL
    SELECT 'opportunity_stage_history' AS table_name, count(*) AS row_count
    FROM gold_coast.opportunity_stage_history t
    JOIN latest_success r ON t.snapshot_date = r.snapshot_date AND t.run_id = r.run_id

    UNION ALL
    SELECT 'messages' AS table_name, count(*) AS row_count
    FROM gold_coast.messages t
    JOIN latest_success r ON t.snapshot_date = r.snapshot_date AND t.run_id = r.run_id

    UNION ALL
    SELECT 'calls' AS table_name, count(*) AS row_count
    FROM gold_coast.calls t
    JOIN latest_success r ON t.snapshot_date = r.snapshot_date AND t.run_id = r.run_id

    UNION ALL
    SELECT 'call_recordings' AS table_name, count(*) AS row_count
    FROM gold_coast.call_recordings t
    JOIN latest_success r ON t.snapshot_date = r.snapshot_date AND t.run_id = r.run_id

    UNION ALL
    SELECT 'mart_lead_response' AS table_name, count(*) AS row_count
    FROM gold_coast.mart_lead_response t
    JOIN latest_success r ON t.snapshot_date = r.snapshot_date AND t.run_id = r.run_id

    UNION ALL
    SELECT 'mart_rep_activity_daily' AS table_name, count(*) AS row_count
    FROM gold_coast.mart_rep_activity_daily t
    JOIN latest_success r ON t.snapshot_date = r.snapshot_date AND t.run_id = r.run_id
)
SELECT
    'latest_curated_row_availability' AS check_name,
    e.table_name,
    coalesce(o.row_count, 0) AS row_count,
    e.min_rows,
	    CASE WHEN coalesce(o.row_count, 0) >= e.min_rows THEN 'passed' ELSE 'failed' END AS result
FROM expected e
LEFT JOIN observed o ON e.table_name = o.table_name
ORDER BY e.table_name;
