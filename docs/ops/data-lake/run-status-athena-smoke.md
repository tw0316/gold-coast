# Gold Coast Data Lake Run Status And Athena Smoke Checks

## Scope

This doc covers the production GHL batch refresh run-status path contract, the in-run Athena smoke result captured in each production status artifact, and the operator smoke queries used after deploy or manual refresh.

No dashboard is required. The checks use Athena SQL files under sql/data-lake/.

## Run-Status Paths

Production S3 bucket:

~~~text
s3://gcoffers-data-lake/
~~~

Historical per-run rows live under a dedicated prefix:

~~~text
run-status/ghl/runs/run=<run_id>/status.json
~~~

Operational pointers live beside, not inside, that historical prefix:

~~~text
run-status/ghl/latest-success.json
run-status/ghl/latest-failure.json
~~~

Logs and lock files are not historical Athena rows:

~~~text
run-status/ghl/logs/run=<run_id>.jsonl
run-status/ghl/locks/ghl-refresh.lock
~~~

Local runner output mirrors the same shape under apps/data-lake/data/run-status/ghl/:

~~~text
apps/data-lake/data/run-status/ghl/
  runs/run=<run_id>/status.json
  latest-success.json
  latest-failure.json
  logs/run=<run_id>.jsonl
  locks/ghl-refresh.lock
~~~

latest-success.json and latest-failure.json are pointers for operators and automation. They are intentionally excluded from the Athena historical table.

In production execute mode, the runner uploads these artifacts when `--status-s3-bucket` is provided. If `--status-s3-bucket` is omitted, a non-dry-run execute with `--s3-bucket` uses that bucket for status artifacts too. `--status-s3-prefix` can override the raw-output prefix if a prefixed lake layout is ever used.

Runner dry-runs do not create a status S3 uploader. Execute-mode diagnostics, including `--extractor-dry-run`, may upload immutable historical status/log artifacts when a status bucket is supplied, but they do not publish `latest-success.json` or `latest-failure.json`.

`latest-success.json` and `latest-failure.json` are published only for eligible production refresh runs. Ineligible runs include runner dry-runs, extractor dry-runs, `--skip-curated`, `--skip-glue`, `--max-items`, `--max-pages`, entity subsets, pipeline/conversation/message filters, non-production environments, and successful runs missing a manifest or curated-table output. Every status payload includes `latest_pointers_published`, `latest_pointer_publish_target`, and `latest_pointer_skip_reason` so operators can see why a pointer did or did not move.

The immutable `status.json` file is single-line JSON so Athena can read it with the JSON SerDe. Pointer files can remain human-readable because they are excluded from the historical table location.

## Athena Table

Register or refresh the run-status table with:

~~~bash
aws athena start-query-execution \
  --work-group gold_coast_data_lake \
  --query-execution-context Database=gold_coast \
  --result-configuration OutputLocation=s3://gcoffers-data-lake/athena-results/ghl/smoke/ \
  --query-string file://$PWD/sql/data-lake/ddl/001_run_status_ghl.sql
~~~

The table is:

~~~text
gold_coast.run_status_ghl
~~~

Its location is only:

~~~text
s3://gcoffers-data-lake/run-status/ghl/runs/
~~~

Do not point it at s3://gcoffers-data-lake/run-status/ghl/. That broader prefix includes pointer objects and logs.

The table exposes `image_tag`, `cloudwatch_log_url`, `smoke_checks`, `latest_pointers_published`, `latest_pointer_publish_target`, and `latest_pointer_skip_reason` as nullable top-level columns. The batch CLI reads `IMAGE_TAG` through `--image-tag` and continues to read `CLOUDWATCH_LOG_URL` through `--cloudwatch-log-url`.

Each eligible production refresh runs Athena against the freshly published `snapshot_date` and `run_id` before writing final status. The status artifact's `smoke_checks` array must be non-empty and all check statuses must be `passed`; otherwise the runner marks the run `failed` and publishes `latest-failure.json` instead of advancing `latest-success.json`. Config-missing smoke checks are recorded as `not_run`, which also fails eligible production final validation.

## Smoke Checks

Run these after the deploy-created table exists and after a successful manual or scheduled production refresh:

~~~bash
aws athena start-query-execution \
  --work-group gold_coast_data_lake \
  --query-execution-context Database=gold_coast \
  --result-configuration OutputLocation=s3://gcoffers-data-lake/athena-results/ghl/smoke/ \
  --query-string file://$PWD/sql/data-lake/smoke/001_latest_success_freshness.sql

aws athena start-query-execution \
  --work-group gold_coast_data_lake \
  --query-execution-context Database=gold_coast \
  --result-configuration OutputLocation=s3://gcoffers-data-lake/athena-results/ghl/smoke/ \
  --query-string file://$PWD/sql/data-lake/smoke/002_latest_curated_row_availability.sql

aws athena start-query-execution \
  --work-group gold_coast_data_lake \
  --query-execution-context Database=gold_coast \
  --result-configuration OutputLocation=s3://gcoffers-data-lake/athena-results/ghl/smoke/ \
  --query-string file://$PWD/sql/data-lake/smoke/003_critical_table_catalog.sql
~~~

For each returned query execution ID, inspect completion and results:

~~~bash
aws athena get-query-execution --query-execution-id <query-execution-id>
aws athena get-query-results --query-execution-id <query-execution-id>
~~~

Pass criteria:

- 001_latest_success_freshness.sql returns one row with result = `passed` and includes `image_tag` plus `cloudwatch_log_url` when the runner provided them.
- 002_latest_curated_row_availability.sql returns every table with result = `passed`.
- 003_critical_table_catalog.sql returns every expected table with result = `passed`.
- No query output contains credentials, raw SMS bodies, raw contact dumps, presigned recording URLs, or webhook URLs.

The freshness check allows 120 minutes. The production cadence is 30 minutes, but the wider smoke threshold avoids false failure during first deploy, manual verification, or a temporarily paused schedule.

## Failure Handling

If freshness fails:

- Check whether the schedule is intentionally disabled.
- Check the latest run-status/ghl/latest-failure.json pointer.
- Check the CloudWatch ECS task log stream from the failed run.
- Do not advance latest-success manually.

If row availability fails:

- Confirm run_status_ghl points only at run-status/ghl/runs/.
- Confirm the latest successful run's snapshot_date and run_id partitions exist for each curated table.
- Keep the prior known-good latest-success pointer intact until a new run passes smoke checks.

If catalog availability fails:

- Re-run the DDL for missing external tables or repair the Glue registration path.
- Do not enable the 30-minute schedule until the catalog check passes.
