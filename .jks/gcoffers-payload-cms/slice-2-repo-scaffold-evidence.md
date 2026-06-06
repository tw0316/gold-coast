# slice-2-repo-scaffold evidence

## Scope
- Slice: `slice-2-repo-scaffold` / repo scaffold for `apps/gcoffers-site`.
- Workdir: `/Users/jarvis/LocalRepos/gold-coast-gcoffers-payload-cms`.
- Allowed write scope used: `apps/gcoffers-site/**` and this evidence file.
- Changes left uncommitted.

## Quality review fixes applied
- Hardened `src/payload.config.ts` environment handling:
  - `DATABASE_URI` and `PAYLOAD_SECRET` now use a shared `requireConfigEnv` helper.
  - Missing, blank, or `[REDACTED_*]` placeholder values fail fast for production/start/runtime.
  - Explicit local-only fallbacks remain available for development/test and scaffold build/codegen/typecheck paths so local verification does not require real secrets.
  - `DATABASE_URI` is no longer passed as possibly `undefined` to the Postgres adapter.
- Gated `/api/graphql-playground` to development only. Outside `NODE_ENV=development`, the route returns `404`.
- Changed the `users` collection role default from `admin` to `editor`.
- Updated `@types/node` from Node 25 types to Node 22 types (`22.19.20`) and refreshed `package-lock.json` with `npm install`.
- Updated `README.md` to document production env requirements, safe local fallback behavior, and GraphQL playground gating.
- Expanded `scripts/verify-scaffold.mjs` to assert the env hardening, dev-only playground gate, non-admin role default, GraphQL route files, and Node 22 type package.

## Commands run and outcomes

### Dependency update
- `npm view @types/node@22 version --json`
  - Outcome: success; confirmed available Node 22 type versions, with `22.19.20` selected.
- `npm install`
  - Outcome: success; `changed 2 packages, and audited 282 packages in 987ms`.
  - npm still reports `11 moderate severity vulnerabilities`; no audit fix was run because broader dependency substitutions are outside this scaffold quality fix.

### Scaffold verification / typecheck / build
- `npm run verify:scaffold`
  - Outcome: success: `Scaffold verification passed`.
- `npm run typecheck`
  - First outcome after edits: failed on a TypeScript narrowing issue in `requireConfigEnv` (`string | undefined` return).
  - Fix: tightened the guard to `value !== undefined && !isUnsetOrPlaceholder(value)`.
- `npm run verify:scaffold && npm run typecheck && npm run build`
  - Outcome: success.
  - Build generated Payload import map first, compiled successfully, ran TypeScript, generated static pages, and listed routes:
    - `/`
    - `/_not-found`
    - `/admin/[[...segments]]`
    - `/api/[...slug]`
    - `/api/graphql`
    - `/api/graphql-playground`
    - `/api/health/public-content`
    - `/api/health/readiness`

### Runtime-oriented checks
- Controlled fail-fast check using direct Payload CLI import with `NODE_ENV=production` and `npm_lifecycle_event=start`:
  - Missing `DATABASE_URI`: expected failure, status `1`, output included `DATABASE_URI must be set for production/start/runtime`.
  - Missing `PAYLOAD_SECRET` with a dummy non-placeholder database URI: expected failure, status `1`, output included `PAYLOAD_SECRET must be set for production/start/runtime`.
- Production server smoke with dummy local-only env values:
  - Started `npm run start -- -p 3101` on `127.0.0.1`.
  - `/api/health/readiness`: `200 {"ok":true,"service":"gcoffers-site","checks":{"app":"ok","database":"not_checked_in_slice_2"}}`
  - `/api/graphql-playground`: `404`
  - Stopped the background `next start` process after smoke.

## Changed files

Primary slice files under `apps/gcoffers-site`:
- `apps/gcoffers-site/package.json`
- `apps/gcoffers-site/package-lock.json`
- `apps/gcoffers-site/README.md`
- `apps/gcoffers-site/scripts/verify-scaffold.mjs`
- `apps/gcoffers-site/src/payload.config.ts`
- `apps/gcoffers-site/src/collections/Users.ts`
- `apps/gcoffers-site/src/app/(payload)/api/graphql-playground/route.ts`

Evidence file:
- `.jks/gcoffers-payload-cms/slice-2-repo-scaffold-evidence.md`

## Caveats / non-goals
- This remains scaffold only. Domain collections, visibility/access predicates, private media delivery, S3-first form handlers, GHL/Slack/email integrations, broader tests, and Terraform are intentionally left to later slices.
- Health routes intentionally do not check database connectivity in slice 2.
- No Docker image was built or pushed; no Terraform or live external integrations were run.
- `npm install` still reports `11 moderate severity vulnerabilities`; this quality fix did not alter the selected Payload/Next dependency set beyond Node 22 type definitions.

## Secret / PII safety
- `.env.example` contains `[REDACTED_*]` placeholder values only.
- Production/start/runtime paths now reject missing, blank, or `[REDACTED_*]` `DATABASE_URI` / `PAYLOAD_SECRET` values.
- Local fallback strings in code are scoped to development/test/build/codegen/typecheck only and are documented as non-runtime scaffold behavior.
- No real secrets, credentials, tokens, webhook URLs, raw emails, phone numbers, or raw PII were intentionally added.
- Ran a scoped safety scan over `apps/gcoffers-site` plus this evidence file, excluding generated build/vendor/cache artifacts.
- Final scan result: `SAFETY_SCAN_OK files_scanned=30`.
