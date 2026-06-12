# Call Transcription Backfill Evidence

Created: 2026-05-21

## Scope

Slice: `slice-6-bounded-sample-backfill`

After Tej approved proceeding from the longer-duration sample, ran throttled real-call backfill against archived private S3 call recordings. This evidence intentionally records only counts, statuses, run IDs, and Athena query IDs. No transcript text, raw audio, recording URLs, API keys, webhook URLs, or raw PII are included.

## Safety Fix Before Backfill

Before running the backfill, added an idempotency guard for source rows where archived recording SHA is missing. Existing successful transcripts are now skipped by `(call_message_id, artifact_schema_version, provider, model)` when the source SHA is absent, preventing repeat transcription of the same call.

Verification:

- `PYTHONPATH=apps/data-lake/src apps/data-lake/.venv/bin/python -m unittest apps/data-lake/tests/test_transcription.py`
  - Result: 15 tests run, all passed.
- `PYTHONPATH=apps/data-lake/src apps/data-lake/.venv/bin/python -m unittest discover apps/data-lake/tests`
  - Result: 72 tests run, all passed.
- `git diff --check`
  - Result: clean.
- `python3 -m json.tool goal-state.json`
  - Result: valid JSON.

## Backfill Runs

All runs used:

- Provider: `openai`
- Primary model: `gpt-4o-transcribe`
- Fallback model: `whisper-1`
- Artifact schema version: `v1`
- OpenAI key source: AWS Secrets Manager secret id `goldcoast/openai-api-key`
- Audio source: existing private archived S3 recordings
- Status output prefix: `s3://gcoffers-data-lake/run-status/ghl-call-transcription/`
- Curated table: `gold_coast.call_transcripts`

| Run ID | Selected | Attempted | Succeeded | Failed | Pending Retry | Rows After Run | Smoke Query | Count Query |
|---|---:|---:|---:|---:|---:|---:|---|---|
| `backfill-20260521T0332Z` | 10 | 10 | 10 | 0 | 0 | 12 | `487eaf77-4fd2-4805-b01a-f4a1ed954c8a` | `5221a544-047f-4a5e-941a-71d98be914f2` |
| `backfill-20260521T0335Z` | 25 | 25 | 25 | 0 | 0 | 37 | `6e00813a-c298-4038-b421-283a0ea9b650` | `5f164da7-ac16-43cc-adc6-f697372429f2` |
| `backfill-20260521T0338Z` | 50 | 50 | 50 | 0 | 0 | 87 | `347d01fd-d739-411d-86c2-449c7eaef429` | `97eb8dad-d07a-4a16-9ab1-32793905b62a` |
| `backfill-20260521T0342Z` | 50 | 50 | 50 | 0 | 0 | 137 | `2629c4a5-d379-4421-85e8-79002cc61240` | `08e220ed-b077-40fe-9ce2-745f84cceed0` |
| `backfill-20260521T0347Z` | 50 | 50 | 50 | 0 | 0 | 187 | `2854a148-e1bc-47f2-9177-cc60039a4f98` | `6e5f372a-afa0-405d-9e2f-995964587ede` |
| `backfill-20260521T0350Z` | 50 | 50 | 50 | 0 | 0 | 237 | `1f780aba-3c60-4b0e-ac88-5a4323f7a762` | `2a15b109-6e2c-4f43-88b1-20a22ed9bd77` |
| `backfill-20260521T0415Z` | 26 | 26 | 26 | 0 | 0 | 263 | `c3cd5ede-c9bf-48d0-a1d7-6d2c4cd43d96` | `ea0272c9-5092-47e4-a13b-828db0470be5` |

## Final Verification

Final smoke query: `c3cd5ede-c9bf-48d0-a1d7-6d2c4cd43d96`

All 5 smoke checks passed:

- Duplicate idempotency grain: `inspected_count=263`, `failed_count=0`.
- Invalid status: `inspected_count=263`, `failed_count=0`.
- Lineage to calls: `inspected_count=263`, `failed_count=0`.
- Lineage to recordings: `inspected_count=263`, `failed_count=0`.
- Succeeded transcript non-empty: `inspected_count=263`, `failed_count=0`.

Final count query: `ea0272c9-5092-47e4-a13b-828db0470be5`

- `row_count=263`
- `succeeded_count=263`
- `failed_count=0`
- `pending_retry_count=0`

Final coverage query: `58e56f9a-5a24-4cbe-9ba0-939fc1e51a9b`

- `eligible_calls=263`
- `succeeded_covered_calls=263`
- `remaining_calls=0`

Intermediate coverage check after 137 rows:

- Query: `4888db8f-df3c-4df5-b054-a96377c40cfb`
- `eligible_calls=263`, `succeeded_covered_calls=137`, `remaining_calls=126`

## Current State

Backfill is complete for all currently eligible archived call recordings with object keys in the data lake. Recurring processing has not been enabled. JKS driver/reporter crons remain disabled for containment until recurring operation is explicitly approved and smoke-tested.
