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

It does not yet run curated publish, AWS locks, ECS, EventBridge, or Slack alerts.

## Safe Manual Command

```bash
cd apps/data-lake
PYTHONPATH=src python3 -m gold_coast_data_lake.jobs.ghl_batch_refresh --run-id local-dry-run
```

The command writes local status under:

```text
apps/data-lake/data/run-status/ghl/
  run=<run_id>.json
  latest-success.json
  latest-failure.json
  logs/run=<run_id>.jsonl
  locks/ghl-refresh.lock
```

The `data/` directory is ignored by git.

## Production Guardrail

`--execute` runs only the raw GHL refresh phase. It requires production GHL config from `--env-file` or process env.

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

Curated publish, AWS-native lock/status storage, ECS Fargate packaging, EventBridge scheduling, and Slack webhook alerts are later slices.
