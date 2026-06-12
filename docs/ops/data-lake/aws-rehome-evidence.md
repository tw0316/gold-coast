# AWS Rehome Evidence

Verified: 2026-05-18T14:06:40Z

## Result

- New S3 bucket: `gcoffers-data-lake`
- Legacy S3 bucket retained: `gcoffers-ghl-data-lake`
- New Glue database: `gold_coast`
- Legacy Glue database retained: `gold_coast_ghl`
- New Athena workgroup: `gold_coast_data_lake`
- Legacy Athena workgroup retained: `gold_coast_ghl_data_lake`
- Source prefix remains `ghl`: `raw/ghl/`, `curated/ghl/`, `recordings/ghl/`, `manifests/ghl/`, `checkpoints/ghl/`

## S3

`gcoffers-data-lake` was created in `us-east-1` and configured with:

- Public access block enabled: `BlockPublicAcls=true`, `IgnorePublicAcls=true`, `BlockPublicPolicy=true`, `RestrictPublicBuckets=true`
- Default encryption: `AES256`
- Versioning: `Enabled`
- Object ownership: `BucketOwnerEnforced`

Objects were copied from `s3://gcoffers-ghl-data-lake` to `s3://gcoffers-data-lake` with `aws s3 sync`, without `--delete`.

Copy reconciliation:

- Legacy before copy: 215 objects, 286,003,560 bytes
- New bucket immediately after copy: 215 objects, 286,003,560 bytes
- Dry-run recheck after Athena verification: no source-to-destination copy actions pending
- New bucket later had 217 objects, 286,003,863 bytes because the verification query wrote Athena result files under `athena-results/`

Sample copied recording object:

- Key: `recordings/ghl/ingest_date=2026-05-18/message_id=0szzFMDzdCbb0N9hname.wav`
- Encryption: `AES256`
- Content type: `audio/x-wav`
- Content length: 402,284 bytes

## Athena

`gold_coast_data_lake` was created with the existing project conventions from `gold_coast_ghl_data_lake`, adjusted to the new bucket:

- Result location: `s3://gcoffers-data-lake/athena-results/`
- Result encryption: `SSE_S3`
- Enforce workgroup configuration: `true`
- CloudWatch metrics: `true`
- Bytes scanned cutoff per query: 1,073,741,824 bytes
- Engine: `AUTO`, effective engine version 3

Verification query ID: `ca9325b7-8fd2-4755-8fff-02778a79dc9e`

Row counts against `gold_coast_data_lake` / `gold_coast`:

| Table | Rows |
| --- | ---: |
| call_recordings | 193 |
| calls | 193 |
| contacts | 175 |
| mart_lead_response | 120 |
| mart_rep_activity_daily | 115 |
| messages | 1,547 |
| opportunities | 120 |

## Glue

`gold_coast` was created with location `s3://gcoffers-data-lake/curated/`.

Tables cloned from `gold_coast_ghl` and rehomed to `s3://gcoffers-data-lake/curated/ghl/`:

| Table | Location |
| --- | --- |
| call_recordings | `s3://gcoffers-data-lake/curated/ghl/call_recordings/` |
| calls | `s3://gcoffers-data-lake/curated/ghl/calls/` |
| contacts | `s3://gcoffers-data-lake/curated/ghl/contacts/` |
| mart_lead_response | `s3://gcoffers-data-lake/curated/ghl/mart_lead_response/` |
| mart_rep_activity_daily | `s3://gcoffers-data-lake/curated/ghl/mart_rep_activity_daily/` |
| messages | `s3://gcoffers-data-lake/curated/ghl/messages/` |
| opportunities | `s3://gcoffers-data-lake/curated/ghl/opportunities/` |

Partition metadata was copied and rehomed for the current `snapshot_date=2026-05-18` partitions.

## Verification Commands

- `aws sts get-caller-identity --query Account --output text`
- `aws s3api get-public-access-block --bucket gcoffers-data-lake`
- `aws s3api get-bucket-encryption --bucket gcoffers-data-lake`
- `aws s3api get-bucket-versioning --bucket gcoffers-data-lake`
- `aws s3api get-bucket-ownership-controls --bucket gcoffers-data-lake`
- `aws s3 sync s3://gcoffers-ghl-data-lake s3://gcoffers-data-lake --only-show-errors --sse AES256`
- `aws s3 sync s3://gcoffers-ghl-data-lake s3://gcoffers-data-lake --dryrun --size-only --only-show-errors`
- `aws athena get-work-group --work-group gold_coast_data_lake`
- `aws glue get-database --name gold_coast`
- `aws glue get-tables --database-name gold_coast`
- `aws glue get-partitions --database-name gold_coast --table-name contacts`
- `aws athena start-query-execution --work-group gold_coast_data_lake --query-execution-context Database=gold_coast ...`

## Guardrails

- No GHL writes.
- No transcription.
- No call summaries.
- No coaching analysis.
- No dashboards, QuickSight, Superset, or scheduled scorecards.
- No legacy AWS resources were deleted.
- No credentials were written to docs or logs.
