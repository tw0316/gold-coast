-- Shared Athena operator query surface for Gold Coast scheduled/background
-- job run status.
--
-- Official operator path:
--   SELECT * FROM gold_coast.job_run_status WHERE job_name = '<job>';
--
-- Backing per-job tables are implementation details. Do not point any backing
-- table at a parent run-status prefix that includes latest pointer files,
-- JSONL logs, locks, or other non-status objects.
CREATE OR REPLACE VIEW gold_coast.job_run_status AS
SELECT
    'ghl-refresh' AS job_name,
    run_id,
    status,
    source,
    source_environment,
    started_at,
    completed_at AS finished_at,
    duration_seconds,
    image_tag,
    cloudwatch_log_url,
    "$path" AS status_s3_uri,
    log_path AS log_s3_uri,
    alert_status,
    CAST(NULL AS varchar) AS provider,
    CAST(NULL AS varchar) AS transcription_model,
    CAST(NULL AS varchar) AS artifact_schema_version,
    CAST(NULL AS bigint) AS selected_count,
    CAST(recordings.attempted AS bigint) AS attempted_count,
    CAST(recordings.archived AS bigint) AS succeeded_count,
    CAST(recordings.unavailable AS bigint) AS failed_count,
    CAST(NULL AS bigint) AS pending_retry_count,
    CAST(recordings.skipped_existing AS bigint) AS skipped_existing_count,
    CAST(NULL AS bigint) AS skipped_no_recording_count,
    json_format(CAST(MAP(
        ARRAY[
            'recordings_attempted',
            'recordings_archived',
            'recordings_skipped_existing',
            'recordings_unavailable'
        ],
        ARRAY[
            coalesce(CAST(recordings.attempted AS bigint), 0),
            coalesce(CAST(recordings.archived AS bigint), 0),
            coalesce(CAST(recordings.skipped_existing AS bigint), 0),
            coalesce(CAST(recordings.unavailable AS bigint), 0)
        ]
    ) AS JSON)) AS metrics_json,
    json_format(CAST(error AS JSON)) AS error_json,
    json_format(CAST(alert_error AS JSON)) AS alert_error_json,
    dry_run,
    CAST(NULL AS boolean) AS sample,
    CAST(NULL AS boolean) AS execute,
    snapshot_at,
    latest_pointers_published,
    latest_pointer_publish_target,
    latest_pointer_skip_reason
FROM gold_coast.run_status_ghl

UNION ALL

SELECT
    'ghl-call-transcription' AS job_name,
    run_id,
    status,
    source,
    source_environment,
    started_at,
    finished_at,
    coalesce(
        duration_seconds,
        CAST(date_diff('second', try(from_iso8601_timestamp(started_at)), try(from_iso8601_timestamp(finished_at))) AS double)
    ) AS duration_seconds,
    image_tag,
    cloudwatch_log_url,
    "$path" AS status_s3_uri,
    log_path AS log_s3_uri,
    alert_status,
    provider,
    transcription_model,
    artifact_schema_version,
    CAST(selection.selected_calls AS bigint) AS selected_count,
    CAST(transcriptions.attempted AS bigint) AS attempted_count,
    CAST(transcriptions.succeeded AS bigint) AS succeeded_count,
    CAST(transcriptions.failed AS bigint) AS failed_count,
    CAST(transcriptions.pending_retry AS bigint) AS pending_retry_count,
    CAST(selection.skipped_existing AS bigint) AS skipped_existing_count,
    CAST(selection.skipped_no_recording AS bigint) AS skipped_no_recording_count,
    json_format(CAST(MAP(
        ARRAY[
            'selected_calls',
            'existing_rows_loaded',
            'skipped_existing',
            'skipped_no_recording',
            'skipped_over_cap',
            'attempted',
            'succeeded',
            'failed',
            'pending_retry',
            'provider_artifacts_written',
            'curated_rows_submitted'
        ],
        ARRAY[
            coalesce(CAST(selection.selected_calls AS bigint), 0),
            coalesce(CAST(selection.existing_rows_loaded AS bigint), 0),
            coalesce(CAST(selection.skipped_existing AS bigint), 0),
            coalesce(CAST(selection.skipped_no_recording AS bigint), 0),
            coalesce(CAST(selection.skipped_over_cap AS bigint), 0),
            coalesce(CAST(transcriptions.attempted AS bigint), 0),
            coalesce(CAST(transcriptions.succeeded AS bigint), 0),
            coalesce(CAST(transcriptions.failed AS bigint), 0),
            coalesce(CAST(transcriptions.pending_retry AS bigint), 0),
            coalesce(CAST(artifacts.provider_artifacts_written AS bigint), 0),
            coalesce(CAST(artifacts.curated_rows_submitted AS bigint), 0)
        ]
    ) AS JSON)) AS metrics_json,
    json_format(CAST(error AS JSON)) AS error_json,
    json_format(CAST(alert_error AS JSON)) AS alert_error_json,
    dry_run,
    sample,
    execute,
    CAST(NULL AS varchar) AS snapshot_at,
    latest_pointers_published,
    latest_pointer_publish_target,
    latest_pointer_skip_reason
FROM gold_coast.run_status_ghl_call_transcription_raw;
