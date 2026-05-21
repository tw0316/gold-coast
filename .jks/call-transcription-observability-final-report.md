# Call Transcription Observability V1.1 Final Report

Date: 2026-05-21

Status: complete.

## Delivered

- Source-aware sanitized Slack alerts for the transcription job.
- Runtime alert fields in status JSON: `alert_status`, `alert_error`, `log_path`, `cloudwatch_log_url`, `duration_seconds`, and `image_tag`.
- Sanitized per-run JSONL logs under `run-status/ghl-call-transcription/logs/`.
- Shared Athena operator surface: `gold_coast.job_run_status`.
- Transcription raw run-status backing table: `gold_coast.run_status_ghl_call_transcription_raw`.
- Transcription smoke SQL: `006` freshness, `007` failure/pending retry, `008` coverage, `009` alert/log fields.
- Operator docs updated for run-status and call-transcription observability.
- Terraform wiring for transcription Slack webhook injection, alert mode, launch-window success alerts, CloudWatch log URL, and least-privilege secret read.
- Live acceptance evidence captured without transcripts, audio, secrets, recording URLs, contact examples, or raw PII.

## Live State

- Core GHL refresh: enabled, `rate(1 hour)`, task definition revision 10.
- Call transcription: enabled, `rate(1 hour)`, task definition revision 3.
- Deployed image tag: `4172db1379276f7c1220bc3d9a268312dc07d6cc`.
- Controlled smoke run: `observability-smoke-20260521T1547Z`, exit code `0`, status `succeeded`.
- Slack alert: `posted`.
- Latest Athena smoke checks: all passed after legacy status JSON compaction.

## Guardrail Confirmation

- No transcription generation logic was intentionally changed.
- No transcript table grain was changed.
- No core GHL refresh behavior was changed beyond repinning the shared image tag through Terraform.
- No privacy constraints were loosened.

## Evidence

- `.jks/call-transcription-observability-verification-evidence.md`
- `.jks/call-transcription-observability-live-acceptance-evidence.md`
- Worker artifacts:
  - `.jks/call-transcription-observability-runtime-evidence.md`
  - `.jks/call-transcription-observability-terraform-evidence.md`
  - `.jks/call-transcription-observability-athena-docs-evidence.md`
