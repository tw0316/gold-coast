# Gold Coast Call Transcription Observability

Status: V1.1 operator contract

Scope: run-status Athena query surface, transcription freshness/status smoke checks, alert/log fields, triage, privacy, and backout. This doc does not cover transcript quality review, provider selection, CRM write-back, summaries, coaching, or extraction.

## Operator Query Contract

Official Athena surface:

```sql
SELECT *
FROM gold_coast.job_run_status
WHERE job_name = 'ghl-call-transcription'
ORDER BY try(from_iso8601_timestamp(finished_at)) DESC;
```

Use `gold_coast.job_run_status` for operator queries. Do not build operator workflows on one table per job. The backing transcription table is an implementation detail.

The shared surface normalizes at least:

- `job_name = 'ghl-refresh'`
- `job_name = 'ghl-call-transcription'`

The key columns for transcription operations are:

- `job_name`
- `run_id`
- `status`
- `source_environment`
- `started_at`
- `finished_at`
- `duration_seconds`
- `image_tag`
- `cloudwatch_log_url`
- `status_s3_uri`
- `log_s3_uri`
- `alert_status`
- `provider`
- `transcription_model`
- `artifact_schema_version`
- `selected_count`
- `attempted_count`
- `succeeded_count`
- `failed_count`
- `pending_retry_count`
- `skipped_existing_count`
- `skipped_no_recording_count`
- `metrics_json`
- `error_json`
- `alert_error_json`

`status_s3_uri` must point at historical `runs/run=<run_id>/status.json` objects only. `log_s3_uri` may point at JSONL logs. Neither field should be used to infer transcript content.

## Backing DDL

DDL order:

1. `sql/data-lake/ddl/001_run_status_ghl.sql`
2. `sql/data-lake/ddl/003_run_status_ghl_call_transcription_raw.sql`
3. `sql/data-lake/ddl/004_job_run_status.sql`
4. `sql/data-lake/ddl/002_call_transcripts.sql`, if the transcript table is not already registered

Implementation-detail transcription table:

```text
gold_coast.run_status_ghl_call_transcription_raw
```

Location:

```text
s3://gcoffers-data-lake/run-status/ghl-call-transcription/runs/
```

Do not point the table at:

```text
s3://gcoffers-data-lake/run-status/ghl-call-transcription/
```

The parent prefix includes pointer files and JSONL logs:

```text
latest-success.json
latest-failure.json
logs/run=<run_id>.jsonl
```

Those are not historical run-status rows and must stay out of the external table location.

## Alert Policy

Default policy: `failure-only`.

Launch policy: `launch-window`, only with a bounded UTC expiration.

Allowed alert modes:

- `off`
- `failure-only`
- `success-and-failure`
- `launch-window`

Alert destination: Gold Coast tech alerts, `#gc-alerts`.

Alert payloads are count/status oriented. They may include:

- status
- run ID
- duration
- image tag
- selected count
- attempted count
- succeeded count
- failed count
- pending retry count
- skipped existing count
- skipped no-recording count
- curated row count
- CloudWatch link when available

Alert payloads must not include transcript text, raw audio, provider request/response bodies, recording URLs, webhook URLs, API keys, emails, phone numbers, contact examples, or raw PII.

## Smoke Checks

Run transcription observability smoke checks through the shared query surface:

```text
sql/data-lake/smoke/006_transcription_run_status_freshness.sql
sql/data-lake/smoke/007_transcription_failure_pending_retry_counts.sql
sql/data-lake/smoke/008_transcription_transcript_coverage.sql
sql/data-lake/smoke/009_transcription_alert_log_fields.sql
```

Pass criteria:

- `006` returns one row with `result = 'passed'`; latest successful production transcription run finished within 120 minutes.
- `007` returns only `passed`; latest run succeeded with `failed_count = 0` and `pending_retry_count = 0`, and no failed production transcription run appears in the last 24 hours.
- `008` returns one row with `result = 'passed'`; eligible recorded calls have transcript rows and no failed/pending retry coverage gap.
- `009` returns only `passed`; latest run exposes `status_s3_uri`, `log_s3_uri`, `alert_status`, `cloudwatch_log_url`, and appropriate alert-error metadata.

A zero-new-call run can still be healthy. After the backfill, most hourly runs may have `attempted_count = 0` and high `skipped_existing_count`.

## Triage

If freshness fails:

- Confirm the transcription schedule is expected to be enabled.
- Query `gold_coast.job_run_status` for the latest `job_name = 'ghl-call-transcription'` row.
- Check `status`, `finished_at`, `error_json`, `alert_error_json`, and `cloudwatch_log_url`.
- Do not manually advance `latest-success.json`.

If failure or pending retry counts fail:

- Use `failed_count` and `pending_retry_count` to determine whether the problem is provider execution, retry backlog, or job failure.
- Check sanitized `error_json` first.
- Review CloudWatch logs only as needed.
- Do not paste transcript text, recording URLs, raw provider payloads, or contact examples into Slack or evidence.

If coverage fails:

- Confirm the latest core GHL refresh has current `gold_coast.calls` and `gold_coast.call_recordings`.
- Confirm the latest transcription run succeeded.
- Check whether failures are `failed`, `pending_retry`, or missing rows.
- Do not treat zero attempted calls as a failure by itself.

If alert/log field checks fail:

- Confirm DDL `003` and view `004` are applied in order.
- Confirm transcription run status includes `log_path`, `alert_status`, and `alert_error`.
- Confirm the task receives the CloudWatch log URL when deployed.
- If alert posting fails, keep run status sanitized and inspect `alert_error_json`.

## Privacy Constraints

Call transcripts are high-PII. Observability is low/sanitized metadata only.

Allowed in docs, smoke output, and evidence:

- run IDs
- job names
- statuses
- counts
- timestamps
- image tags
- sanitized error class/message
- non-secret CloudWatch links
- S3 run-status/log object paths

Forbidden in docs, smoke output, and evidence:

- transcript text
- raw audio
- provider payloads
- recording URLs or presigned URLs
- API keys
- Slack webhook URLs
- emails
- phone numbers
- contact examples
- raw PII

## Backout

If the shared query surface is wrong:

1. Stop using `gold_coast.job_run_status` for operator decisions.
2. Fix or drop only the view and the implementation-detail transcription run-status table.
3. Do not delete historical run-status objects.
4. Do not delete transcript artifacts or curated transcript rows as part of an Athena DDL backout.

If alerts misbehave:

1. Set transcription alert mode to `off` or `failure-only`.
2. Keep the transcription schedule enabled unless the job itself is broken.
3. Preserve status/log artifacts for diagnosis.
4. Do not expose webhook values or alert payload internals in evidence.

If the transcription job itself is broken:

1. Disable only the transcription schedule.
2. Leave the core hourly GHL refresh schedule alone.
3. Leave historical run-status and transcript table data intact unless a separate approved cleanup is needed.
