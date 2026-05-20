# Gold Coast Data Lake V1.1 Incremental Correction Goal Owner

## Final Goal

Validate and reconcile the Gold Coast Data Lake V1.1 incremental correction against the ready-for-JKS epic. The production query layer must run hourly, expose event-safe calls/messages, latest-state contacts/opportunities, stage/status transition history, daily internal audit snapshots, first-class core curated Athena tables, and `gold_coast_reporting` metric marts.

## Source

- Epic/spec: `/Users/jarvis/.openclaw/workspace/epics/active/gold-coast-data-lake-v1-1-incremental-correction.md`
- Project root: `/Users/jarvis/LocalRepos/gold-coast`
- User handoff: Slack #jarvis-development thread `1779234305.097569`
- Prior build evidence: `.jks/gold-coast-data-lake-v1-1-incremental-correction-evidence.md`

## Hard Guardrails

- Keep the old full-snapshot schedule disabled until V1.1 cutover validation passes.
- No GHL writes from `apps/data-lake`.
- No blind S3 purge.
- Do not delete old generated V1 snapshot data until V1.1 passes validation and Tej explicitly approves cleanup.
- No dashboards, transcription, coaching artifacts, website leads, or marketing sources.
- Core curated Athena tables are first-class query targets.
- `gold_coast_reporting` is for repeated metrics and marts, not the only query surface.
- Keep user-facing JKS updates prefixed with a status label.
- Do not expose credentials or webhook URLs in code, docs, logs, Slack, or artifacts.

## Owner Model

This JKS turn is validation-first. The owner may patch narrow repo hygiene gaps found during validation, but production/cloud mutations are limited to read-only verification unless explicitly required by the V1.1 cutover evidence trail. Old generated V1 cleanup remains blocked pending explicit Tej approval.

## Queue

1. Reconcile epic requirements against existing repo evidence and implementation.
2. Run local verification gates for code, Terraform, and repo hygiene.
3. Verify live AWS schedule/task/latest-success state is V1.1 hourly.
4. Verify Athena smoke and acceptance SQL against current V1.1 core/reporting tables.
5. Patch narrow validation gaps found during review.
6. Record final JKS state and remaining approval gate.

