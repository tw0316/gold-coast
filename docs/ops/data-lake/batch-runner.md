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

It does not yet run AWS locks, schedule enablement, or live Athena smoke execution.

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

`--execute` runs only the raw GHL refresh phase. It requires production GHL config from `--env-file`, `GHL_ENV_FILE`, or process env variables injected by ECS Secrets Manager.

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

When `--execute --s3-bucket <bucket>` runs without `--extractor-dry-run`, the runner uploads durable run-status artifacts to the same bucket:

~~~text
s3://<bucket>/run-status/ghl/runs/run=<run_id>/status.json
s3://<bucket>/run-status/ghl/latest-success.json
s3://<bucket>/run-status/ghl/latest-failure.json
s3://<bucket>/run-status/ghl/logs/run=<run_id>.jsonl
~~~

Use `--status-s3-bucket` and `--status-s3-prefix` only when run-status artifacts should land somewhere different from raw refresh outputs.

Curated publish, the Fargate infrastructure skeleton, Slack alert behavior, Athena run-status/smoke SQL, and S3 run-status publishing now exist. AWS-native DynamoDB locking and schedule enablement are later slices.
