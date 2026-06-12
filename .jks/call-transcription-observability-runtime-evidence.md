# Call Transcription Observability Runtime Evidence

Slice: `slice-1-alert-runtime-observability`
Started: 2026-05-21

## Scope

- Assigned files only:
  - `apps/data-lake/src/gold_coast_data_lake/alerts.py`
  - `apps/data-lake/src/gold_coast_data_lake/jobs/ghl_call_transcription.py`
  - `apps/data-lake/tests/test_alerts.py`
  - `apps/data-lake/tests/test_transcription.py`
  - `.jks/call-transcription-observability-runtime-evidence.md`
- No external AWS, OpenAI, GHL, Slack webhook, Docker, Terraform apply, or provider calls authorized or run.
- No transcript text, raw provider payloads, recording URLs, webhook URLs, secrets, emails, phones, contact examples, or raw PII belong in this artifact.

## Initial State

- Source epic: `/Users/jarvis/.openclaw/workspace/epics/active/gold-coast-call-transcription-observability-v1-1.md`
- Project root: `/Users/jarvis/LocalRepos/gold-coast`
- Existing dirty files observed before this slice work:
  - `GOAL.md`
  - `goal-state.json`
  - untracked workspace/context files at repo root
- Those files are outside this slice write scope and were not modified by this worker.

## Commands Run

- `git status --short`
- `sed -n '1,260p' /Users/jarvis/.openclaw/workspace/epics/active/gold-coast-call-transcription-observability-v1-1.md`
- `sed -n '1,260p' GOAL.md`
- `sed -n '1,260p' goal-state.json`
- `sed -n '1,260p' apps/data-lake/src/gold_coast_data_lake/alerts.py`
- `test -f .jks/call-transcription-observability-runtime-evidence.md && sed -n '1,220p' .jks/call-transcription-observability-runtime-evidence.md || true`
- `sed -n '1,260p' apps/data-lake/src/gold_coast_data_lake/jobs/ghl_call_transcription.py`
- `sed -n '260,620p' apps/data-lake/src/gold_coast_data_lake/jobs/ghl_call_transcription.py`
- `sed -n '620,1040p' apps/data-lake/src/gold_coast_data_lake/jobs/ghl_call_transcription.py`
- `sed -n '1,260p' apps/data-lake/tests/test_alerts.py`
- `sed -n '1,340p' apps/data-lake/tests/test_transcription.py`
- `sed -n '340,760p' apps/data-lake/tests/test_transcription.py`
- `sed -n '760,1220p' apps/data-lake/src/gold_coast_data_lake/jobs/ghl_call_transcription.py`
- `rg -n "alert_callback|AlertConfig|slack_payload|write_and_publish_run_status|RunLogger|run-status|status.json|duration_seconds" apps/data-lake/src/gold_coast_data_lake apps/data-lake/tests`
- `sed -n '1,360p' apps/data-lake/src/gold_coast_data_lake/batch.py`
- `sed -n '360,760p' apps/data-lake/src/gold_coast_data_lake/batch.py`
- `rg -n "gold_coast_data_lake.alerts|slack_payload|alert_callback|SLACK_WEBHOOK_URL|ALERT_MODE|SUCCESS_ALERT_UNTIL" -S apps/data-lake src infra docs sql`
- `sed -n '1,240p' apps/data-lake/src/gold_coast_data_lake/jobs/ghl_batch_refresh.py`
- `sed -n '540,630p' apps/data-lake/tests/test_batch.py`
- `sed -n '1,220p' apps/data-lake/src/gold_coast_data_lake/storage.py`
- `rg -n "write_run_status\\(|build_run_status\\(|write_and_publish_run_status\\(|publish_run_status\\(" apps/data-lake/tests apps/data-lake/src/gold_coast_data_lake/jobs/ghl_call_transcription.py`
- `find apps/data-lake -maxdepth 2 -type f \( -name 'pyproject.toml' -o -name 'pytest.ini' -o -name 'setup.cfg' -o -name 'requirements*.txt' \) -print`
- `sed -n '1,220p' apps/data-lake/pyproject.toml`
- `rg -n "execute_transcription_run" apps/data-lake`
- `rg -n "def sanitize_error_value|SENSITIVE" apps/data-lake/src/gold_coast_data_lake/transcription.py`
- `sed -n '50,90p' apps/data-lake/src/gold_coast_data_lake/transcription.py && sed -n '740,800p' apps/data-lake/src/gold_coast_data_lake/transcription.py`
- `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=src python3 -m unittest tests.test_alerts tests.test_transcription` (first run failed on two mismatched test assertions; code path was correct, assertions were corrected)
- `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=src python3 -m unittest tests.test_alerts tests.test_transcription` (passed: 26 tests)
- `git diff -- apps/data-lake/src/gold_coast_data_lake/alerts.py apps/data-lake/src/gold_coast_data_lake/jobs/ghl_call_transcription.py apps/data-lake/tests/test_alerts.py apps/data-lake/tests/test_transcription.py .jks/call-transcription-observability-runtime-evidence.md`
- `git status --short`
- `find apps/data-lake -name '__pycache__' -type d -prune -print`
- `sed -n '1,260p' apps/data-lake/src/gold_coast_data_lake/alerts.py`
- `sed -n '1030,1155p' apps/data-lake/src/gold_coast_data_lake/jobs/ghl_call_transcription.py`
- `sed -n '292,315p' apps/data-lake/tests/test_transcription.py`
- `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=src python3 -m unittest tests.test_alerts tests.test_transcription` (passed: 26 tests)
- `git diff --check` (passed)

## Changed Files

- `.jks/call-transcription-observability-runtime-evidence.md`
- `apps/data-lake/src/gold_coast_data_lake/alerts.py`
- `apps/data-lake/src/gold_coast_data_lake/jobs/ghl_call_transcription.py`
- `apps/data-lake/tests/test_alerts.py`
- `apps/data-lake/tests/test_transcription.py`

## Implementation Notes

- Generalized `slack_payload` dispatch by `source`, preserving the existing `ghl` core-refresh payload as the default path.
- Added a source-specific `ghl-call-transcription` Slack payload focused on run status, duration, image tag, selected/skipped counts, attempted/succeeded/failed/pending-retry counts, curated row count, CloudWatch link, and sanitized error fields.
- Extended alert text sanitization for S3 URIs, recording/audio/transcript URLs, API keys, emails, phones, webhook markers, and raw JSON-like provider payloads.
- Added transcription runtime flags:
  - `--alert-mode`
  - `--success-alert-until`
- Transcription alerting reads `SLACK_WEBHOOK_URL` only from process env through `AlertConfig`.
- Added sanitized JSONL run logging under `run-status/ghl-call-transcription/logs/run=<run_id>.jsonl`.
- Added S3 upload of JSONL logs when `status_s3_bucket` is configured.
- Added `log_path`, `alert_status`, `alert_error`, and `duration_seconds` to transcription run-status payloads.
- Changed historical transcription `runs/run=<run_id>/status.json` writes to single-line JSON for Athena readability. Latest pointer files remain human-readable JSON.
- Alert send failures are captured as sanitized `alert_status="failed"` plus `alert_error`; they do not fail the transcription job itself.

## Verification

- `PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=src python3 -m unittest tests.test_alerts tests.test_transcription`
  - Result: passed, 26 tests.
- `git diff --check`
  - Result: passed.
- External calls: none.
