# Payload site PR evidence

Status: local PR evidence for `slice-8-docs-pr-evidence`. This file is intentionally documentation/evidence only and contains no production secrets, private keys, raw PII, live webhook URLs, or production credentials.

## Scope

Epic: `/Users/jarvis/LocalRepos/gold-coast/epics/active/gcoffers-payload-cms-whole-site.md`

Implementation worktree: `/Users/jarvis/LocalRepos/gold-coast-gcoffers-payload-cms`

Feature branch observed by local status: `feat/gcoffers-payload-cms-site...origin/feat/data-lake-monorepo-slice-1 [ahead 1]`

Final PR URL: https://github.com/tw0316/gold-coast/pull/5

This evidence covers the final documentation/runbook slice plus focused local verification of the already-owner-verified slice 1-7 implementation output. This worker did not commit, push, open a PR, deploy, run Terraform plan/apply, change DNS, mutate AWS resources, or send live external alerts.

## Changed file inventory

### Slice 8 documentation/evidence files created in this worker run

- `.jks/gcoffers-payload-cms/slice-8-docs-pr-evidence.md`
- `docs/ops/payload-site-runbook.md`
- `docs/ops/payload-site-pr-evidence.md`

### Existing uncommitted implementation/evidence output from prior slices observed in git status

Tracked modified files:

- `.jks/gcoffers-payload-cms/goal-state.json` — existing owner state from prior slices; not edited by this worker.
- `.jks/gcoffers-payload-cms/slice-5-buyer-deals-baseline-evidence.md` — existing evidence update from prior slices; not edited by this worker.
- `apps/gcoffers-site/package-lock.json`
- `apps/gcoffers-site/package.json`
- `apps/gcoffers-site/src/app/(frontend)/page.tsx`
- `apps/gcoffers-site/src/app/(frontend)/styles.css`
- `apps/gcoffers-site/src/components/seller/SellerLeadForm.tsx`
- `apps/gcoffers-site/src/lib/seller/formContract.ts`

Untracked prior-slice files/directories observed before slice-8 docs were added:

- `.jks/gcoffers-payload-cms/slice-6-s3-first-form-pipeline-evidence.md`
- `.jks/gcoffers-payload-cms/slice-7-aws-infra-evidence.md`
- `apps/gcoffers-site/scripts/verify-buyer-deals-site.mjs`
- `apps/gcoffers-site/scripts/verify-s3-first-form-pipeline.mjs`
- `apps/gcoffers-site/src/app/(buyer)/`
- `apps/gcoffers-site/src/app/api/buyer-signups/`
- `apps/gcoffers-site/src/app/api/deal-interest/`
- `apps/gcoffers-site/src/app/api/seller-leads/`
- `apps/gcoffers-site/src/components/buyer/`
- `apps/gcoffers-site/src/fixtures/buyerDeals.ts`
- `apps/gcoffers-site/src/lib/buyer/`
- `apps/gcoffers-site/src/lib/deals/publicBuyerDeals.ts`
- `apps/gcoffers-site/src/lib/forms/`
- `infra/payload-site/`

## Commands run and results

All commands were run locally from the implementation worktree. Output summaries are intentionally concise and redact/avoid raw PII.

| Command | Directory | Exit | Result summary |
| --- | --- | ---: | --- |
| `git status --short --branch` | repo root | 0 | Confirmed feature branch and existing uncommitted prior-slice implementation output. |
| file searches for slice-8 evidence and `docs/ops/payload-site-*.md` | repo/docs | 0 | No existing slice-8 evidence or payload ops docs before this worker created them. |
| `git diff --name-status` | repo root | 0 | Listed tracked modified files from prior slices; no slice-8 docs existed yet. |
| `git ls-files --others --exclude-standard` | repo root | 0 | Listed untracked prior-slice evidence, buyer/deals, S3-first form, and Terraform infra files. |
| `npm run verify:scaffold` | `apps/gcoffers-site` | 0 | `Scaffold verification passed`. |
| `npm run verify:schema-access` | `apps/gcoffers-site` | 0 | `Payload schema/access verification passed`; confirmed exact public deal predicates, hidden/draft/private media protections, staff-only submission mirrors, and public query guardrails. |
| `npm run verify:seller-site` | `apps/gcoffers-site` | 0 | `Seller site verification passed`; confirmed seller routes/content, `/get-your-offer` redirect/noindex, seller lead form contract, assets, and no retired live seller API endpoint in scoped files. |
| `npm run verify:buyer-deals-site` | `apps/gcoffers-site` | 0 | `Buyer deals site verification passed`; confirmed host-aware buyer surface, buyer routes, public deal helpers, exact visibility/status predicates, address suppression, forms, and scoped safety checks. |
| `npm run verify:s3-first-form-pipeline` | `apps/gcoffers-site` | 0 | `S3-first form pipeline verification passed`; confirmed seller/buyer/deal-interest API routes, S3-before-side-effects ordering, mocked GHL/Payload/Slack/email effects, S3 failure skipping side effects, honeypot/rate/idempotency controls, and safety checks. |
| `npm run typecheck` | `apps/gcoffers-site` | 0 | `tsc --noEmit` completed successfully. |
| `npm run build` | `apps/gcoffers-site` | 0 | Payload import map generation found no new imports; Next.js 16.2.7 production build compiled successfully in 6.2s and generated seller, buyer/deal, Payload/admin/API, health, and form routes. |
| `command -v terraform && terraform version` | `infra/payload-site` | 0 | Terraform available at `/opt/homebrew/bin/terraform`; version `1.5.7` on `darwin_arm64`; CLI reported it is out of date versus latest. |
| `terraform fmt -check -recursive` | `infra/payload-site` | 0 | Terraform formatting check passed. |
| `terraform init -backend=false -input=false` | `infra/payload-site` | 0 | Backend-disabled init succeeded; installed `hashicorp/aws v5.100.0` and `hashicorp/random v3.9.0`. |
| `terraform validate` | `infra/payload-site` | 0 | `Success! The configuration is valid.` |
| `rm -rf .terraform .terraform.lock.hcl` | `infra/payload-site` | 0 | Removed Terraform init artifacts created by backend-disabled validation. |
| docs/evidence safety scan via Python | repo root | 0 | `DOC_SAFETY_SCAN_OK`; no raw email, Slack webhook URL, AWS access key, private key marker, or GitHub token found in the slice-8 docs/evidence files. Re-run after final evidence update also returned `DOC_SAFETY_SCAN_OK`. |
| docs/evidence phone-like scan via Python | repo root | 0 | `DOC_PHONE_SCAN_OK`; no North American phone-number-like examples found in the slice-8 docs/evidence files. |
| `git diff --check -- docs/ops/payload-site-runbook.md docs/ops/payload-site-pr-evidence.md .jks/gcoffers-payload-cms/slice-8-docs-pr-evidence.md` | repo root | 0 | Passed with no whitespace errors for slice-8 docs/evidence. Re-run after final evidence update also passed. |
| `git status --short --branch` | repo root | 0 | Final status remains on `feat/gcoffers-payload-cms-site...origin/feat/data-lake-monorepo-slice-1 [ahead 1]`; slice-8 docs are untracked and prior-slice uncommitted app/infra/evidence output remains present. |

## Acceptance criteria mapping

| Epic / goal acceptance item | Evidence |
| --- | --- |
| Working local/provisionable Next.js + Payload app for seller and buyer pages | `verify:scaffold`, `verify:seller-site`, `verify:buyer-deals-site`, `typecheck`, and `build` all passed. Build output included seller/shared pages, buyer pages, public deal SSG routes, Payload admin/API routes, health routes, and public form routes. |
| Payload collections, access control, and seed fixtures cover pages, deals, media, markets, FAQs, site settings, buyer signups, and deal interest | `verify:schema-access` passed and confirmed all required collections plus public query guardrails and staff-only submission mirror collections. |
| Public visibility matches exact deal predicates | `verify:schema-access` and `verify:buyer-deals-site` passed. They confirmed public detail/API: `websiteVisibility === "public"` and status in `coming_soon`, `available`, `under_contract`, `sold`; active listing excludes sold; sold proof only includes public sold deals; draft/hidden/preview/archived/cancelled/internal-only are excluded. |
| Exact addresses and hidden/draft media are protected by default | `verify:schema-access` and `verify:buyer-deals-site` passed, including exact address removal by default, app-mediated public media paths, and denial of draft/hidden/private media in public helpers. |
| Seller lead, buyer signup, and deal-interest routes preserve S3-first persistence with mocked GHL/alert verification | `verify:s3-first-form-pipeline` passed. It confirmed S3 success before side effects, skipped side effects on S3 persistence failure, hash-based S3 keys, buyer GHL tags, deal-interest GHL tag/note, redacted Slack summary, and mocked/skipped live side effects. |
| AWS Terraform validates safely with production cutover disabled by default | `terraform fmt -check -recursive`, backend-disabled `terraform init`, and `terraform validate` passed. The runbook documents default-disabled `enable_dns_cutover`, `enable_prod_alias`, and `enable_live_alerts`. No plan/apply was run. |
| Docs, runbook, migration plan, rollback plan, and smoke-test commands are included | `docs/ops/payload-site-runbook.md` was created with local development instructions, AWS design, approval-gated migration/cutover plan, rollback/backout plan, smoke-test commands/expected outcomes, and operations guidance. |
| PR evidence includes changed files, commands/results, caveats, and no-live-side-effect statement | This file provides changed file inventory, command results, acceptance mapping, caveats, and explicit no-live-side-effect statement. |

## Caveats and follow-up for owner verification

- This worker was explicitly instructed to leave changes uncommitted and not push/open a PR. Owner must inspect, commit, push, and create the PR if satisfied.
- Terraform plan was not run because this worker was not authorized to read live AWS state/credentials or perform plan/apply. Safe plan instructions are documented in the runbook.
- Terraform CLI is available but reports version `1.5.7` is out of date. Validation still succeeded.
- `ecs_desired_count` and autoscaling minimum default to `0` until an immutable image and required Secrets Manager values exist.
- The current app runtime contract needs a populated `DATABASE_URI` secret or an approved app-side derivation from RDS secret metadata before ECS tasks should run in production/start mode.
- Health endpoints are non-secret scaffold endpoints today; production launch should verify DB/public-content freshness behavior without exposing secrets.
- Live GHL, Slack, email, SMS, production S3, production Payload mirror writes, DNS cutover, and production CloudFront aliases were not exercised. PR/local verification used mocked side effects and safe local/static checks.
- Known prior-slice dependency caveat from owner state: an earlier npm install/audit reported moderate dependency vulnerabilities; remediation was deferred and not changed by this documentation slice.

## No-live-side-effect statement

During the worker evidence run, no commit, push, PR creation, deployment, Terraform plan/apply, DNS change, CloudFront alias change, production AWS mutation, production S3 write, live GHL call, live Slack alert, live email alert, SMS alert, or cron edit was performed.

During owner finalization, the local commits were pushed and the PR above was opened. No merge, deployment, Terraform plan/apply, DNS change, CloudFront alias change, production AWS mutation, production S3 write, live GHL call, live Slack alert, live email alert, SMS alert, or cron edit was performed.

## Follow-up staging remediation evidence, 2026-06-06

After PR #5 was merged and the staging runtime was deployed, browser verification found that `/admin` rendered a Next error page even though earlier HTTP checks returned `200`. The visible issue looked like broken CSS, but asset checks showed CSS/JS chunks returned `200`; ECS logs showed the actual root cause was missing Payload Postgres schema tables, including `users`.

PR #6 now captures the staging evidence and remediation: https://github.com/tw0316/gold-coast/pull/6

- Fix commit: `851dbf1b997c491e66c476d60d94dc1978cab248`.
- Fix scope: generated initial Payload migrations and wired `prodMigrations` into the Payload Postgres adapter.
- New staging image: `stage-851dbf1-20260606180226`.
- Staging runtime URL: `https://d15i9adzz532yk.cloudfront.net`.
- Browser admin verification now passes:
  - `/admin?verify=stage-851dbf1-20260606180226` renders the styled Payload first-user setup page.
  - Page title: `Create first user - Gold Coast Offers CMS`.
  - DOM check: `hasNextError=false`.
  - Browser console: no messages and no JavaScript errors.
- Browser homepage verification passes:
  - `/` renders the styled seller homepage.
  - Page title: `Sell Your House Fast in South Florida | Gold Coast Home Buyers`.
- Form verification passes:
  - Seller lead POST returned `200`.
  - `s3Persisted=true`, `s3Mocked=false`.
  - S3 HEAD verified the temporary test object, then the object was deleted.
  - GHL side effect remained mocked.
- CloudWatch check: prior `relation "users" does not exist` error count over the latest 15-minute window was `0`.
- Guardrails preserved: `enable_dns_cutover=false`, `enable_prod_alias=false`, `enable_live_alerts=false`.
- No DNS cutover, production alias, production deployment, production Terraform, or live external alert was performed.

Remaining production caveats:

- `staging.gcoffers.com` remains legacy until DNS/alias cutover is approved.
- Staging DB connection currently uses `sslmode=no-verify`; CA verification needs to be resolved before production cutover.
- Dependency audit still reports `11 moderate severity vulnerabilities`; remediate before production/cutover.
