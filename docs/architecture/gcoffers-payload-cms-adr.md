# ADR: gcoffers.com Whole-Site Payload CMS Migration

Status: accepted for PR architecture design; not a deployment approval  
Date: 2026-06-05  
Slice: `slice-1-preflight-adr`

## Scope and sources

This ADR records the preflight inventory and architecture decisions for moving the current seller and buyer/deals surfaces into one AWS-hosted Next.js + Payload CMS stack.

Primary sources inventoried:

- Source epic: `/Users/jarvis/LocalRepos/gold-coast/epics/active/gcoffers-payload-cms-whole-site.md`
- Seller static site: `apps/website`
- Buyer/deals static prototype: `apps/deals`
- Current Lambda form handlers: `services/lead-handler`
- Current website Terraform: `infra/website`
- Buyer PRD: `docs/product/deals-prd.md`
- Website standards: `docs/ops/website-standards.md`
- Root/package/workspace config discovery in the repository root

This ADR intentionally does not authorize deployment, DNS changes, Terraform apply, live alerts, or production resource mutation.

## Current inventory

### Seller surface: `gcoffers.com`

| Route / asset area | Current files | Current behavior / notes for migration |
| --- | --- | --- |
| `/` | `apps/website/index.html` | Seller landing page with header, hero, seller lead form, how-it-works, benefits, comparison, reasons, testimonials, service area, CTA, footer, seller legal links, analytics script, and `js/main.js`. |
| `/privacy-policy/` | `apps/website/privacy-policy/index.html` | Seller legal page. Keep available after migration, either CMS-managed or seeded/static inside the new app. |
| `/terms/` | `apps/website/terms/index.html` | Seller legal page. Keep available after migration, either CMS-managed or seeded/static inside the new app. |
| `/get-your-offer/` | `apps/website/get-your-offer/index.html` | Current noindex step-2 form route exists, but the epic requires this route to be retired. New app should redirect it to `/` or another approved seller CTA page and should not keep it as a separate conversion surface. |
| Seller CSS/JS | `apps/website/css/styles.css`, `apps/website/js/main.js` | No build step; vanilla HTML/CSS/JS. New app should preserve the current design/performance bar while moving rendering into Next.js. |
| Seller static assets | `apps/website/assets/favicon.ico`, `hero-home.png`, `hero-home.svg`, `logo-goldcoast.png`, `og-image.jpg` | Use as migration references. Future media uploaded through Payload must not inherit public S3 object semantics by default. |

### Buyer/deals surface: `deals.gcoffers.com`

| Route / asset area | Current files | Current behavior / notes for migration |
| --- | --- | --- |
| `/` | `apps/deals/index.html` | Buyer landing page prototype with hero email capture, public hard-coded active deal cards, hard-coded sold/social-proof cards, filter UI, value props, buyer personas, CTA, footer disclaimer, and `js/deals.js`. |
| `/join/` | `apps/deals/join/index.html` | Buyer-list signup form with buy-box fields, explicit service SMS consent, optional marketing consent, and canonical links to seller legal pages. Epic supersedes current required-field behavior: V1 must be lightweight with email required and other fields optional/progressive. |
| `/faq/` | `apps/deals/faq/index.html` | Buyer FAQ page with accordion behavior via shared deals JS. |
| `/deals/[slug]/` | Not present in current static prototype | Required by the epic for public deal detail pages in the new app. Must render from Payload deal data and enforce visibility/exact-address/media predicates. |
| `/privacy-policy/`, `/terms/` | Not present under `apps/deals` | Current buyer pages link to canonical seller legal URLs. New app may implement canonical shared legal pages or host buyer-domain equivalents that resolve to the same policy/terms content. |
| Buyer CSS/JS | `apps/deals/css/styles.css`, `apps/deals/js/deals.js` | No build step; vanilla prototype. `deals.js` handles mobile menu, FAQ accordion, deal-card filters, hero email redirect/prefill, signup validation/submission, phone formatting, and smooth scroll. |
| Buyer static assets | `apps/deals/assets/logo-goldcoast-deals.svg` | Current deal cards use placeholder markup rather than private media. Payload media must become the source for real deal/page imagery. |

### Current S3-first form behavior

The current form architecture is API Gateway/Lambda backed and S3-first:

- Seller lead frontend (`apps/website/js/main.js`) posts JSON to the current API Gateway seller lead endpoint.
- Seller Lambda (`services/lead-handler/index.js`) validates required seller fields, normalizes submitted values, writes JSON to S3 first with server-side encryption, then attempts GoHighLevel sync as best effort. GHL failures do not block the request after S3 persistence.
- Buyer signup frontend (`apps/deals/js/deals.js`) posts to `window.DEALS_API_URL` or `/api/buyer-signup` and, as legacy prototype behavior, displays success even if the fetch fails. Do not copy that behavior into the new app; the new UI must show success only after the route handler confirms S3 persistence succeeded.
- Buyer signup Lambda (`services/lead-handler/buyer-signup.js`) exists and follows the same S3-first, GHL-best-effort pattern. It currently validates a heavier form than the epic now requires and currently derives the S3 key suffix from phone digits. Future implementation must use a generated ID or email hash so buyer signup works without phone.
- No current `deal-interest` Lambda handler was found in `services/lead-handler`; the new Next.js app must add deal-interest handling.
- Current `infra/website/main.tf` defines the seller `POST /api/submit-lead` API Gateway route and packages `services/lead-handler/index.js`. No Terraform route for `/api/buyer-signup` was observed in the current website infra during this slice.

Repo-relative source refs: `apps/deals/js/deals.js` for the legacy buyer success-on-fetch-failure behavior; `services/lead-handler/index.js` and `services/lead-handler/buyer-signup.js` for current S3-first/GHL-best-effort handlers.

S3-first semantics to preserve:

1. Persist form JSON to the approved source-of-truth S3 bucket/prefix first.
2. Only after S3 success, attempt GHL sync, Payload admin mirror writes, Slack alerts, or email alerts.
3. Treat external side effects as best effort unless a later explicit requirement says otherwise.
4. Do not place raw PII in logs, docs, Slack implementation reports, or evidence artifacts.
5. Return client success only after the server has confirmed source-of-truth S3 persistence; GHL/alert failures may be returned as non-blocking redacted warnings.

### Current infrastructure ownership

`infra/website` currently owns the legacy static website and form runtime design:

- Terraform provider defaults to AWS `us-east-1`.
- Static site S3 bucket for prod/staging website content.
- S3 lead bucket for source-of-truth form JSON in prod.
- CloudFront distribution with S3 origin and API Gateway origin; `/api/*` routes to API Gateway and is uncached.
- Route 53 website alias record and certificate validation records.
- ACM wildcard certificate for the domain.
- Staging WAF IP restriction.
- Secrets Manager secret resource for the GHL API key value, without exposing the secret value in this ADR.
- Lambda IAM role/policy, Lambda function packaging from `services/lead-handler`, HTTP API, stage, integration, and seller submit route.

Decision for following infra slices: do not destructively mutate `infra/website` for the new app. Add the Payload/Next runtime under a new `infra/payload-site` module/directory unless a later slice documents a narrower, safer extension. Any shared Route 53 hosted zone, ACM certificate, existing CloudFront distribution, S3 bucket, Lambda, API Gateway, or Secrets Manager resource must be referenced/imported via safe Terraform data sources or explicit cutover steps, not recreated blindly.

### Current package/workspace conventions

Root discovery found no root `package.json`, no root lockfile, no `pnpm-workspace.yaml`, no `turbo.json`, no root `tsconfig.json`, and no root ESLint/Prettier config. Current static apps have no Node build step.

The only package files observed are under `services/lead-handler`:

- `services/lead-handler/package.json`
- `services/lead-handler/package-lock.json`

Those files indicate npm/package-lock usage for the current Lambda service, but the package currently declares no dependencies even though the handlers import AWS SDK v3 packages. The next scaffold slice should choose and document one package-manager convention for the new app. Default decision for the new Next/Payload app: use npm with a committed lockfile unless a later repo-level workspace decision is explicitly documented.

## Architecture decisions

### DEC-001: One whole-site Next.js + Payload CMS stack

Decision: build one new whole-site app for both seller and buyer/deals surfaces using Next.js + Payload CMS.

The app will own after-cutover rendering for:

- `gcoffers.com` seller pages
- `deals.gcoffers.com` buyer/deals pages
- `/admin` Payload admin
- CMS-managed seller pages, buyer pages, FAQs, markets/areas, site settings, deals, media, buyer signups, and deal interest records

Consequences for following slices:

- Keep `apps/website` and `apps/deals` as legacy/reference surfaces until cutover.
- Scaffold the new app separately, expected as `apps/gcoffers-site` unless a later slice records a different path.
- Seed or CMS-model current legal pages and high-priority marketing content rather than leaving static-only orphan routes.
- Route host-based rendering must distinguish seller and buyer domains while sharing the same app/runtime.

### DEC-002: AWS runtime: ECS Fargate + RDS Postgres + private S3 media + CloudFront/Route 53

Decision: host the new whole-site app on AWS, not Vercel/Railway/Render.

Target architecture:

```text
Visitors
  -> Route 53
  -> CloudFront
  -> ALB
  -> ECS Fargate service running Next.js + Payload
       -> RDS Postgres for Payload content/auth
       -> private S3 bucket for Payload media
       -> existing or successor S3 lead bucket/prefix for form JSON source of truth
       -> Secrets Manager for app, DB, GHL, Slack, and email credentials
       -> CloudWatch logs, metrics, and alarms
```

Consequences for following slices:

- Payload database is Postgres on RDS.
- Payload media storage is S3 with bucket public access blocked.
- CloudFront remains the public edge in front of seller and buyer domains.
- Route 53 cutover records must be disabled by default in Terraform until explicit launch approval.
- Current static S3/API Gateway/Lambda path remains the rollback/fallback path until explicit cutover.

### DEC-003: Form runtime and S3-first semantics

Decision: implement new public form endpoints as Next.js route handlers in the new app after cutover, while preserving existing API Gateway/Lambda until explicit cutover.

Required route-handler behavior:

- Seller lead, buyer signup, and deal-interest POST routes must write to S3 first.
- Public clients must receive success only after the server confirms S3 persistence. Failed S3 writes must return a failure response and must not be masked as success.
- GHL sync is best effort and happens only after S3 success.
- Payload admin mirror writes happen only after S3 success.
- Deal-interest Slack/email alerts happen only after S3 success and must be redacted in Slack/log/evidence paths.
- Public form abuse controls must carry forward into implementation: enforce JSON/content-type/schema validation, add request size limits by capping request bodies before parsing (initial V1 cap: `32 KiB` unless a later slice justifies more), add rate limiting by IP and normalized email hash/form type without logging raw PII, reject honeypot/hidden-field spam submissions, and log only non-PII metadata/failure categories.
- Idempotency/dedup strategy: accept a client `idempotencyKey` when present; otherwise derive a dedup key from form type + normalized email hash + deal slug when applicable + a short time window. Store a non-PII dedup marker that points to the source S3 object, and skip repeated GHL/alert side effects for duplicate submissions while returning success only if the original S3 object exists.
- Existing API Gateway/Lambda handlers stay untouched for legacy production until cutover is explicitly approved.
- CloudFront/API routing changes for forms are a cutover step, not a PR default.

GHL contract details:

- Buyer signup must preserve the existing contact tagging semantics from `services/lead-handler/buyer-signup.js`: upsert/create a GHL contact when credentials are available, source it as the deals website, and apply tags `buyer-list` and `deals-website`. Optional buyer fields may be omitted or sent blank; no SMS-specific workflow should run when phone is absent.
- Deal interest must upsert/create the GHL contact when credentials are available, apply tag `interested-{dealSlug}`, and add a note in this format: `Expressed interest in {dealSlug} on {submittedAt}`. Do not include exact address in the note unless the address is explicitly public/approved.

S3 key decisions for the new app:

- Seller leads may keep the existing source-of-truth prefix pattern unless a later slice updates it safely.
- Buyer signup must not depend on phone. Use `buyer-signups/YYYY-MM-DD/buyer-{timestamp}-{emailHashOrGeneratedId}.json`.
- Deal interest must use `deal-interest/YYYY-MM-DD/{dealSlug}-{timestamp}-{emailHashOrGeneratedId}.json`.

### DEC-004: Media privacy model

Decision: Payload media is private by default. Public media delivery is app-mediated and allowed only after page/deal visibility checks.

Rules:

- The media S3 bucket must block all public access; no public S3 website hosting and no guessable public S3 object URLs.
- Public page media may be delivered only when the referencing page is public/published.
- Public deal media may be delivered only when the referencing deal passes the public deal visibility predicate for its context.
- Draft, hidden, preview, archived, cancelled, internal-only, and admin-only media must not be exposed by public routes, sitemaps, public APIs, or CloudFront direct object paths.
- Exact-address proof photos or private documents must not be uploaded into public-deliverable media unless a future admin-only media model exists.
- Cache keys must not allow a previously public media object to remain publicly available after its parent page/deal is hidden. Invalidation or short signed URL TTLs are required for visibility changes.

### DEC-005: Branch, PR, and deployment boundary

Decision: implementation work for this epic may be prepared on a feature branch and raised as a PR, but this ADR does not authorize merge or launch.

Allowed for future implementation slices under the parent epic:

- Create a feature branch.
- Make local changes.
- Commit and open a PR when the parent workflow authorizes it.
- Run local checks, safe Terraform fmt/validate, and safe plan only when cutover/live flags are disabled and credentials/state are safe.

Not allowed without explicit approval:

- Merge PRs.
- Push to `main`.
- Deploy the app.
- Run `terraform apply`.
- Change DNS or CloudFront aliases.
- Mutate production AWS resources.
- Send live GHL, Slack, email, or SMS alerts.

This slice itself is documentation-only and leaves changes uncommitted.

### DEC-006: Deal visibility predicates

Decision: model `websiteVisibility` separately from `dealStatus` and enforce the epic predicates exactly.

Required enums from the epic:

- `websiteVisibility`: `hidden | preview | public | archived`
- `dealStatus`: `draft | coming_soon | available | under_contract | sold | cancelled`

Exact required predicates:

- Public deal visibility for public detail eligibility: `websiteVisibility === "public" AND dealStatus IN ["coming_soon", "available", "under_contract", "sold"]`
- Public active-deal listing: `websiteVisibility === "public" AND dealStatus IN ["coming_soon", "available", "under_contract"]`
- Public sold/social-proof section: `websiteVisibility === "public" AND dealStatus === "sold"`
- Public exact address: `showExactAddressPublicly === true`

Mandatory exclusions:

- Draft, hidden, preview, archived, cancelled, and internal-only deals must not appear in public listing pages, public detail pages, sitemaps, or public API responses.
- Internal-only maps to `websiteVisibility = "hidden"` unless a later implementation adds a distinct enum.
- Exact address must remain hidden unless `showExactAddressPublicly === true`.
- Public media access must use the same deal/page visibility decisions and must not leak hidden or draft media.

### DEC-007: Low-cost V1 AWS sizing assumptions for PR infra design

These are assumptions for PR infrastructure design only. They are not a production launch approval and can be revised before deploy.

| Area | Low-cost V1 assumption |
| --- | --- |
| ECS Fargate | One ECS service for the Next.js + Payload container. Task size `0.5 vCPU / 1 GiB` to start; desired count `1`; autoscaling min `1`, max `2`, target CPU `60%`. Run a local production build plus Payload admin smoke before keeping this size; if build/runtime/admin smoke shows memory pressure, bump to `1 vCPU / 2 GiB` before PR. Use immutable image tags. Low-cost preview network default is no new NAT Gateway: place Fargate tasks in public subnets with `assign_public_ip = true`, keep the ALB internet-facing, allow task inbound only from the ALB security group, allow RDS inbound only from the task security group, and expose no direct task ingress. Do not place tasks in private subnets unless NAT Gateway or required VPC endpoints are also present for ECR, CloudWatch Logs, Secrets Manager, S3, and other required outbound services. Production may instead use private task subnets with NAT/endpoints; document that cost/security tradeoff explicitly before changing the topology. |
| RDS Postgres | Single-AZ Postgres 16, instance class `db.t4g.micro`, `20 GiB` gp3 storage, storage autoscaling max `100 GiB`, automated backups `7 days`, deletion protection on for prod design, no Performance Insights/enhanced monitoring in V1. Restore/PITR expectations must be in the runbook. |
| ALB | One internet-facing Application Load Balancer across at least two subnets, HTTPS listener with HTTP redirect, one target group for the ECS service, health check path `/api/health/readiness`, idle timeout `60s`. |
| CloudFront | Use CloudFront in front of ALB with `PriceClass_100`. Support both seller and buyer aliases after approved cutover. Forward `Host`. Do not cache `/admin`, auth/session routes, form POST routes, draft/preview routes, health routes with sensitive data, or public API responses that can include visibility-sensitive content. Cache static assets and public rendered pages conservatively; invalidate or use short TTLs for CMS visibility changes. |
| S3 media | One private Payload media bucket per environment. Block public access, enable versioning, use SSE-S3 by default, abort incomplete multipart uploads after `7 days`, expire noncurrent versions after `90 days` unless retention requirements change. No public S3 URLs. Existing form source-of-truth bucket/prefix remains preserved until explicit migration/cutover. |
| Secrets Manager | Use Secrets Manager references, not checked-in values. V1 assumes one DB credential secret plus app/integration secrets for Payload secret, GHL API, Slack alert destination, and internal email credentials/settings. ECS receives secret values by ARN at runtime. No secret values in Terraform variables, docs, logs, or evidence. |
| CloudWatch | App log group retention `30 days` for prod design and `14 days` for non-prod unless a later runbook changes it. Minimum V1 alarms: ECS running task/unhealthy target, ALB 5xx, ALB target response time, RDS CPU, RDS free storage, and form S3-persistence failures via metric filter. Logs must contain non-PII metadata only. No X-Ray in low-cost V1. |

### DEC-008: Terraform safety defaults

Decision: all new Terraform for the Payload site must default live mutation and cutover to disabled.

Required defaults for new infra variables:

- `enable_dns_cutover = false`
- `enable_prod_alias = false`
- `enable_live_alerts = false`

Allowed PR checks:

- `terraform fmt`
- `terraform validate`
- Safe `terraform plan` only when credentials/state are available and all cutover/live flags are disabled

Not allowed in autonomous PR work:

- `terraform apply`
- DNS cutover
- production CloudFront alias mutation
- production S3/API Gateway/Lambda destructive changes
- live alert delivery

### DEC-009: GitHub Actions-controlled low-cost staging lifecycle

Decision: keep the fixed staging infrastructure in place but manage staging ECS compute through GitHub Actions. PR and manual staging deploys scale the staging ECS service desired count to `1`; successful production deploys scale the staging ECS service desired count back to `0` after production ECS stability, CloudFront invalidation, and readiness smoke pass.

Consequences:

- Tej does not need to open AWS for routine PR deploys after the one-time GitHub OIDC/vars/secrets setup.
- Low-cost staging shutdown means ECS desired count `0` only; ALB, RDS, CloudFront, S3, logs, alarms, DNS/certificates, and Terraform state remain intact for the next staging deploy.
- The deploy workflow builds/pushes immutable ECR image tags and updates ECS task definitions; it does not run Terraform, apply DNS changes, destroy resources, or send live alerts.
- Staging and production ECS deploy mutations are serialized by the workflow concurrency group so production staging-shutdown cannot race an active staging deploy.
- Production and staging ECS service variables, and production and staging CloudFront distribution variables, must be distinct. The workflow fails fast if they are accidentally configured to the same target.
- Manual production deploys are accepted only from the `main` ref.
- Production deploys require the `production` GitHub environment and production ECS/CloudFront variables, with explicit approval/rules configured in GitHub before use.

## Actionable next-slice checklist

1. Scaffold `apps/gcoffers-site` as the new Next.js + Payload app using npm and a committed lockfile unless a later slice records a workspace change.
2. Preserve legacy `apps/website`, `apps/deals`, `services/lead-handler`, and `infra/website` as references/fallback until cutover.
3. Add Payload collections and access controls with tests for the exact visibility predicates in DEC-006.
4. Add Next route handlers for seller lead, buyer signup, and deal-interest with S3-first semantics, abuse controls, client-success-after-S3-confirmation, and GHL tag/note contracts from DEC-003.
5. Add private media delivery routes/tests proving hidden/draft media cannot be reached through public URLs.
6. Add `infra/payload-site` with the low-cost V1 assumptions in DEC-007 and safety defaults in DEC-008.
7. Add runbook/cutover/backout docs before any PR is considered launch-ready.
