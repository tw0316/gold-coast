-- Smoke check: latest transcription run exposes the alert and log fields that
-- operators need through the shared job_run_status surface.
--
-- This query returns paths and statuses only. It does not read transcript text,
-- raw audio, recording URLs, provider payloads, contact examples, or secrets.
WITH latest_run AS (
    SELECT
        run_id,
        status,
        source_environment,
        image_tag,
        cloudwatch_log_url,
        status_s3_uri,
        log_s3_uri,
        alert_status,
        alert_error_json,
        finished_at,
        try(from_iso8601_timestamp(finished_at)) AS finished_at_ts
    FROM gold_coast.job_run_status
    WHERE job_name = 'ghl-call-transcription'
      AND coalesce(dry_run, false) = false
      AND coalesce(execute, true) = true
      AND lower(coalesce(source_environment, 'production')) IN ('prod', 'production')
    ORDER BY try(from_iso8601_timestamp(finished_at)) DESC
    LIMIT 1
),
field_checks AS (
    SELECT
        run_id,
        status,
        finished_at,
        'status_s3_uri' AS field_name,
        CASE
            WHEN status_s3_uri LIKE 's3://gcoffers-data-lake/run-status/ghl-call-transcription/runs/%/status.json'
                THEN 'passed'
            ELSE 'failed'
        END AS result,
        status_s3_uri AS observed_value
    FROM latest_run

    UNION ALL
    SELECT
        run_id,
        status,
        finished_at,
        'log_s3_uri' AS field_name,
        CASE
            WHEN log_s3_uri LIKE 's3://gcoffers-data-lake/run-status/ghl-call-transcription/logs/run=%.jsonl'
                THEN 'passed'
            ELSE 'failed'
        END AS result,
        log_s3_uri AS observed_value
    FROM latest_run

    UNION ALL
    SELECT
        run_id,
        status,
        finished_at,
        'alert_status' AS field_name,
        CASE
            WHEN alert_status IN (
                'posted',
                'failed',
                'skipped_policy',
                'skipped_missing_webhook',
                'skipped',
                'disabled'
            ) THEN 'passed'
            ELSE 'failed'
        END AS result,
        alert_status AS observed_value
    FROM latest_run

    UNION ALL
    SELECT
        run_id,
        status,
        finished_at,
        'cloudwatch_log_url' AS field_name,
        CASE
            WHEN nullif(trim(cloudwatch_log_url), '') IS NOT NULL THEN 'passed'
            ELSE 'failed'
        END AS result,
        cloudwatch_log_url AS observed_value
    FROM latest_run

    UNION ALL
    SELECT
        run_id,
        status,
        finished_at,
        'alert_error_json' AS field_name,
        CASE
            WHEN status = 'succeeded' AND (alert_error_json IS NULL OR alert_error_json = 'null') THEN 'passed'
            WHEN status <> 'succeeded' THEN 'passed'
            ELSE 'failed'
        END AS result,
        alert_error_json AS observed_value
    FROM latest_run
)
SELECT
    'transcription_alert_log_field_presence' AS check_name,
    field_name,
    result,
    run_id,
    status,
    finished_at,
    observed_value
FROM field_checks
ORDER BY field_name;
