-- Smoke check: latest successful production transcription run is recent.
--
-- This query uses the official shared operator surface, not the raw
-- implementation-detail transcription run-status table.
-- Pass target: latest eligible production success finished within 120 minutes.
WITH transcription_runs AS (
    SELECT
        run_id,
        status,
        source_environment,
        image_tag,
        cloudwatch_log_url,
        status_s3_uri,
        log_s3_uri,
        alert_status,
        started_at,
        finished_at,
        try(from_iso8601_timestamp(finished_at)) AS finished_at_ts
    FROM gold_coast.job_run_status
    WHERE job_name = 'ghl-call-transcription'
      AND coalesce(dry_run, false) = false
      AND coalesce(execute_flag, true) = true
      AND lower(coalesce(source_environment, 'production')) IN ('prod', 'production')
),
latest_success AS (
    SELECT *
    FROM transcription_runs
    WHERE status = 'succeeded'
    ORDER BY finished_at_ts DESC
    LIMIT 1
)
SELECT
    'transcription_latest_success_freshness' AS check_name,
    CASE
        WHEN count(*) = 1
         AND max(finished_at_ts) >= current_timestamp - INTERVAL '120' MINUTE THEN 'passed'
        ELSE 'failed'
    END AS result,
    max(run_id) AS run_id,
    max(status) AS status,
    max(source_environment) AS source_environment,
    max(image_tag) AS image_tag,
    max(cloudwatch_log_url) AS cloudwatch_log_url,
    max(started_at) AS started_at,
    max(finished_at) AS finished_at,
    date_diff('minute', max(finished_at_ts), current_timestamp) AS age_minutes,
    120 AS max_allowed_age_minutes,
    max(status_s3_uri) AS status_s3_uri,
    max(log_s3_uri) AS log_s3_uri,
    max(alert_status) AS alert_status
FROM latest_success;
