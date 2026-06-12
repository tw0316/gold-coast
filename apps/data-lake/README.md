# Gold Coast Data Lake

Read-only source extractor, curated table tooling, and production refresh runner for the Gold Coast data lake.

## Scope

- GHL source extraction uses GET-only API behavior.
- Local raw/curated outputs are written under `apps/data-lake/data/`, which is ignored by git.
- Production refresh runs from ECS/Fargate through `gold_coast_data_lake.jobs.ghl_batch_refresh`.
- V1.1 publishes first-class core curated Athena tables in `gold_coast` and metric marts in `gold_coast_reporting`.
- Daily snapshots are internal audit/debug outputs, not the default query surface.

## Local Checks

```bash
PYTHONPATH=src python3 -m pytest tests
```

## Safe Local Smoke

```bash
GHL_ENV_FILE=/path/to/credentials.env python3 scripts/ghl_extract_raw.py --smoke --output-dir data/smoke
```

Do not commit credential files, raw payloads, local extracts, recordings, or generated Parquet output.

## Query Contract

- Use `gold_coast.contacts_latest`, `gold_coast.opportunities_latest`, `gold_coast.messages`, `gold_coast.calls`, `gold_coast.call_recordings`, and `gold_coast.opportunity_stage_history` for direct entity/event exploration.
- Use `gold_coast_reporting.lead_response` and `gold_coast_reporting.rep_activity_daily` for repeated business metrics.
- Do not require normal queries to add `run_id`, `snapshot_date`, or `COUNT(DISTINCT ...)` dedupe workarounds.
