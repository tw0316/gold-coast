# Gold Coast Data Lake Batch Refresh Goal Owner

## Final Goal

Ship a deterministic AWS-scheduled production GHL batch refresh for the Gold Coast data lake. It must run every 30 minutes from ECS Fargate, write sanitized logs/status, preserve latest-success Athena semantics, alert to the approved Gold Coast alerts channel through AWS-owned webhook delivery, and include acceptance evidence.

## Source

- Epic/spec: `/Users/jarvis/.openclaw/workspace/epics/active/gold-coast-data-lake-recurring-batch-ingestion.md`
- Project root: `/Users/jarvis/LocalRepos/gold-coast`
- User handoff: Slack #jarvis-development thread `1779155732.252079`

## Hard Guardrails

- Start with Slice 1: monorepo refactor while preserving existing website behavior.
- Do not start data-lake refresh infrastructure until Slice 1 is verified.
- No GHL writes from the data-lake runner or `apps/data-lake`.
- Preserve existing website lead-capture GHL writes during repo refactor.
- No local cron, OpenClaw cron, or LLM turns in deployed refresh operations.
- No NAT Gateway or always-on compute without explicit approval.
- No dashboards, transcription, call summaries, coaching analysis, website leads, marketing spend, or Slack scorecards in this epic.
- No credential exposure in code, docs, logs, Slack, or artifacts.
- Do not delete legacy V1 AWS resources.

## Owner Model

The goal owner advances one bounded slice at a time. Subagent output is untrusted until artifacts are inspected and the smallest meaningful verification passes. Verified progress should be recorded in `goal-state.json` and `.jks/`.

## Queue

1. Refactor `tw0316/gold-coast` into the target monorepo skeleton while preserving existing website behavior.
2. Move/import the data-lake code, SQL, docs, and tests into `apps/data-lake/`, `sql/data-lake/`, and `docs/ops/`.
3. Implement the batch runner with run ID, 45-minute DynamoDB TTL lock, status output, sanitized durable logs, and safe manual command.
4. Add production raw refresh orchestration using the existing GET-only extractor and full core-source refresh strategy.
5. Add idempotent recording archival skip logic keyed by stable GHL call message ID.
6. Add run-safe curated publishing, latest-success freshness semantics, immutable run-status files, and lightweight stage-history snapshot/diff support.
7. Add container packaging, ECR image tagging, ECS Fargate task definition, IAM, public-subnet/no-NAT networking, and EventBridge Scheduler at 30-minute cadence.
8. Add AWS-native Slack webhook alerts to `C0B4JTC5VPF`.
9. Add Athena smoke checks, run-status Athena table, and evidence docs.
10. Enable approved schedule and verify the first scheduled production run.
11. Final acceptance/evidence bundle.
