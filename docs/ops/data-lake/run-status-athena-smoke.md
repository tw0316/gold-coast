# Gold Coast Data Lake Run Status And Athena Smoke Checks

## Scope

This doc covers the production GHL batch refresh and call transcription run-status path contracts, the shared Athena operator surface, and smoke queries used after deploy or manual refresh.

No dashboard is required. The checks use Athena SQL files under sql/data-lake/.

## Official Operator Surface

Use the shared query surface for operator run-status queries:

~~~sql
SELECT *
FROM gold_coast.job_run_status
WHERE job_name = 'ghl-refresh'
ORDER BY try(from_iso8601_timestamp(finished_at)) DESC;

SELECT *
FROM gold_coast.job_run_status
WHERE job_name = 'ghl-call-transcription'
ORDER BY try(from_iso8601_timestamp(finished_at)) DESC;
~~~

`gold_coast.job_run_status` is the official operator path. Per-job run-status tables are backing implementation details, not the query contract for humans or automations.

## Run-Status Paths

Production S3 bucket:

~~~text
s3://gcoffers-data-lake/
~~~

Historical core refresh per-run rows live under a dedicated prefix:

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

Historical call transcription per-run rows live under a separate dedicated prefix:

~~~text
run-status/ghl-call-transcription/runs/run=<run_id>/status.json
~~~

Transcription pointer files and JSONL logs live beside, not inside, that historical prefix:

~~~text
run-status/ghl-call-transcription/latest-success.json
run-status/ghl-call-transcription/latest-failure.json
run-status/ghl-call-transcription/logs/run=<run_id>.jsonl
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

latest-success.json and latest-failure.json are pointers for operators and automation. They are intentionally excluded from Athena historical table locations.

In production execute mode, the runner uploads these artifacts when `--status-s3-bucket` is provided. If `--status-s3-bucket` is omitted, a non-dry-run execute with `--s3-bucket` uses that bucket for status artifacts too. `--status-s3-prefix` can override the raw-output prefix if a prefixed lake layout is ever used.

Runner dry-runs do not create a status S3 uploader. Execute-mode diagnostics, including `--extractor-dry-run`, may upload immutable historical status/log artifacts when a status bucket is supplied, but they do not publish `latest-success.json` or `latest-failure.json`.

`latest-success.json` and `latest-failure.json` are published only for eligible production refresh runs. Ineligible runs include runner dry-runs, extractor dry-runs, `--skip-curated`, `--skip-glue`, `--max-items`, `--max-pages`, entity subsets, pipeline/conversation/message filters, non-production environments, and successful runs missing a manifest or curated-table output. Every status payload includes `latest_pointers_published`, `latest_pointer_publish_target`, and `latest_pointer_skip_reason` so operators can see why a pointer did or did not move.

The immutable `status.json` file is single-line JSON so Athena can read it with the JSON SerDe. Pointer files can remain human-readable because they are excluded from the historical table location.

## Athena Tables And View

Register or refresh the core refresh implementation-detail table with:

~~~bash
aws athena start-query-execution \
  --work-group gold_coast_data_lake \
  --query-execution-context Database=gold_coast \
  --result-configuration OutputLocation=s3://gcoffers-data-lake/athena-results/ \
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

Register or refresh the call transcription implementation-detail table with:

~~~bash
aws athena start-query-execution \
  --work-group gold_coast_data_lake \
  --query-execution-context Database=gold_coast \
  --result-configuration OutputLocation=s3://gcoffers-data-lake/athena-results/ \
  --query-string file://$PWD/sql/data-lake/ddl/003_run_status_ghl_call_transcription_raw.sql
~~~

The table is:

~~~text
gold_coast.run_status_ghl_call_transcription_raw
~~~

Its location is only:

~~~text
s3://gcoffers-data-lake/run-status/ghl-call-transcription/runs/
~~~

Do not point it at s3://gcoffers-data-lake/run-status/ghl-call-transcription/. That broader prefix includes pointer objects and JSONL logs.

Create or refresh the shared operator view after both backing tables exist:

~~~bash
aws athena start-query-execution \
  --work-group gold_coast_data_lake \
  --query-execution-context Database=gold_coast \
  --result-configuration OutputLocation=s3://gcoffers-data-lake/athena-results/ \
  --query-string file://$PWD/sql/data-lake/ddl/004_job_run_status.sql
~~~

The view is:

~~~text
gold_coast.job_run_status
~~~

DDL order:

- `001_run_status_ghl.sql`
- `003_run_status_ghl_call_transcription_raw.sql`
- `004_job_run_status.sql`
- `002_call_transcripts.sql`, if the transcript table is not already registered and transcript coverage smoke will be run

The table exposes `image_tag`, `cloudwatch_log_url`, `smoke_checks`, `latest_pointers_published`, `latest_pointer_publish_target`, and `latest_pointer_skip_reason` as nullable top-level columns. The batch CLI reads `IMAGE_TAG` through `--image-tag` and continues to read `CLOUDWATCH_LOG_URL` through `--cloudwatch-log-url`.

Each eligible production refresh runs Athena against the freshly published V1.1 core/reporting tables before writing final status. The status artifact's `smoke_checks` array must be non-empty and all check statuses must be `passed`; otherwise the runner marks the run `failed` and publishes `latest-failure.json` instead of advancing `latest-success.json`. Config-missing smoke checks are recorded as `not_run`, which also fails eligible production final validation. The Athena workgroup enforces `s3://gcoffers-data-lake/athena-results/` as the actual result location.

## Smoke Checks

Run core refresh smoke checks after the deploy-created tables exist and after a successful manual or scheduled production refresh:

~~~bash
aws athena start-query-execution \
  --work-group gold_coast_data_lake \
  --query-execution-context Database=gold_coast \
  --result-configuration OutputLocation=s3://gcoffers-data-lake/athena-results/ \
  --query-string file://$PWD/sql/data-lake/smoke/001_latest_success_freshness.sql

aws athena start-query-execution \
  --work-group gold_coast_data_lake \
  --query-execution-context Database=gold_coast \
  --result-configuration OutputLocation=s3://gcoffers-data-lake/athena-results/ \
  --query-string file://$PWD/sql/data-lake/smoke/002_latest_curated_row_availability.sql

aws athena start-query-execution \
  --work-group gold_coast_data_lake \
  --query-execution-context Database=gold_coast \
  --result-configuration OutputLocation=s3://gcoffers-data-lake/athena-results/ \
  --query-string file://$PWD/sql/data-lake/smoke/003_critical_table_catalog.sql

aws athena start-query-execution \
  --work-group gold_coast_data_lake \
  --query-execution-context Database=gold_coast \
  --result-configuration OutputLocation=s3://gcoffers-data-lake/athena-results/ \
  --query-string file://$PWD/sql/data-lake/smoke/004_v1_1_duplicate_source_ids.sql
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
- 004_v1_1_duplicate_source_ids.sql returns every stable-ID duplicate check with result = `passed`.
- No query output contains credentials, raw SMS bodies, raw contact dumps, presigned recording URLs, or webhook URLs.

The freshness check allows 120 minutes. The production cadence is hourly, but the wider smoke threshold avoids false failure during first deploy, manual verification, or a temporarily paused schedule.

Run call transcription observability smoke checks after DDL `003` and `004` are applied and after a successful transcription run:

~~~bash
aws athena start-query-execution \
  --work-group gold_coast_data_lake \
  --query-execution-context Database=gold_coast \
  --result-configuration OutputLocation=s3://gcoffers-data-lake/athena-results/ \
  --query-string file://$PWD/sql/data-lake/smoke/006_transcription_run_status_freshness.sql

aws athena start-query-execution \
  --work-group gold_coast_data_lake \
  --query-execution-context Database=gold_coast \
  --result-configuration OutputLocation=s3://gcoffers-data-lake/athena-results/ \
  --query-string file://$PWD/sql/data-lake/smoke/007_transcription_failure_pending_retry_counts.sql

aws athena start-query-execution \
  --work-group gold_coast_data_lake \
  --query-execution-context Database=gold_coast \
  --result-configuration OutputLocation=s3://gcoffers-data-lake/athena-results/ \
  --query-string file://$PWD/sql/data-lake/smoke/008_transcription_transcript_coverage.sql

aws athena start-query-execution \
  --work-group gold_coast_data_lake \
  --query-execution-context Database=gold_coast \
  --result-configuration OutputLocation=s3://gcoffers-data-lake/athena-results/ \
  --query-string file://$PWD/sql/data-lake/smoke/009_transcription_alert_log_fields.sql
~~~

Transcription pass criteria:

- `006_transcription_run_status_freshness.sql` returns `result = passed` and latest successful production transcription run finished within 120 minutes.
- `007_transcription_failure_pending_retry_counts.sql` returns only `passed`; latest production run succeeded with zero failed and zero pending-retry transcriptions, and no production transcription run failed in the last 24 hours.
- `008_transcription_transcript_coverage.sql` returns `result = passed`; eligible recorded calls have transcript rows and no failed/pending retry coverage gap.
- `009_transcription_alert_log_fields.sql` returns only `passed`; latest run has historical status path, JSONL log path, alert status, CloudWatch log URL, and appropriate alert-error metadata.
- No query output contains transcript text, raw audio, provider payloads, recording URLs, presigned URLs, emails, phone numbers, contact examples, API keys, Slack webhook URLs, or other raw PII.

A zero-new-call transcription run is healthy after the backfill. Do not fail a run solely because `attempted_count = 0`.

## Failure Handling

If freshness fails:

- Check whether the schedule is intentionally disabled.
- Check the latest run-status/ghl/latest-failure.json pointer.
- Check the CloudWatch ECS task log stream from the failed run.
- Do not advance latest-success manually.

For transcription freshness, query `gold_coast.job_run_status` with `job_name = 'ghl-call-transcription'`. Check `status`, `finished_at`, `failed_count`, `pending_retry_count`, `error_json`, `alert_error_json`, and `cloudwatch_log_url`. Do not read or paste transcript text as proof.

If row availability fails:

- Confirm run_status_ghl points only at run-status/ghl/runs/.
- Confirm the V1.1 core/reporting table locations exist under curated/ghl/v1_1/.
- Keep the prior known-good latest-success pointer intact until a new run passes smoke checks.

If catalog availability fails:

- Re-run the DDL for missing external tables or repair the Glue registration path.
- Do not enable the hourly schedule until the catalog and duplicate checks pass.

If transcription alert/log field checks fail:

- Confirm DDL `003` and `004` were applied in order.
- Confirm transcription run status includes `log_path`, `alert_status`, and `alert_error`.
- Confirm the deployed task provides a CloudWatch log URL.
- Switch alert mode to `off` or `failure-only` if alerts are noisy or broken.
- Do not disable the transcription schedule unless the transcription job itself is broken.

## Privacy

Run status and smoke checks are low/sanitized metadata only. They may include job names, run IDs, timestamps, counts, statuses, image tags, sanitized errors, non-secret CloudWatch links, and S3 run-status/log paths.

Do not put transcript text, raw audio, provider payloads, recording URLs, presigned URLs, API keys, Slack webhook URLs, emails, phone numbers, contact examples, or raw PII in docs, evidence, alerts, or smoke output.
