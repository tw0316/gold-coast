# Slice 5 Evidence: Recording Archival Skip Logic

Source epic: /Users/jarvis/.openclaw/workspace/epics/active/gold-coast-data-lake-recurring-batch-ingestion.md

## Scope

Added idempotent recording archival behavior keyed by stable GHL call message ID.

- Updated apps/data-lake/src/gold_coast_data_lake/storage.py to generate stable recording keys under recordings/ghl/message_id=<messageId>.<ext>.
- Added S3Uploader.find_key_by_prefix so the extractor can detect an existing archived recording before downloading.
- Updated apps/data-lake/src/gold_coast_data_lake/extractor.py to record skipped_existing when a stable recording key already exists.
- Added tests in apps/data-lake/tests/test_extractor.py.
- Updated docs/ops/data-lake/extractor.md.

## Behavior Implemented

- Recurring runs no longer partition recording objects by ingest date.
- Existing recordings are looked up by message-ID prefix before calling the GHL recording download endpoint.
- If a recording already exists, the extractor records archival_status=skipped_existing and does not upload or redownload audio.
- Missing recordings still record archival_status=unavailable and do not abort the run.

## Verification

Covered by the same 23-test suite from Slice 4.

Focused assertions added:

- test_recording_object_key_is_stable_by_message_id
- test_existing_recording_key_is_not_redownloaded
- test_missing_recording_is_recorded_without_aborting_archive

## Guardrails Confirmed

- No live recording downloads were run during verification.
- No AWS resources were created or modified.
- Recording binaries are still never embedded in JSONL, status, logs, or curated tables.
