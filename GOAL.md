# Gold Coast Call Transcription Foundation Goal Owner

## Final Goal

Build the transcription foundation for archived Gold Coast GHL call recordings. Every archived call recording must have a transcript status, successful transcripts must be queryable in `gold_coast.call_transcripts` with full transcript text and source lineage, and transcription failures must not affect the existing hourly GHL refresh.

Acceptance criteria:
- Archived call recordings join to transcript status: `succeeded`, `failed`, `pending_retry`, or `skipped_no_recording`.
- `gold_coast.call_transcripts` exposes full transcript text, provider/model metadata, artifact schema version, usage/error metadata, timestamps, and lineage back to call/message/contact/opportunity IDs and recording S3/checksum fields.
- Idempotency uses `call_message_id`, `recording_sha256`, artifact schema version, and transcription model.
- Existing GHL refresh remains read-only and healthy if transcription fails.
- No raw audio, recording URLs, API keys, Slack webhooks, raw PII dumps, or full transcripts are written to Slack, unsafe logs, or committed artifacts.
- Real sample/backfill runs are bounded, evidenced, and reviewed before recurring operation.

## Source

- Epic/spec: `/Users/jarvis/.openclaw/workspace/epics/active/gold-coast-call-transcription-and-insights.md`
- Project root: `/Users/jarvis/LocalRepos/gold-coast`
- User handoff: Slack `#jarvis-development` thread `1779320292.349589`, 2026-05-20
- Active resume handoff: Slack `#jarvis-development` thread `1779326885.613529`, 2026-05-20
- Better reference repo: `/Users/jarvis/LocalRepos/mortgage`
- Better Janus reference path: `/Users/jarvis/LocalRepos/mortgage/janus`

## Current Status

- Call transcription foundation is complete and live.
- Local implementation slices 2-7 are complete through recurring production operation.
- Real sample run `sample-20260520T2258Z` succeeded: 1 selected, 1 attempted, 1 succeeded, 0 failed, 0 pending retry.
- Longer sample run `long-sample-20260520T2320Z` succeeded on a 318-second call: 1 selected, 1 attempted, 1 succeeded, 0 failed, 0 pending retry.
- Throttled backfill completed after Tej approved proceeding: 261 additional calls processed across 7 bounded runs, all succeeded, 0 failed, 0 pending retry.
- `gold_coast.call_transcripts` exists in Glue/Athena with 263 curated rows, all succeeded.
- Final coverage query showed 263 eligible recorded calls, 263 covered, 0 remaining.
- Final `sql/data-lake/smoke/005_call_transcripts.sql` passed all duplicate-grain, status, lineage, and non-empty transcript checks.
- Recurring transcription schedule `gold-coast-data-lake-ghl-call-transcription` is enabled at `rate(1 hour)` and bounded to 10 calls / 10 transcriptions per run.
- Controlled ECS recurring smoke `recurring-smoke-20260521T1302Z` exited 0, skipped all existing covered calls, and republished 263 transcript rows.
- Existing core hourly GHL refresh schedule `gold-coast-data-lake-ghl-refresh` remains enabled at `rate(1 hour)` on task definition revision 8. Manual ECS core refresh smoke `20260521T130422Z` exited 0 and passed in-run Athena smoke.
- JKS driver/reporter crons are disabled after completion.

## Hard Guardrails

- Transcription only. No summaries, coaching insight generation, CRM datapoint extraction, dashboards, Slack scorecards, or GHL write-back.
- Process all calls with recordings; do not add a minimum duration threshold.
- Use existing private S3 archived recordings as the audio source, not GHL recording URLs.
- Store full transcript text in Athena, but keep V1 access and docs scoped to Tej/Jarvis.
- Use direct OpenAI transcription by default, modeled on Better Janus. Do not route OpenAI through Bedrock in V1.
- Do not expose raw transcripts, raw audio, recording URLs, credentials, webhook URLs, or raw PII dumps in Slack, docs, logs, status files, or committed artifacts.
- Do not let transcription failures fail or roll back the existing hourly GHL refresh.
- Do not run full backfill, recurring enablement, destructive cleanup, or broad cloud changes without explicit evidence and acceptance gates.
- Never run unbounded recursive searches from the project/workspace root. Use bounded searches with explicit roots, excludes, output caps, and timeouts.

## Owner Model

The recurring goal driver owns progress and state. It should:

1. Read `goal-state.json`, `GOAL.md`, and relevant `.jks/` evidence.
2. Reconcile completed child work before starting new work.
3. Start exactly one bounded next slice when no slice is active.
4. Prefer subagents for implementation/research, but do not wait inside the driver turn for long work.
5. Run small verification directly when it is three focused commands or fewer.
6. Send product/code changes to JKS workers. The owner may update state, evidence, reporting docs, and commits for verified worker output, but should not directly edit product code.
7. Update `goal-state.json` every tick with active slice, child reliability, evidence, blockers, next action, and rough percent.
8. Treat the missing OpenAI API key as a sample/backfill/runtime credential gate, not a reason to stop schema and local implementation work.
9. Keep routine driver ticks silent; the reporter owns scheduled progress posts.
10. Send the final completion report before disabling crons.

## Queue

1. OpenAI secret and sample preflight.
2. Transcript artifact contract: table grain, S3 layout, schema versioning, Athena DDL, and docs.
3. Transcription engine: S3 audio read, OpenAI wrapper, Janus-style fallback/transcode handling, idempotency, artifact writes, and tests.
4. Runtime and infrastructure: Fargate entrypoint, Secrets Manager contract, IAM, lock, logs, and run status.
5. Curated publish and smoke checks: Parquet/Glue/Athena table updates, duplicate checks, lineage checks, and acceptance SQL.
6. Bounded real sample and backfill: process real archived recordings after the OpenAI key exists, capture quality/cost evidence, then run throttled backfill.
7. Recurring operation and final acceptance: enable recurring processing if approved, verify core refresh health, and produce final evidence/docs.
