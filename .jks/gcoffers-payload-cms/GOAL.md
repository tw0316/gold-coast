# gcoffers.com Payload CMS Whole-Site Migration Goal Owner

## Final goal

Implement `/Users/jarvis/LocalRepos/gold-coast/epics/active/gcoffers-payload-cms-whole-site.md`, raise and merge the PR, deploy the Payload runtime to staging, then verify the deployed staging changes and tests.

Definition of done:

- A working local/provisionable Next.js + Payload app exists for seller and buyer pages.
- Payload collections, access control, and seed fixtures cover pages, deals, media, markets, FAQs, site settings, buyer signups, and deal interest.
- Public visibility matches the exact deal predicates in the epic.
- Seller lead, buyer signup, and deal-interest routes preserve S3-first persistence with mocked GHL/alert verification.
- AWS Terraform for the new runtime validates safely with production cutover disabled by default.
- Docs, runbook, migration plan, rollback plan, and verification evidence are included.
- Branch is pushed and a GitHub PR is opened.
- PR is merged into `feat/data-lake-monorepo-slice-1`.
- Staging deployment is completed for the Payload runtime only, with production DNS, production aliases, and live alerts disabled.
- Staging verification proves the deployed runtime serves JSON readiness, Payload admin, seller pages, buyer/deals pages, and safe form behavior.

## Source

- Epic/spec: `/Users/jarvis/LocalRepos/gold-coast/epics/active/gcoffers-payload-cms-whole-site.md`
- Requested project root: `/Users/jarvis/LocalRepos/gold-coast`
- Implementation worktree: `/Users/jarvis/LocalRepos/gold-coast-gcoffers-payload-cms`
- Base branch: `origin/feat/data-lake-monorepo-slice-1`
- Feature branch: `feat/gcoffers-payload-cms-site`
- User approval/context: Slack thread `C0B6YFH9B96:1780702987.289439`, 2026-06-05

## Hard guardrails

- PR merge and staging deployment are now in scope per Tej's 2026-06-06 DoD revision.
- Staging-only infrastructure/app deployment may proceed when `enable_dns_cutover=false`, `enable_prod_alias=false`, and `enable_live_alerts=false`.
- Do not change production DNS, attach production CloudFront aliases, mutate legacy production S3/API Gateway/Lambda, or send live AWS/GHL/Slack/email alerts without a separate explicit production approval.
- Do not expose staging or production secrets, credentials, tokens, DB passwords, webhook URLs, raw PII, or exact private addresses in Slack, docs, logs, evidence, Terraform variables, or committed files.
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
9. Merge PR and reconcile local branch.
10. Deploy Payload runtime to staging with production cutover disabled.
11. Verify staging runtime, admin, site pages, forms, and evidence bundle.
