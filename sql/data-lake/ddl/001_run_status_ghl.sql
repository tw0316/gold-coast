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
    smoke_checks array<struct<check_name:string,name:string,status:string,query_execution_id:string,sql_file:string,checked_at:string>>,
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
