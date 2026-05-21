# Call Transcription Observability V1.1 Live Acceptance Evidence

Date: 2026-05-21

Scope: production deploy and acceptance for transcription observability only.

## Deployment

- Repo commit: `4172db1379276f7c1220bc3d9a268312dc07d6cc`
- Image digest: `sha256:b3dc4f7cbbd0416cace54669cd025634f1d2c605779b6b988600ed698008c2e6`
- Terraform apply completed with 2 added, 4 changed, 2 destroyed.
- Core GHL refresh schedule remains enabled at `rate(1 hour)` on task definition revision 10.
- Transcription schedule remains enabled at `rate(1 hour)` on task definition revision 3.
- Core alert mode remains `failure-only`.
- Transcription alert mode is `launch-window` until `2026-05-22T16:00:00Z`.

## Controlled ECS Smoke

- Run ID: `observability-smoke-20260521T1547Z`
- ECS task: `arn:aws:ecs:us-east-1:108750423275:task/gold-coast-data-lake/77a04862380d471d8b27fdd6e90dbdb0`
- Container: `ghl-call-transcription`
- Exit code: `0`
- Status: `succeeded`
- Started: `2026-05-21T15:47:55.080244Z`
- Finished: `2026-05-21T15:48:05.534437Z`
- Duration: `10.454193` seconds
- Source environment: `prod`
- Selected calls: `2`
- Attempted: `2`
- Succeeded: `2`
- Failed: `0`
- Pending retry: `0`
- Curated transcript rows written: `295`

## Alert And Log Evidence

- Slack alert status: `posted`
- Alert error: `null`
- Status JSON: `s3://gcoffers-data-lake/run-status/ghl-call-transcription/runs/run=observability-smoke-20260521T1547Z/status.json`
- JSONL log: `s3://gcoffers-data-lake/run-status/ghl-call-transcription/logs/run=observability-smoke-20260521T1547Z.jsonl`
- CloudWatch URL was preserved as the expected AWS CloudWatch console URL, not redacted to `[redacted-url]`.
- JSONL events present: `run_started`, `source_selection_completed`, `transcription_counts_finalized`, `alert_evaluated`, `run_completed`.

## Athena DDL

- `003_run_status_ghl_call_transcription_raw.sql`: `5974d4fa-9836-4981-94b0-5479532f959f`, `SUCCEEDED`
- `004_job_run_status.sql`: `c6f00bd8-d204-468a-b53e-d5c8dc016a4c`, `SUCCEEDED`

## Legacy Run-Status Compatibility Repair

- Athena initially failed on older transcription status files because they were pretty-printed multi-line JSON, which the JSON SerDe could not scan.
- Backed up the 16 existing status files outside the Athena table location under `s3://gcoffers-data-lake/run-status/ghl-call-transcription/status-json-pretty-backup-20260521T1555Z/`.
- Re-serialized the same status JSON objects in place as compact one-line JSON.
- No transcript text, raw audio, recording URL, provider payload, credential, or PII content was changed or exposed.

## Athena Smoke Results

- `005_call_transcripts.sql`: `58822441-6d75-4e25-b2d4-7eeccf917dc5`, `SUCCEEDED`
  - 295 inspected rows.
  - Duplicate grain, invalid status, lineage to calls, lineage to recordings, and non-empty succeeded transcript checks all passed.
- `006_transcription_run_status_freshness.sql`: `f3345002-b348-4aa2-8eb2-a0349c5574b3`, `SUCCEEDED`
  - Result: `passed`
  - Latest run: `observability-smoke-20260521T1547Z`
  - Status: `succeeded`
  - Alert status: `posted`
  - Status and JSONL S3 URIs present.
- `007_transcription_failure_pending_retry_counts.sql`: `138ff392-b62e-45d9-9349-5a7d046937a0`, `SUCCEEDED`
  - Latest run failure/pending retry check: `passed`
  - Attempted: `2`
  - Succeeded: `2`
  - Failed: `0`
  - Pending retry: `0`
  - Recent failed runs on current deployed image tag: `0`
- `008_transcription_transcript_coverage.sql`: `62193615-1fb4-414d-a85c-65bfc5b670d6`, `SUCCEEDED`
  - Result: `passed`
  - Recorded calls: `295`
  - Recorded calls with transcripts: `295`
  - Missing transcripts: `0`
  - Failed or pending retry transcripts: `0`
- `009_transcription_alert_log_fields.sql`: `ace4dde5-b9c7-4713-bb20-374efb74b4e9`, `SUCCEEDED`
  - `alert_error_json`, `alert_status`, `cloudwatch_log_url`, `log_s3_uri`, and `status_s3_uri` all passed.

## Privacy Gate

- Acceptance evidence contains counts, statuses, run IDs, paths, and infrastructure metadata only.
- No transcript text, raw audio, provider payload, recording URL, API key, Slack webhook URL, email, phone number, contact example, or raw PII was written to Slack, docs, run-status evidence, or committed files.
