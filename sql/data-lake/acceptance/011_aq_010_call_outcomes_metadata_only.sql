-- AQ-010: Summarize call outcomes/statuses from metadata only, without transcription or coaching analysis.
-- Assumptions: outcome uses call_status when present, otherwise message-level status.
WITH latest_snapshot AS (
    SELECT max(snapshot_date) AS snapshot_date
    FROM gold_coast.calls
),
calls_latest AS (
    SELECT
        CAST(date_added AS date) AS call_date,
        coalesce(nullif(direction, ''), 'unknown') AS direction,
        coalesce(nullif(call_status, ''), nullif(status, ''), 'unknown') AS outcome_status,
        duration_seconds,
        has_recording
    FROM gold_coast.calls
    WHERE snapshot_date = (SELECT snapshot_date FROM latest_snapshot)
      AND date_added IS NOT NULL
)
SELECT
    call_date,
    direction,
    outcome_status,
    count(*) AS calls,
    round(avg(duration_seconds), 2) AS avg_duration_seconds,
    approx_percentile(duration_seconds, 0.5) AS median_duration_seconds,
    sum(CASE WHEN has_recording THEN 1 ELSE 0 END) AS calls_with_recording,
    sum(CASE WHEN NOT has_recording THEN 1 ELSE 0 END) AS calls_without_recording
FROM calls_latest
GROUP BY 1, 2, 3
ORDER BY call_date DESC, calls DESC, direction, outcome_status

