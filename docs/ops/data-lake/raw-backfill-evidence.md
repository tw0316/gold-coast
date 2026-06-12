# Raw Backfill Evidence

Legacy evidence: this file records the pre-migration GHL-specific AWS resource names. Do not treat the old bucket name as the active target after the source-agnostic migration.

Verified: 2026-05-18T08:29:00Z

## Run

- Run ID: `20260518T080441Z`
- Manifest: `s3://gcoffers-ghl-data-lake/manifests/ghl/run=20260518T080441Z.json`
- Bucket: `gcoffers-ghl-data-lake`
- Source: GHL/LeadConnector read-only extraction

## Raw Entity Counts

| Entity | Records |
| --- | ---: |
| contacts | 175 |
| pipelines | 2 |
| opportunities | 120 |
| conversations | 200 |
| messages | 1,547 |
| call_message_details | 193 |

S3 verification:

- Raw JSONL objects: 6
- Raw JSONL bytes: 2,392,941
- Checkpoint objects: 6

## Recording Archive

- Recording attempts: 193
- Archived recordings: 157
- Unavailable recordings: 36
- Archived recording bytes: 282,680,390
- Sample recording object encryption: `AES256`
- Sample recording content type: `audio/x-wav`

Recordings are stored as private encrypted S3 objects under `recordings/ghl/`. No transcription, call summary, or coaching analysis was generated.

## Verification Commands

- `aws s3 cp s3://gcoffers-ghl-data-lake/manifests/ghl/run=20260518T080441Z.json ...`
- `aws s3api list-objects-v2 --bucket gcoffers-ghl-data-lake --prefix raw/ghl/`
- `aws s3api list-objects-v2 --bucket gcoffers-ghl-data-lake --prefix recordings/ghl/`
- `aws s3api list-objects-v2 --bucket gcoffers-ghl-data-lake --prefix checkpoints/ghl/`
- `aws s3api head-object --bucket gcoffers-ghl-data-lake --key <sample-recording-key>`

## Notes

The earlier owner check incorrectly read the paginator `KeyCount` field while truncated contents were present. Direct object counting confirms the recording archive exists and matches the manifest: 157 archived objects totaling 282,680,390 bytes.
