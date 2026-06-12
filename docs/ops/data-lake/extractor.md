# Gold Coast Data Lake GHL Source Extractor

This is the read-only GHL source extractor for the Gold Coast data lake MVP.

## Safety Contract

- Uses only GET requests. Non-GET methods are rejected in code.
- Does not write to GHL.
- Does not transcribe calls.
- Does not generate call summaries or coaching analysis.
- Does not create dashboards or scheduled scorecards.
- Does not print credentials or raw records to stdout.
- Recording downloads are off by default.
- Recording downloads require --s3-bucket; audio is streamed to a temporary file, uploaded with S3 server-side encryption, then removed locally.

## MVP Entities

- contacts: GET /contacts/?locationId=...
- pipelines: GET /opportunities/pipelines?locationId=..., including embedded stages
- opportunities: GET /opportunities/search?location_id=...&pipeline_id=...
- conversations: GET /conversations/search?locationId=...
- messages: GET /conversations/{conversationId}/messages
- call-details: GET /conversations/messages/{messageId}
- recordings: GET /conversations/messages/{messageId}/locations/{locationId}/recording, only with --download-recordings

## Output Layout

Local staging mirrors the S3 object layout:

    raw/ghl/entity=<entity>/ingest_date=YYYY-MM-DD/run=<run_id>.jsonl
    checkpoints/ghl/entity=<entity>.json
    manifests/ghl/run=<run_id>.json
    recordings/ghl/message_id=<messageId>.<ext>

Raw JSONL records are envelope objects:

    {"_ingest":{"source":"ghl","entity":"contacts","run_id":"...","endpoint":"/contacts/"},"record":{}}

The manifest records entity counts, local paths, optional S3 URIs, checkpoints, and recording metadata. Recording binaries are never embedded in JSONL or query tables.

## Safe Smoke Test

    cd apps/data-lake && python3 scripts/ghl_extract_raw.py \
      --env-file <path-to-ghl-credentials.env> \
      --smoke \
      --output-dir data/smoke

Smoke mode forces:

- --dry-run
- --page-limit 2
- --max-items 2
- --max-pages 1
- no recording downloads
- no S3 uploads

## Full Raw Backfill Command

Use after reviewing the smoke manifest:

    cd apps/data-lake && python3 scripts/ghl_extract_raw.py \
      --env-file <path-to-ghl-credentials.env> \
      --entities all \
      --output-dir data/extracts \
      --s3-bucket gcoffers-data-lake \
      --page-limit 100

## Bounded Recording Archive

Do not run a full recording backfill from this slice. For a controlled single-recording proof:

    cd apps/data-lake && python3 scripts/ghl_extract_raw.py \
      --env-file <path-to-ghl-credentials.env> \
      --entities call-details \
      --message-id <GHL_CALL_MESSAGE_ID> \
      --download-recordings \
      --max-recordings 1 \
      --s3-bucket gcoffers-data-lake

Recording keys are stable by GHL call message ID so recurring runs can skip already archived audio instead of redownloading the same recording under a new date partition. The upload uses ServerSideEncryption=AES256. The local temporary audio file is removed after upload.

## Checkpoints And Manifests

Each successful page writes:

    checkpoints/ghl/entity=<entity>.json

The checkpoint stores the entity, endpoint, last successful request parameters, page number, records seen, and run ID. The extractor does not yet resume automatically from checkpoints; the files are designed for the next scheduling slice to use as durable state.

Each run writes:

    manifests/ghl/run=<run_id>.json

The manifest is the handoff artifact for downstream raw-to-curated jobs.
