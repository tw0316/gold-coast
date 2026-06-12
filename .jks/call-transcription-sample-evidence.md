# Call Transcription Sample Execution Evidence

Created: 2026-05-21

## Scope

Slice: `slice-6-bounded-sample-backfill`

Implemented only the smallest safe path needed for the owner to run a one-call real sample. This does not implement full backfill polish, recurring operation, summaries, coaching insights, CRM extraction, dashboards, Slack scorecards, or GHL write-back.

## Files Changed

- `apps/data-lake/src/gold_coast_data_lake/jobs/ghl_call_transcription.py`
- `apps/data-lake/src/gold_coast_data_lake/transcription.py`
- `apps/data-lake/tests/test_transcription.py`
- `docs/ops/data-lake/call-transcription.md`
- `.jks/call-transcription-sample-evidence.md`

## Implemented Behavior

- `--execute --sample --max-calls 1 --max-transcriptions-per-run 1 --s3-bucket gcoffers-data-lake` now runs a bounded sample path.
- Manual one-call samples can use `--openai-secret-id goldcoast/openai-api-key` so the approved OpenAI key stays in AWS Secrets Manager and is never pasted, printed, or written to run status.
- Athena selection uses `gold_coast_data_lake` / `gold_coast`, joins `gold_coast.calls` to `gold_coast.call_recordings`, requires `has_recording=true` and a non-null archived object key, and prefers 10-120 second calls.
- The runtime downloads the private S3 object, computes missing SHA/content type/byte count from the download where needed, calls the OpenAI provider wrapper, uploads the raw provider artifact JSON under `ai-artifacts/ghl/transcripts/...`, writes curated `call_transcripts` Parquet with the existing helper, and updates/creates the Glue table.
- Run status is count/status oriented and sanitized. It does not include transcript text, provider payloads, credentials, or recording URLs.
- Failure paths write local sanitized status and return nonzero.

## Owner Run Template

The owner must inject the approved OpenAI secret into the runtime environment. Do not print or commit the value.

```text
cd /Users/jarvis/LocalRepos/gold-coast/apps/data-lake
PYTHONPATH=src \
python -m gold_coast_data_lake.jobs.ghl_call_transcription \
  --execute \
  --sample \
  --max-calls 1 \
  --max-transcriptions-per-run 1 \
  --s3-bucket gcoffers-data-lake \
  --status-s3-bucket gcoffers-data-lake \
  --status-s3-prefix run-status/ghl-call-transcription \
  --artifact-schema-version v1 \
  --provider openai \
  --model gpt-4o-transcribe \
  --fallback-model whisper-1 \
  --openai-secret-id goldcoast/openai-api-key \
  --lock-name ghl-call-transcription
```

## Verification

- `PYTHONPATH=apps/data-lake/src apps/data-lake/.venv/bin/python -m unittest apps/data-lake/tests/test_transcription.py`
  - Result: 15 tests run, all passed.
- `PYTHONPATH=apps/data-lake/src apps/data-lake/.venv/bin/python -m unittest discover apps/data-lake/tests`
  - Result: 72 tests run, all passed.
- `git diff --check -- apps/data-lake/src/gold_coast_data_lake/jobs/ghl_call_transcription.py apps/data-lake/src/gold_coast_data_lake/transcription.py apps/data-lake/tests/test_transcription.py docs/ops/data-lake/call-transcription.md .jks/call-transcription-sample-evidence.md`
  - Result: clean.
- Local no-key execute smoke with `--execute --sample --max-calls 1 --max-transcriptions-per-run 1 --s3-bucket gcoffers-data-lake`.
  - Result: exited `2`, wrote sanitized local failure status, and made no Athena/S3/OpenAI/Glue call because provider credential preflight failed first.
- Scoped secret/transcript leak scans across docs, evidence, and runtime files.
  - Result: no credential-looking values, webhook URLs, bearer tokens, raw transcript fixtures, or sample recording keys in docs/evidence/runtime status paths. Unit tests use fake transcript and fake recording-key fixtures only.

Tests use fakes/injection for Athena selection, private S3 download, OpenAI transcription, artifact upload, and Glue-style curated publish. No AWS, OpenAI, GHL, Slack, Athena, or Glue calls were made by tests.

## Remaining Owner Steps

## Real Sample Result

Run ID: `sample-20260520T2258Z`

Runtime command:

```text
cd /Users/jarvis/LocalRepos/gold-coast/apps/data-lake
./.venv/bin/python -m gold_coast_data_lake.jobs.ghl_call_transcription \
  --execute \
  --sample \
  --max-calls 1 \
  --max-transcriptions-per-run 1 \
  --s3-bucket gcoffers-data-lake \
  --status-s3-bucket gcoffers-data-lake \
  --status-s3-prefix run-status/ghl-call-transcription \
  --artifact-schema-version v1 \
  --provider openai \
  --model gpt-4o-transcribe \
  --fallback-model whisper-1 \
  --lock-name ghl-call-transcription \
  --openai-secret-id goldcoast/openai-api-key \
  --run-id sample-20260520T2258Z
```

Result:

- Selected calls: 1.
- Attempted transcriptions: 1.
- Succeeded transcriptions: 1.
- Failed transcriptions: 0.
- Pending retry transcriptions: 0.
- Provider artifacts written: 1.
- Curated `gold_coast.call_transcripts` rows written: 1.
- Glue table action: `created`.
- Local/S3 run status written.

Published locations:

- Run status: `s3://gcoffers-data-lake/run-status/ghl-call-transcription/runs/run=sample-20260520T2258Z/status.json`
- Curated table: `s3://gcoffers-data-lake/curated/ghl/v1_1/core/call_transcripts/part-00000.parquet`
- Private provider artifact: under `s3://gcoffers-data-lake/ai-artifacts/ghl/transcripts/v1/`

The provider artifact and Athena row contain transcript text. Do not paste transcript text into Slack, docs, evidence, or unsafe logs.

## Post-Sample Verification

- `PYTHONPATH=apps/data-lake/src apps/data-lake/.venv/bin/python -m unittest discover apps/data-lake/tests`
  - Result: 71 tests run, all passed.
- `git diff --check`
  - Result: clean.
- Read-only Athena source selection smoke:
  - Result: selected one eligible 10-second archived call candidate with an object key.
- `sql/data-lake/smoke/005_call_transcripts.sql`
  - Query execution: `ab559e83-6082-437b-bc52-13e01d37fa0a`
  - Result: all 5 smoke checks passed.
- Count-only Athena verification:
  - Query execution: `78fb27bb-3836-46cb-83ec-75caad2020ba`
  - Result: `row_count=1`, `succeeded_count=1`, `nonempty_succeeded_count=1`.
- Glue verification:
  - `gold_coast.call_transcripts` exists at `s3://gcoffers-data-lake/curated/ghl/v1_1/core/call_transcripts/` with 35 columns.

## Remaining Owner Steps

- Privately review sample transcript quality in an approved operator context without posting transcript text.
- Decide whether to proceed to throttled backfill.
- Do not enable recurring processing until sample quality and backfill evidence are accepted.

## Longer-Duration Sample Result

Run ID: `long-sample-20260520T2320Z`

Reason: Tej asked for a sample on a call over 5 minutes after reviewing the first 10-second sample.

Selection:

- Duration filter: `recording_duration_seconds >= 300` and `< 600`.
- Selected duration: 318 seconds.
- Direction/status: inbound completed.
- Hard caps: 1 selected call, 1 max transcription attempt.

Result:

- Selected calls: 1.
- Attempted transcriptions: 1.
- Succeeded transcriptions: 1.
- Failed transcriptions: 0.
- Pending retry transcriptions: 0.
- Existing rows loaded before publish: 1.
- Curated rows after publish: 2.
- Glue table action: `updated`.
- Local/S3 run status written.

Published status:

- `s3://gcoffers-data-lake/run-status/ghl-call-transcription/runs/run=long-sample-20260520T2320Z/status.json`

Post-sample checks:

- Transcript smoke SQL query execution: `f224b99a-3dc2-4d77-8c37-d41e2dbc725e`
  - Result: all 5 smoke checks passed.
- Count-only Athena query execution: `61257d49-6664-45e9-b40b-7de0ed1a76d0`
  - Result: `row_count=2`, `succeeded_count=2`, `nonempty_succeeded_count=2`, `succeeded_over_5_min_count=1`.

The longer sample transcript text remains private and was not copied into Slack, docs, evidence, or logs.
