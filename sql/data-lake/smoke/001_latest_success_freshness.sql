-- Smoke check: latest successful production GHL refresh is recent.
-- Pass target: latest eligible production-success status row completed within the last 120 minutes.
WITH latest_success AS (
    SELECT
        run_id,
        snapshot_date,
        snapshot_at,
        image_tag,
        cloudwatch_log_url,
        completed_at,
        try(from_iso8601_timestamp(completed_at)) AS completed_at_ts
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
)
SELECT
    'latest_success_freshness' AS check_name,
    CASE
        WHEN count(*) = 1
         AND max(completed_at_ts) >= current_timestamp - INTERVAL '120' MINUTE
	        THEN 'passed'
	        ELSE 'failed'
    END AS result,
    max(run_id) AS run_id,
    max(snapshot_date) AS snapshot_date,
    max(snapshot_at) AS snapshot_at,
    max(image_tag) AS image_tag,
    max(cloudwatch_log_url) AS cloudwatch_log_url,
    max(completed_at) AS completed_at,
    date_diff('minute', max(completed_at_ts), current_timestamp) AS age_minutes,
    120 AS max_allowed_age_minutes
FROM latest_success;
