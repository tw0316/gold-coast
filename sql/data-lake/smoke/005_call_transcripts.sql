-- Smoke check: call transcript table grain, lineage, successful transcript body,
-- and allowed status values.
--
-- This query intentionally returns counts only. It does not expose transcript
-- text, recording URLs, raw provider payloads, or PII samples.
WITH transcript_rows AS (
    SELECT
        call_message_id,
        conversation_id,
        contact_id,
        opportunity_id,
        recording_object_key,
        recording_sha256,
        transcription_status,
        transcript_text,
        provider,
        transcription_model,
        artifact_schema_version
    FROM gold_coast.call_transcripts
),
identity_rollup AS (
    SELECT
        count(*) AS inspected_count,
        coalesce(CAST(sum(
            CASE
                WHEN nullif(trim(call_message_id), '') IS NULL THEN 1
                WHEN nullif(trim(artifact_schema_version), '') IS NULL THEN 1
                WHEN nullif(trim(provider), '') IS NULL THEN 1
                WHEN nullif(trim(transcription_model), '') IS NULL THEN 1
                WHEN nullif(trim(transcription_status), '') IS NULL THEN 1
                WHEN coalesce(transcription_status, '') <> 'skipped_no_recording'
                 AND nullif(trim(recording_sha256), '') IS NULL THEN 1
                ELSE 0
            END
        ) AS bigint), 0) AS missing_identity_count
    FROM transcript_rows
),
duplicate_groups AS (
    SELECT
        call_message_id,
        coalesce(recording_sha256, '__skipped_no_recording__') AS recording_sha256_key,
        artifact_schema_version,
        provider,
        transcription_model,
        count(*) AS row_count
    FROM transcript_rows
    GROUP BY
        call_message_id,
        coalesce(recording_sha256, '__skipped_no_recording__'),
        artifact_schema_version,
        provider,
        transcription_model
    HAVING count(*) > 1
),
duplicate_rollup AS (
    SELECT
        count(*) AS duplicate_group_count,
        coalesce(CAST(sum(row_count - 1) AS bigint), 0) AS duplicate_row_count
    FROM duplicate_groups
),
lineage_calls AS (
    SELECT
        count(*) AS inspected_count,
        coalesce(CAST(sum(CASE WHEN c.call_message_id IS NULL THEN 1 ELSE 0 END) AS bigint), 0) AS missing_call_count
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
),
succeeded_transcript_body AS (
    SELECT
        count(*) AS inspected_count,
        coalesce(CAST(sum(
            CASE
                WHEN nullif(trim(transcript_text), '') IS NULL THEN 1
                ELSE 0
            END
        ) AS bigint), 0) AS empty_succeeded_transcript_count
    FROM transcript_rows
    WHERE transcription_status = 'succeeded'
),
invalid_status AS (
    SELECT
        count(*) AS inspected_count,
        coalesce(CAST(sum(
            CASE
                WHEN transcription_status IN ('succeeded', 'failed', 'pending_retry', 'skipped_no_recording') THEN 0
                ELSE 1
            END
        ) AS bigint), 0) AS invalid_status_count
    FROM transcript_rows
)
SELECT
    'call_transcripts_duplicate_idempotency_grain' AS check_name,
    i.inspected_count,
    d.duplicate_group_count + i.missing_identity_count AS failed_count,
    CASE
        WHEN d.duplicate_group_count = 0
         AND d.duplicate_row_count = 0
         AND i.missing_identity_count = 0 THEN 'passed'
        ELSE 'failed'
    END AS result,
    concat(
        'duplicate_groups=', CAST(d.duplicate_group_count AS varchar),
        '; duplicate_rows=', CAST(d.duplicate_row_count AS varchar),
        '; missing_identity_rows=', CAST(i.missing_identity_count AS varchar)
    ) AS notes
FROM identity_rollup i
CROSS JOIN duplicate_rollup d

UNION ALL
SELECT
    'call_transcripts_lineage_to_calls' AS check_name,
    inspected_count,
    missing_call_count AS failed_count,
    CASE WHEN missing_call_count = 0 THEN 'passed' ELSE 'failed' END AS result,
    concat('missing_call_rows=', CAST(missing_call_count AS varchar)) AS notes
FROM lineage_calls

UNION ALL
SELECT
    'call_transcripts_lineage_to_recordings' AS check_name,
    inspected_count,
    missing_or_mismatched_recording_count AS failed_count,
    CASE WHEN missing_or_mismatched_recording_count = 0 THEN 'passed' ELSE 'failed' END AS result,
    concat('missing_or_mismatched_recording_rows=', CAST(missing_or_mismatched_recording_count AS varchar)) AS notes
FROM lineage_recordings

UNION ALL
SELECT
    'call_transcripts_succeeded_transcript_non_empty' AS check_name,
    inspected_count,
    empty_succeeded_transcript_count AS failed_count,
    CASE WHEN empty_succeeded_transcript_count = 0 THEN 'passed' ELSE 'failed' END AS result,
    concat('empty_succeeded_transcript_rows=', CAST(empty_succeeded_transcript_count AS varchar)) AS notes
FROM succeeded_transcript_body

UNION ALL
SELECT
    'call_transcripts_invalid_status' AS check_name,
    inspected_count,
    invalid_status_count AS failed_count,
    CASE WHEN invalid_status_count = 0 THEN 'passed' ELSE 'failed' END AS result,
    concat('invalid_status_rows=', CAST(invalid_status_count AS varchar)) AS notes
FROM invalid_status
ORDER BY check_name;
