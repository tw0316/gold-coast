# gcoffers.com Payload CMS Whole-Site Migration Goal Owner

## Final goal

Create a branch, commit the implementation, push the branch, and raise a PR implementing `/Users/jarvis/LocalRepos/gold-coast/epics/active/gcoffers-payload-cms-whole-site.md`.

Definition of done:

- A working local/provisionable Next.js + Payload app exists for seller and buyer pages.
- Payload collections, access control, and seed fixtures cover pages, deals, media, markets, FAQs, site settings, buyer signups, and deal interest.
- Public visibility matches the exact deal predicates in the epic.
- Seller lead, buyer signup, and deal-interest routes preserve S3-first persistence with mocked GHL/alert verification.
- AWS Terraform for the new runtime validates safely with production cutover disabled by default.
- Docs, runbook, migration plan, rollback plan, and verification evidence are included.
- Branch is pushed and a GitHub PR is opened.

## Source

- Epic/spec: `/Users/jarvis/LocalRepos/gold-coast/epics/active/gcoffers-payload-cms-whole-site.md`
- Requested project root: `/Users/jarvis/LocalRepos/gold-coast`
- Implementation worktree: `/Users/jarvis/LocalRepos/gold-coast-gcoffers-payload-cms`
- Base branch: `origin/feat/data-lake-monorepo-slice-1`
- Feature branch: `feat/gcoffers-payload-cms-site`
- User approval/context: Slack thread `C0B6YFH9B96:1780702987.289439`, 2026-06-05

## Hard guardrails

- Do not merge the PR.
- Do not deploy.
- Do not apply Terraform.
- Do not change DNS, CloudFront aliases, production S3/API Gateway/Lambda, or live AWS resources.
- Do not send live GHL, Slack, or email alerts.
- Terraform PR work is validate/plan-only, with `enable_dns_cutover`, `enable_prod_alias`, and `enable_live_alerts` disabled by default.
- Do not expose secrets or raw PII in Slack, docs, logs, run-status artifacts, PR evidence, or committed files.
- Keep S3-first persistence for seller leads, buyer signups, and deal-interest.
- Keep Payload as CMS/admin, not a replacement CRM.
- Protect deal exact addresses and hidden/draft media by default.
- Never run unbounded recursive searches from the project/workspace root. Use bounded searches with explicit roots, excludes, output caps, and timeouts.

## Owner model

The recurring goal driver owns progress and state. It should:

1. Read this `GOAL.md`, `.jks/gcoffers-payload-cms/goal-state.json`, and the source epic.
2. Reconcile completed child work before starting new work.
3. Start exactly one bounded next slice when no slice is active.
4. Prefer subagents for implementation/research, but do not wait inside the driver turn for long work.
5. Run small verification directly when it is three focused commands or fewer.
6. Send product/code changes to JKS subteams/workers. The owner may update state/evidence/reporting docs and commit verified worker output when appropriate, but should not directly edit product code.
7. Update `.jks/gcoffers-payload-cms/goal-state.json` every tick with active slice, child reliability, evidence, blockers, next action, and rough percent.
8. Mark true blockers clearly; distinguish them from normal execution gaps.
9. Leave routine user-facing reporting to the reporter cron.
10. Send the final completion report before disabling crons.

## Queue

1. Preflight inventory and architecture ADR.
2. Repo scaffold for `apps/gcoffers-site`.
3. Payload schema and access control.
4. Seller-site page migration baseline.
5. Buyer/deals page migration baseline.
6. S3-first form pipeline.
7. AWS infrastructure design/code.
8. Docs, smoke tests, PR evidence, branch push, and PR creation.
