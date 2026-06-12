-- Athena table for Gold Coast GHL call transcript status and transcript text.
--
-- Grain:
--   One current row per call_message_id, recording_sha256, artifact_schema_version,
--   provider, and transcription_model. Rows with transcription_status =
--   'skipped_no_recording' may have no recording checksum.
--
-- Raw provider artifacts live under:
--   s3://gcoffers-data-lake/ai-artifacts/ghl/transcripts/v1/
--
-- Curated query rows live only under this LOCATION:
--   s3://gcoffers-data-lake/curated/ghl/v1_1/core/call_transcripts/
--
-- Do not point this table at raw audio, recording archives, run-status objects,
-- or the raw provider artifact prefix. Those locations have different grains
-- and may contain sensitive payloads not shaped for this query contract.
CREATE EXTERNAL TABLE IF NOT EXISTS gold_coast.call_transcripts (
    call_message_id string,
    conversation_id string,
    contact_id string,
    opportunity_id string,
    actor_user_id string,
    direction string,
    call_status string,
    recording_s3_uri string,
    recording_object_key string,
    recording_sha256 string,
    recording_content_type string,
    recording_byte_count bigint,
    recording_duration_seconds double,
    transcription_status string,
    transcript_text string,
    transcript_segments_json string,
    language string,
    provider string,
    transcription_model string,
    artifact_schema_version string,
    idempotency_key string,
    transcript_object_key string,
    provider_response_object_key string,
    usage_json string,
    error_json string,
    attempt_count int,
    first_attempted_at string,
    last_attempted_at string,
    transcribed_at string,
    source_call_run_id string,
    source_recording_run_id string,
    source_call_snapshot_at string,
    source_recording_snapshot_at string,
    run_id string,
    snapshot_at string
)
STORED AS PARQUET
LOCATION 's3://gcoffers-data-lake/curated/ghl/v1_1/core/call_transcripts/'
TBLPROPERTIES (
    'classification' = 'parquet',
    'parquet.compression' = 'SNAPPY'
);
