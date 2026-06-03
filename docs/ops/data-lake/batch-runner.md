# Gold Coast Data Lake Batch Runner

## Current Slice

The checked-in runner is a local foundation for the production GHL batch refresh. It provides:

- unique run IDs
- a 45-minute TTL overlap lock contract
- immutable per-run status files
- latest-success/latest-failure pointer files
- sanitized JSONL operator logs
- a safe dry-run manual command
- execute-mode orchestration for the full core-source raw GHL refresh
- optional S3 upload for Athena-queryable run-status artifacts
- AWS DynamoDB TTL locking when `LOCK_TABLE_NAME` is supplied
- raw refresh followed by curated table publish for production non-dry-run runs
- transient upstream GHL failures get 2 additional full raw-refresh retries by default before the run fails
- in-run Athena smoke checks for the freshly published V1.1 core/reporting query surface

It does not enable schedules by itself.

## Safe Manual Command

```bash
cd apps/data-lake
PYTHONPATH=src python3 -m gold_coast_data_lake.jobs.ghl_batch_refresh --run-id local-dry-run
```

The command writes local status under:

```text
apps/data-lake/data/run-status/ghl/
  runs/run=<run_id>/status.json
  latest-success.json
  latest-failure.json
  logs/run=<run_id>.jsonl
  locks/ghl-refresh.lock
```

The `data/` directory is ignored by git.

The immutable per-run status file is separated under `runs/` and written as single-line JSON so the Athena historical table can read it through the JSON SerDe. `latest-success.json` and `latest-failure.json` are operational pointers and must not be included in that table location.

## Production Guardrail

`--execute` runs the raw GHL refresh phase. For production non-dry-run runs, it then builds V1.1 curated Parquet tables from the fresh manifest and updates Glue tables.

It requires production GHL config from `--env-file`, `GHL_ENV_FILE`, or process env variables injected by ECS Secrets Manager.

For bounded local operator verification, use explicit limits and local output paths:

```bash
cd apps/data-lake
PYTHONPATH=src python3 -m gold_coast_data_lake.jobs.ghl_batch_refresh \
  --execute \
  --env-file /path/to/approved-ghl.env \
  --status-dir /tmp/gc-data-lake-status \
  --output-dir /tmp/gc-data-lake-extracts \
  --extractor-dry-run \
  --max-pages 1 \
  --max-items 2
```

The raw refresh phase uses the package GET-only `GHLClient`. Recording downloads require `--s3-bucket` and are disabled by `--extractor-dry-run`.

When `LOCK_TABLE_NAME` is present, the runner uses a DynamoDB conditional TTL lock named `ghl-refresh` before the production run starts. The fallback local file lock is only for dry-runs and local operator checks.

The downstream call transcription runtime uses the same lock table with a separate lock name, `ghl-call-transcription`, so transcription overlap protection does not block the core refresh lock.

When `--execute --s3-bucket <bucket>` runs as an eligible production refresh, the runner uploads durable run-status artifacts to the same bucket:

~~~text
s3://<bucket>/run-status/ghl/runs/run=<run_id>/status.json
s3://<bucket>/run-status/ghl/latest-success.json
s3://<bucket>/run-status/ghl/latest-failure.json
s3://<bucket>/run-status/ghl/logs/run=<run_id>.jsonl
~~~

Use `--status-s3-bucket` and `--status-s3-prefix` only when run-status artifacts should land somewhere different from raw refresh outputs.

Runner dry-runs do not create the status S3 uploader. Execute-mode diagnostics, including `--extractor-dry-run`, may upload immutable historical `runs/run=<run_id>/status.json` and log artifacts when a status bucket is supplied, but they do not publish `latest-success.json` or `latest-failure.json`.

The run-status payload exposes `image_tag`, `cloudwatch_log_url`, and `smoke_checks` as top-level fields for Athena. `--image-tag` defaults from `IMAGE_TAG`; `--cloudwatch-log-url` defaults from `CLOUDWATCH_LOG_URL`. `smoke_checks` uses `passed`, `failed`, or `not_run`; eligible production success fails final validation unless smoke checks are non-empty and passed.

Curated publish, DynamoDB locking, the Fargate infrastructure, Slack alert behavior, Athena run-status/smoke SQL, in-run smoke status capture, and S3 run-status publishing now exist. V1.1 production cutover is hourly. Any future schedule changes remain operator-controlled and must keep the latest-success validation contract intact.
