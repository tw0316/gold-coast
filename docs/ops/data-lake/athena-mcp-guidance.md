# Gold Coast Data Lake Athena MCP Guidance

Status: V1.1 query guidance for Atlas, Jarvis, and MCP-backed SQL generation

## Default Rule

Use the core curated Athena tables in `gold_coast` as first-class query targets. Use `gold_coast_reporting` only for repeated business metric marts.

Do not force every question through `gold_coast_reporting`.

## Core Entity/Event Exploration

Use these when the user asks about actual leads, contacts, messages, calls, recordings, or stage movement:

- `gold_coast.contacts_latest`: one latest row per GHL contact.
- `gold_coast.opportunities_latest`: one latest row per GHL opportunity. In Gold Coast, lead means opportunity.
- `gold_coast.messages`: one durable row per GHL message/event.
- `gold_coast.calls`: one durable row per GHL call message.
- `gold_coast.call_recordings`: one recording archive ledger row per call/message ID.
- `gold_coast.opportunity_stage_history`: one row per observed stage/status transition.

Normal V1.1 queries should not add `snapshot_date`, `run_id`, or `COUNT(DISTINCT ...)` workarounds to avoid repeated refresh duplicates.

## Repeated Metrics

Use `gold_coast_reporting` when the question is a standard metric or recurring operational view:

- `gold_coast_reporting.lead_response`: speed-to-lead, first outbound call/message, contact attempts.
- `gold_coast_reporting.rep_activity_daily`: daily call/message activity by actor.

## Avoid

- Do not query `snapshots/ghl/daily` unless the task is explicitly audit, recovery, or debugging.
- Do not use old V1 repeated snapshot table names such as `gold_coast.contacts` or `gold_coast.opportunities` for normal V1.1 answers.
- Do not generate GHL writes, notes, tasks, workflow triggers, or pipeline/status updates.
- Do not introduce dashboards, transcription, coaching summaries, website leads, or marketing-source logic for V1.1 questions.

## Validation Queries

Use these before trusting a fresh production run:

- `sql/data-lake/smoke/001_latest_success_freshness.sql`
- `sql/data-lake/smoke/002_latest_curated_row_availability.sql`
- `sql/data-lake/smoke/003_critical_table_catalog.sql`
- `sql/data-lake/smoke/004_v1_1_duplicate_source_ids.sql`

The duplicate-source smoke query checks core stable IDs and reporting mart grains.

