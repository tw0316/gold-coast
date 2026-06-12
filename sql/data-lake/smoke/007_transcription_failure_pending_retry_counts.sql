-- Smoke check: latest transcription run has no failed or pending-retry work,
-- and no transcription run failed on the currently deployed image tag in the
-- last 24 hours.
--
-- This query uses gold_coast.job_run_status filtered to
-- job_name = 'ghl-call-transcription'. It returns counts only.
WITH transcription_runs AS (
    SELECT
        run_id,
        status,
        source_environment,
        image_tag,
        finished_at,
        try(from_iso8601_timestamp(finished_at)) AS finished_at_ts,
        coalesce(failed_count, 0) AS failed_count,
        coalesce(pending_retry_count, 0) AS pending_retry_count,
        coalesce(attempted_count, 0) AS attempted_count,
        coalesce(succeeded_count, 0) AS succeeded_count,
        coalesce(skipped_existing_count, 0) AS skipped_existing_count,
        coalesce(skipped_no_recording_count, 0) AS skipped_no_recording_count
    FROM gold_coast.job_run_status
    WHERE job_name = 'ghl-call-transcription'
      AND coalesce(dry_run, false) = false
      AND coalesce(execute_flag, true) = true
      AND lower(coalesce(source_environment, 'production')) IN ('prod', 'production')
),
latest_run AS (
    SELECT *
    FROM transcription_runs
    ORDER BY finished_at_ts DESC
    LIMIT 1
),
recent_failures AS (
    SELECT
        count(*) AS failed_run_count
    FROM transcription_runs
    WHERE status <> 'succeeded'
      AND image_tag = (SELECT image_tag FROM latest_run)
      AND finished_at_ts >= current_timestamp - INTERVAL '24' HOUR
)
SELECT
    'transcription_latest_run_failure_pending_retry_counts' AS check_name,
    CASE
        WHEN count(*) = 1
         AND max(status) = 'succeeded'
         AND max(failed_count) = 0
         AND max(pending_retry_count) = 0 THEN 'passed'
        ELSE 'failed'
    END AS result,
    max(run_id) AS run_id,
    max(status) AS status,
    max(attempted_count) AS attempted_count,
    max(succeeded_count) AS succeeded_count,
    max(failed_count) AS failed_count,
    max(pending_retry_count) AS pending_retry_count,
    max(skipped_existing_count) AS skipped_existing_count,
    max(skipped_no_recording_count) AS skipped_no_recording_count,
    CAST(NULL AS bigint) AS recent_failed_run_count
FROM latest_run

UNION ALL

SELECT
    'transcription_recent_failed_runs_24h' AS check_name,
    CASE WHEN failed_run_count = 0 THEN 'passed' ELSE 'failed' END AS result,
    CAST(NULL AS varchar) AS run_id,
    CAST(NULL AS varchar) AS status,
    CAST(NULL AS bigint) AS attempted_count,
    CAST(NULL AS bigint) AS succeeded_count,
    CAST(NULL AS bigint) AS failed_count,
    CAST(NULL AS bigint) AS pending_retry_count,
    CAST(NULL AS bigint) AS skipped_existing_count,
    CAST(NULL AS bigint) AS skipped_no_recording_count,
    failed_run_count AS recent_failed_run_count
FROM recent_failures
ORDER BY check_name;
