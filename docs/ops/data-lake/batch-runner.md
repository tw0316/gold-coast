# Gold Coast Data Lake Batch Runner

## Current Slice

The checked-in runner is a local foundation for the production GHL batch refresh. It provides:

- unique run IDs
- a 45-minute TTL overlap lock contract
- immutable per-run status files
- latest-success/latest-failure pointer files
- sanitized JSONL operator logs
- a safe dry-run manual command

It does not yet run production GHL extraction, curated publish, AWS locks, ECS, EventBridge, or Slack alerts.

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

`--execute` currently fails deliberately. Production extraction, AWS-native lock/status storage, ECS Fargate packaging, EventBridge scheduling, and Slack webhook alerts are later slices.
