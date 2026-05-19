# Curated Tables Evidence

Legacy evidence: this file records the pre-migration GHL-specific AWS resource names. Do not treat the old bucket, Glue database, or Athena workgroup as the active target after the source-agnostic migration.

Verified: 2026-05-18T09:51:00Z

## Input

- Raw backfill run ID: `20260518T080441Z`
- Manifest: `s3://gcoffers-ghl-data-lake/manifests/ghl/run=20260518T080441Z.json`
- Raw prefix: `s3://gcoffers-ghl-data-lake/raw/ghl/`
- Recording prefix: `s3://gcoffers-ghl-data-lake/recordings/ghl/`

## Output Row Counts

| Table | Rows |
| --- | ---: |
| contacts | 175 |
| opportunities | 120 |
| messages | 1,547 |
| calls | 193 |
| call_recordings | 193 |
| mart_lead_response | 120 |
| mart_rep_activity_daily | 115 |

Athena verification query succeeded:

- Query execution ID: `a9b2d7be-dcfb-4fb0-a517-c496b7e50e56`
- Workgroup: `gold_coast_ghl_data_lake`
- Database: `gold_coast_ghl`

## S3 Curated Objects

| Table | Objects | Bytes | Location |
| --- | ---: | ---: | --- |
| contacts | 1 | 106,662 | `s3://gcoffers-ghl-data-lake/curated/ghl/contacts/snapshot_date=2026-05-18/` |
| opportunities | 1 | 81,755 | `s3://gcoffers-ghl-data-lake/curated/ghl/opportunities/snapshot_date=2026-05-18/` |
| messages | 1 | 414,898 | `s3://gcoffers-ghl-data-lake/curated/ghl/messages/snapshot_date=2026-05-18/` |
| calls | 1 | 75,835 | `s3://gcoffers-ghl-data-lake/curated/ghl/calls/snapshot_date=2026-05-18/` |
| call_recordings | 1 | 34,300 | `s3://gcoffers-ghl-data-lake/curated/ghl/call_recordings/snapshot_date=2026-05-18/` |
| mart_lead_response | 1 | 19,089 | `s3://gcoffers-ghl-data-lake/curated/ghl/mart_lead_response/snapshot_date=2026-05-18/` |
| mart_rep_activity_daily | 1 | 9,944 | `s3://gcoffers-ghl-data-lake/curated/ghl/mart_rep_activity_daily/snapshot_date=2026-05-18/` |
| Total | 7 | 742,483 | `s3://gcoffers-ghl-data-lake/curated/ghl/` |

## Glue Tables

Glue database: `gold_coast_ghl`

| Table | Table location | Partition |
| --- | --- | --- |
| contacts | `s3://gcoffers-ghl-data-lake/curated/ghl/contacts/` | `snapshot_date` |
| opportunities | `s3://gcoffers-ghl-data-lake/curated/ghl/opportunities/` | `snapshot_date` |
| messages | `s3://gcoffers-ghl-data-lake/curated/ghl/messages/` | `snapshot_date` |
| calls | `s3://gcoffers-ghl-data-lake/curated/ghl/calls/` | `snapshot_date` |
| call_recordings | `s3://gcoffers-ghl-data-lake/curated/ghl/call_recordings/` | `snapshot_date` |
| mart_lead_response | `s3://gcoffers-ghl-data-lake/curated/ghl/mart_lead_response/` | `snapshot_date` |
| mart_rep_activity_daily | `s3://gcoffers-ghl-data-lake/curated/ghl/mart_rep_activity_daily/` | `snapshot_date` |

## Commands Run

- `.venv/bin/python -m pip install -e .`
- `PYTHONPATH=src .venv/bin/python -m unittest discover -s tests -v`
- `cd apps/data-lake && .venv/bin/python scripts/build_curated_tables.py --no-s3 --manifest-uri s3://gcoffers-ghl-data-lake/manifests/ghl/run=20260518T080441Z.json --snapshot-date 2026-05-18`
- `cd apps/data-lake && .venv/bin/python scripts/build_curated_tables.py --manifest-uri s3://gcoffers-ghl-data-lake/manifests/ghl/run=20260518T080441Z.json --snapshot-date 2026-05-18 --s3-bucket gcoffers-ghl-data-lake --s3-prefix curated/ghl --glue-database gold_coast_ghl`
- `aws s3api list-objects-v2 --bucket gcoffers-ghl-data-lake --prefix curated/ghl/`
- `aws glue get-tables --database-name gold_coast_ghl`
- Athena count query across all seven curated tables filtered to `snapshot_date='2026-05-18'`.
- `rg` guardrail scan over `src`, `scripts`, `tests`, and `docs`.

## Guardrail Confirmation

- No GHL write endpoints were called. The only mutating method string found in tests is the existing test that verifies the GHL client refuses `POST`.
- No transcription, call summary, coaching analysis, dashboard, QuickSight, Superset, scheduled scorecard, external message, or GHL write-back was generated.
- Call recordings remain private S3 objects under `recordings/ghl/`; curated tables contain metadata and S3 object references only, not audio payloads.
