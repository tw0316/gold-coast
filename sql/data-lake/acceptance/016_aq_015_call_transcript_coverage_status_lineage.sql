-- AQ-015: Validate call transcript coverage, status distribution, and lineage.
--
-- This acceptance query returns counts/statuses only. It intentionally does not
-- select transcript text, recording URLs, raw provider payloads, or PII samples.
WITH recorded_calls AS (
    SELECT
        call_message_id,
        recording_object_key,
        recording_sha256
    FROM gold_coast.calls
    WHERE has_recording
       OR nullif(trim(recording_sha256), '') IS NOT NULL
       OR nullif(trim(recording_object_key), '') IS NOT NULL
),
transcript_rows AS (
    SELECT
        call_message_id,
        recording_object_key,
        recording_sha256,
        transcription_status,
        provider,
        transcription_model,
        artifact_schema_version
    FROM gold_coast.call_transcripts
),
coverage_matches AS (
    SELECT
        c.call_message_id,
        max(CASE WHEN t.call_message_id IS NOT NULL THEN 1 ELSE 0 END) AS has_transcript
    FROM recorded_calls c
    LEFT JOIN transcript_rows t
        ON t.call_message_id = c.call_message_id
       AND (
            (
                nullif(trim(c.recording_sha256), '') IS NOT NULL
                AND t.recording_sha256 = c.recording_sha256
            )
            OR (
                nullif(trim(c.recording_sha256), '') IS NULL
                AND nullif(trim(c.recording_object_key), '') IS NOT NULL
                AND t.recording_object_key = c.recording_object_key
            )
       )
    GROUP BY c.call_message_id
),
coverage AS (
    SELECT
        count(*) AS recorded_call_count,
        coalesce(CAST(sum(has_transcript) AS bigint), 0) AS recorded_call_with_transcript_count,
        coalesce(CAST(sum(1 - has_transcript) AS bigint), 0) AS recorded_call_missing_transcript_count
    FROM coverage_matches
),
allowed_statuses AS (
    SELECT status_value
    FROM (
        VALUES
            ('succeeded'),
            ('failed'),
            ('pending_retry'),
            ('skipped_no_recording')
    ) AS statuses(status_value)
),
status_counts AS (
    SELECT
        coalesce(transcription_status, '__missing__') AS status_value,
        count(*) AS row_count
    FROM transcript_rows
    GROUP BY 1
),
total_transcript_rows AS (
    SELECT count(*) AS row_count
    FROM transcript_rows
),
invalid_status AS (
    SELECT
        coalesce(CAST(sum(
            CASE
                WHEN transcription_status IN ('succeeded', 'failed', 'pending_retry', 'skipped_no_recording') THEN 0
                ELSE 1
            END
        ) AS bigint), 0) AS invalid_status_count
    FROM transcript_rows
),
lineage_calls AS (
    SELECT
        count(*) AS inspected_count,
        coalesce(CAST(sum(CASE WHEN c.call_message_id IS NULL THEN 1 ELSE 0 END) AS bigint), 0)
            AS missing_call_count
    FROM transcript_rows t
    LEFT JOIN gold_coast.calls c
        ON c.call_message_id = t.call_message_id
),
lineage_recordings AS (
    SELECT
        coalesce(CAST(sum(CASE WHEN coalesce(t.transcription_status, '') <> 'skipped_no_recording' THEN 1 ELSE 0 END) AS bigint), 0)
            AS inspected_count,
        coalesce(CAST(sum(
            CASE
                WHEN coalesce(t.transcription_status, '') = 'skipped_no_recording' THEN 0
                WHEN r.message_id IS NULL THEN 1
                WHEN nullif(trim(t.recording_object_key), '') IS NULL THEN 1
                WHEN nullif(trim(t.recording_sha256), '') IS NULL THEN 1
                WHEN nullif(trim(r.object_key), '') IS NULL THEN 1
                WHEN t.recording_object_key <> r.object_key THEN 1
                WHEN nullif(trim(r.sha256), '') IS NOT NULL AND t.recording_sha256 <> r.sha256 THEN 1
                ELSE 0
            END
        ) AS bigint), 0) AS missing_or_mismatched_recording_count
    FROM transcript_rows t
    LEFT JOIN gold_coast.call_recordings r
        ON r.message_id = t.call_message_id
)
SELECT
    'call_transcript_coverage_recorded_calls' AS check_name,
    'all_recorded_calls' AS status_value,
    recorded_call_count AS inspected_count,
    recorded_call_with_transcript_count AS row_count,
    recorded_call_missing_transcript_count AS failed_count,
    CASE WHEN recorded_call_missing_transcript_count = 0 THEN 'passed' ELSE 'failed' END AS result
FROM coverage

UNION ALL
SELECT
    'call_transcript_status_distribution' AS check_name,
    s.status_value,
    t.row_count AS inspected_count,
    coalesce(c.row_count, 0) AS row_count,
    0 AS failed_count,
    'informational' AS result
FROM allowed_statuses s
CROSS JOIN total_transcript_rows t
LEFT JOIN status_counts c
    ON c.status_value = s.status_value

UNION ALL
SELECT
    'call_transcript_status_values_valid' AS check_name,
    'allowed_statuses' AS status_value,
    t.row_count AS inspected_count,
    t.row_count - i.invalid_status_count AS row_count,
    i.invalid_status_count AS failed_count,
    CASE WHEN i.invalid_status_count = 0 THEN 'passed' ELSE 'failed' END AS result
FROM total_transcript_rows t
CROSS JOIN invalid_status i

UNION ALL
SELECT
    'call_transcript_lineage_to_calls' AS check_name,
    'call_message_id' AS status_value,
    inspected_count,
    inspected_count - missing_call_count AS row_count,
    missing_call_count AS failed_count,
    CASE WHEN missing_call_count = 0 THEN 'passed' ELSE 'failed' END AS result
FROM lineage_calls

UNION ALL
SELECT
    'call_transcript_lineage_to_recordings' AS check_name,
    'recording_object_key_sha256' AS status_value,
    inspected_count,
    inspected_count - missing_or_mismatched_recording_count AS row_count,
    missing_or_mismatched_recording_count AS failed_count,
    CASE WHEN missing_or_mismatched_recording_count = 0 THEN 'passed' ELSE 'failed' END AS result
FROM lineage_recordings
ORDER BY check_name, status_value;
