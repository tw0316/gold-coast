-- Athena table for immutable Gold Coast GHL batch refresh run-status rows.
--
-- Historical rows live only under:
--   s3://gcoffers-data-lake/run-status/ghl/runs/run=<run_id>/status.json
--
-- Operational pointer objects stay outside this LOCATION:
--   s3://gcoffers-data-lake/run-status/ghl/latest-success.json
--   s3://gcoffers-data-lake/run-status/ghl/latest-failure.json
--
-- Do not repoint this table at s3://gcoffers-data-lake/run-status/ghl/.
-- Doing so would mix pointer objects and logs into historical run rows.
CREATE EXTERNAL TABLE IF NOT EXISTS gold_coast.run_status_ghl (
    run_id string,
    status string,
    source string,
    source_environment string,
    image_tag string,
    cloudwatch_log_url string,
    dry_run boolean,
    started_at string,
    completed_at string,
    duration_seconds double,
    lock struct<provider:string,ttl_seconds:int,acquired:boolean>,
    manifest_s3_uri string,
    snapshot_date string,
    snapshot_at string,
    entity_counts map<string,bigint>,
    recordings struct<attempted:bigint,archived:bigint,skipped_existing:bigint,unavailable:bigint>,
    curated_tables map<string,bigint>,
    smoke_checks array<struct<check_name:string,name:string,status:string,checked_at:string,queried_tables:array<string>,query_execution_ids:array<string>,freshness_result:struct<status:string,snapshot_at:string,age_minutes:double,max_age_minutes:int,query_execution_id:string>,row_availability_result:struct<status:string,table_counts:map<string,bigint>,missing_tables:array<string>,failed_tables:array<string>,query_execution_id:string>,duplicate_result:struct<status:string,failed_checks:array<string>,checks:map<string,struct<table_name:string,key_column:string,duplicate_count:bigint,null_key_count:bigint,status:string>>,query_execution_id:string>,error:string>>,
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
LOCATION 's3://gcoffers-data-lake/run-status/ghl/runs/'
TBLPROPERTIES (
    'classification' = 'json'
);
