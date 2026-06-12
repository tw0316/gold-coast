# Gold Coast Call Transcription Observability V1.1 Goal Owner

## Final Goal

Add V1.1 observability to the live Gold Coast GHL call transcription job.

Definition of done:

- Transcription runs write sanitized JSONL run logs.
- Transcription run-status artifacts include `log_path`, `alert_status`, and `alert_error`.
- Transcription Slack alerts are source-aware and count/status oriented.
- `gold_coast.job_run_status` is the official shared Athena query surface for job health across `ghl-refresh` and `ghl-call-transcription`.
- Freshness/status smoke checks cover transcription job status, failure/pending retry counts, transcript coverage, and alert/log fields.
- Docs explain the operator query contract, alert policy, failure triage, privacy constraints, and backout.
- Live acceptance evidence proves the deployed path without exposing transcripts, raw audio, recording URLs, secrets, webhook URLs, emails, phone numbers, or raw PII.

## Source

- Epic/spec: `/Users/jarvis/.openclaw/workspace/epics/active/gold-coast-call-transcription-observability-v1-1.md`
- Project root: `/Users/jarvis/LocalRepos/gold-coast`
- User handoff: Slack `#jarvis-development` thread `1779376380.186249`, 2026-05-21
- Current deployed V1 commit before this work: `478168c`
- Current transcription schedule: `gold-coast-data-lake-ghl-call-transcription`, `rate(1 hour)`, enabled
- Existing core-refresh observability pattern: `gold-coast-data-lake-ghl-refresh`, `gold_coast.run_status_ghl`, Slack alerts to `#gc-alerts`

## Current Status

- Observability V1.1 is active.
- The epic is `Ready For JKS` with no blocking pending decisions.
- Previous transcription foundation goal is complete and its evidence remains in `.jks/`.
- This goal replaces the active JKS owner files for the V1.1 observability work only.

## Hard Guardrails

- V1.1 observability only.
- Do not modify transcript generation quality, provider/model choice, transcript table grain, backfill behavior, CRM write-back, post-call summaries, coaching insight, or extraction of CRM datapoints.
- Do not disable the live transcription schedule except as an explicit backout step.
- Do not alter core hourly GHL refresh behavior except where shared alert code or shared run-status query surface requires backward-compatible tests.
- Do not expose transcript text, raw audio, provider payloads, recording URLs, API keys, Slack webhook URLs, emails, phone numbers, contact examples, or raw PII in Slack, docs, logs, run-status artifacts, or evidence.
- Athena table locations must point only at historical `runs/` prefixes, never broader parent prefixes that include pointer files or JSONL logs.
- A zero-new-call transcription run is healthy after the backfill.
- Never run unbounded recursive searches from the project/workspace root. Use bounded searches with explicit roots, excludes, output caps, and timeouts.

## Owner Model

The goal owner coordinates progress and state. It should:

1. Read `goal-state.json`, `GOAL.md`, the source epic, and relevant `.jks/` evidence.
2. Reconcile completed child work before starting new work.
3. Keep code changes in bounded JKS worker slices with explicit file ownership.
4. Run owner verification before accepting worker output.
5. Update `goal-state.json` with active slice, child reliability, evidence, blockers, next action, and rough percent.
6. Keep routine progress updates concise and grounded in verified state.
7. Send a final completion report only after live acceptance evidence is captured.

## Queue

1. Alert contract and transcription runtime observability.
2. Terraform alert wiring and task configuration.
3. Shared Athena job-run-status query surface and smoke SQL.
4. Docs and runbook updates.
5. Owner verification, deploy, live acceptance, evidence, and closeout.
