-- Implementation-detail Athena table for immutable Gold Coast GHL call
-- transcription run-status rows.
--
-- Historical rows live only under:
--   s3://gcoffers-data-lake/run-status/ghl-call-transcription/runs/run=<run_id>/status.json
--
-- Operational pointer objects and JSONL logs stay outside this LOCATION:
--   s3://gcoffers-data-lake/run-status/ghl-call-transcription/latest-success.json
--   s3://gcoffers-data-lake/run-status/ghl-call-transcription/latest-failure.json
--   s3://gcoffers-data-lake/run-status/ghl-call-transcription/logs/run=<run_id>.jsonl
--
-- Do not point this table at s3://gcoffers-data-lake/run-status/ghl-call-transcription/.
-- Doing so would mix pointer objects and logs into historical run rows.
--
-- Operator queries should use gold_coast.job_run_status with
-- job_name = 'ghl-call-transcription'. This raw table exists only to back
-- the shared operator query surface.
CREATE EXTERNAL TABLE IF NOT EXISTS gold_coast.run_status_ghl_call_transcription_raw (
    source string,
    entrypoint string,
    run_id string,
    status string,
    dry_run boolean,
    sample boolean,
    execute boolean,
    started_at string,
    finished_at string,
    duration_seconds double,
    provider string,
    transcription_model string,
    fallback_model string,
    openai_secret_configured boolean,
    artifact_schema_version string,
    s3_bucket_configured boolean,
    status_s3_configured boolean,
    source_environment string,
    image_tag string,
    cloudwatch_log_url string,
    glue_database string,
    athena_workgroup string,
    lock struct<provider:string,name:string,ttl_seconds:int,acquired:boolean>,
    limits struct<max_calls:int,max_transcriptions_per_run:int,effective_selection_limit:int,recording_max_bytes:bigint>,
    selection struct<selected_calls:bigint,existing_rows_loaded:bigint,skipped_existing:bigint,skipped_no_recording:bigint,skipped_over_cap:bigint>,
    transcriptions struct<attempted:bigint,succeeded:bigint,failed:bigint,pending_retry:bigint>,
    artifacts struct<provider_artifacts_written:bigint,curated_rows_submitted:bigint>,
    published struct<written:struct<name:string,database:string,row_count:bigint,s3_key:string,byte_count:bigint,object_count:bigint>,glue:struct<database:string,name:string,action:string>>,
    notes array<string>,
    log_path string,
    latest_pointers_published boolean,
    latest_pointer_publish_target string,
    latest_pointer_skip_reason string,
    alert_status string,
    error map<string,string>,
    alert_error map<string,string>
)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
WITH SERDEPROPERTIES (
    'case.insensitive' = 'FALSE',
    'ignore.malformed.json' = 'FALSE'
)
LOCATION 's3://gcoffers-data-lake/run-status/ghl-call-transcription/runs/'
TBLPROPERTIES (
    'classification' = 'json'
);
