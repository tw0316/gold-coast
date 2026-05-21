-- Smoke check: eligible recorded calls have transcript rows after the latest
-- successful transcription job run.
--
-- This query intentionally returns counts only. It does not expose transcript
-- text, raw audio, recording URLs, provider payloads, or contact examples.
WITH latest_success AS (
    SELECT
        run_id,
        finished_at,
        try(from_iso8601_timestamp(finished_at)) AS finished_at_ts
    FROM gold_coast.job_run_status
    WHERE job_name = 'ghl-call-transcription'
      AND status = 'succeeded'
      AND coalesce(dry_run, false) = false
      AND coalesce(execute, true) = true
      AND lower(coalesce(source_environment, 'production')) IN ('prod', 'production')
    ORDER BY try(from_iso8601_timestamp(finished_at)) DESC
    LIMIT 1
),
recorded_calls AS (
    SELECT
        c.call_message_id,
        coalesce(r.object_key, c.recording_object_key) AS recording_object_key,
        coalesce(r.sha256, c.recording_sha256) AS recording_sha256
    FROM gold_coast.calls c
    JOIN gold_coast.call_recordings r
        ON r.message_id = c.call_message_id
    WHERE coalesce(c.has_recording, false) = true
      AND nullif(trim(coalesce(r.object_key, c.recording_object_key)), '') IS NOT NULL
),
transcript_rows AS (
    SELECT
        call_message_id,
        recording_object_key,
        recording_sha256,
        transcription_status
    FROM gold_coast.call_transcripts
),
coverage_matches AS (
    SELECT
        c.call_message_id,
        max(CASE WHEN t.call_message_id IS NOT NULL THEN 1 ELSE 0 END) AS has_transcript,
        max(CASE WHEN t.transcription_status = 'succeeded' THEN 1 ELSE 0 END) AS has_succeeded_transcript,
        max(CASE WHEN t.transcription_status IN ('failed', 'pending_retry') THEN 1 ELSE 0 END) AS has_failed_or_retry_transcript
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
        coalesce(CAST(sum(has_succeeded_transcript) AS bigint), 0) AS recorded_call_with_succeeded_transcript_count,
        coalesce(CAST(sum(has_failed_or_retry_transcript) AS bigint), 0) AS recorded_call_failed_or_pending_retry_count,
        coalesce(CAST(sum(1 - has_transcript) AS bigint), 0) AS recorded_call_missing_transcript_count
    FROM coverage_matches
)
SELECT
    'transcription_recorded_call_coverage' AS check_name,
    CASE
        WHEN count(ls.run_id) = 1
         AND max(c.recorded_call_missing_transcript_count) = 0
         AND max(c.recorded_call_failed_or_pending_retry_count) = 0 THEN 'passed'
        ELSE 'failed'
    END AS result,
    max(ls.run_id) AS latest_transcription_run_id,
    max(ls.finished_at) AS latest_transcription_finished_at,
    max(c.recorded_call_count) AS recorded_call_count,
    max(c.recorded_call_with_transcript_count) AS recorded_call_with_transcript_count,
    max(c.recorded_call_with_succeeded_transcript_count) AS recorded_call_with_succeeded_transcript_count,
    max(c.recorded_call_missing_transcript_count) AS recorded_call_missing_transcript_count,
    max(c.recorded_call_failed_or_pending_retry_count) AS recorded_call_failed_or_pending_retry_count
FROM coverage c
LEFT JOIN latest_success ls ON true;
