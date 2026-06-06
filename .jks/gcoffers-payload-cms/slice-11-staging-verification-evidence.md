# Slice 11, Staging Verification Evidence

Completed: 2026-06-06T18:21:04Z

Base URL: `https://d15i9adzz532yk.cloudfront.net`
Verify tag: `stage-851dbf1-20260606180226`
PR: `https://github.com/tw0316/gold-coast/pull/6`

## Accountability Note

The first staging verification at `2026-06-06T14:43:00Z` was too shallow for `/admin`: it checked HTTP status and basic HTML, but did not prove that the admin route rendered in a browser. A later browser check showed the admin was actually rendering a Next error page. This evidence supersedes that earlier admin result.

## Root Cause And Remediation

- Symptom reported: admin page appeared broken/unstyled in browser.
- Asset check: admin CSS and JS chunks returned `200`; this was not a missing-CSS asset failure.
- Runtime log root cause: PostgreSQL `relation "users" does not exist`, code `42P01`, from Payload admin querying user/session tables before schema existed.
- Fix committed and pushed to PR #6 at `851dbf1b997c491e66c476d60d94dc1978cab248`:
  - Generated initial Payload migration files under `apps/gcoffers-site/src/migrations/`.
  - Wired `prodMigrations: migrations` into `postgresAdapter` in `apps/gcoffers-site/src/payload.config.ts`.
- New staging image built and deployed: `stage-851dbf1-20260606180226`.
- ECS rollout completed: desired `1`, running `1`, pending `0`.

## Local Validation Before Staging Update

- PASS: `npm run typecheck` in `apps/gcoffers-site`.
- PASS: `npm run build` in `apps/gcoffers-site`.
- PASS: scoped migration/config secret scan. No secret values found or printed.
- PASS: `terraform fmt -check -recursive` in `infra/payload-site`.
- PASS: `terraform validate` in `infra/payload-site`.

## Staging Guardrails Verified

- `enable_dns_cutover=false`
- `enable_prod_alias=false`
- `enable_live_alerts=false`
- No DNS cutover was performed.
- No production CloudFront alias was attached.
- No live external alerts were sent.
- `staging.gcoffers.com` remains legacy; Payload runtime is verified on the generated CloudFront URL.

## Browser Verification After Remediation

- PASS: Browser-rendered `/admin?verify=stage-851dbf1-20260606180226` loads Payload setup UI.
  - Title: `Create first user - Gold Coast Offers CMS`.
  - Visible content: `Welcome`, `To begin, create your first user.`, `Email`, `New Password`, `Confirm Password`, `Role`, `Editor`, `Create`.
  - DOM check: `hasNextError=false`.
  - It no longer shows `This page couldn’t load`.
  - Admin CSS links present from CloudFront:
    - `/_next/static/chunks/2jk8zf88imohl.css`
    - `/_next/static/chunks/28feia4wy46e3.css`
    - `/_next/static/chunks/3t-9gn9cb4dop.css`
  - Browser console: no messages and no JavaScript errors.
- PASS: Browser-rendered homepage `/` loads styled seller page.
  - Title: `Sell Your House Fast in South Florida | Gold Coast Home Buyers`.
  - Snapshot showed navigation, seller hero, seller form fields, consent checkboxes, content sections, and footer/legal links.
  - Visual check confirmed styled layout rather than missing CSS.

## API And Form Verification After Remediation

- PASS: `GET /api/health/readiness` returned JSON `200`.
- PASS: public route smoke checks against generated CloudFront returned expected statuses.
- PASS: `POST /api/seller-leads` staging form test returned `200`.
  - `formType=seller-lead`.
  - `s3Persisted=true`.
  - `s3Mocked=false`.
  - S3 key prefix: `seller-leads/2026-06-06/[REDACTED_TEST_OBJECT].json`.
  - S3 HEAD verification: `true`.
  - Temporary test object deletion: `true`.
  - Side effect `ghl`: `mocked=true`.
- PASS: CloudWatch check for prior admin DB error returned `relationUsersMissingErrorsLast15Min=0`.

## Acceptance Notes

- The admin is now verified by browser rendering, DOM checks, CSS link checks, and clean browser console, not just HTTP status.
- The homepage is verified visually and semantically as styled.
- S3-first form behavior still persists to real S3 before mocked side effects.
- No raw PII, credentials, AWS account IDs, secret ARNs, connection strings, or webhook URLs are included in this evidence.

## Remaining Caveats Before Production Cutover

- `staging.gcoffers.com` still points to the legacy static site until DNS/alias cutover is separately approved.
- Staging `DATABASE_URI` currently uses `sslmode=no-verify`; revisit CA verification before production.
- Dependency audit still has `11 moderate severity vulnerabilities`; needs follow-up before production/cutover.
- Do not merge PR #6, deploy production, apply production Terraform, change DNS, attach production aliases, or send live alerts without explicit approval.
