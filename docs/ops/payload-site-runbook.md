# gcoffers Payload site runbook

Status: PR/runbook evidence for the Payload CMS whole-site migration. This document is operational guidance only; it is not a production deployment approval.

## Scope and guardrails

The new app lives at `apps/gcoffers-site` and serves both `gcoffers.com` seller pages and main-domain buyer/deals pages after an explicitly approved cutover.

Guardrails that remain in force until the owner explicitly approves launch work:

- Do not deploy, merge, run `terraform apply`, mutate production AWS resources, change DNS, or attach production CloudFront aliases.
- Do not send live GoHighLevel, Slack, email, or SMS alerts from local/PR verification.
- Keep production cutover and live-alert flags disabled by default: `enable_dns_cutover=false`, `enable_prod_alias=false`, and `enable_live_alerts=false`.
- Keep seller lead, buyer signup, and deal-interest submissions S3-first: persist source-of-truth JSON before GHL, Payload mirror, Slack, or email side effects.
- Do not put secrets, raw PII, private keys, access keys, webhook URLs, exact private addresses, or production credentials in docs, logs, evidence, Terraform variables, or committed files.

## Local development

### Prerequisites

From `apps/gcoffers-site`:

- Node: version `22` (`.nvmrc` contains `22`; `package.json` requires `>=22.0.0 <23`).
- npm: version `10+` (`package.json` requires `>=10.0.0`).
- Docker Desktop or another Compose-compatible runtime for local Postgres.
- No global npm packages are required.

Recommended setup:

```bash
cd apps/gcoffers-site
nvm use
npm install
cp .env.example .env.local
```

Replace placeholders in `.env.local` before running against real local services. Keep `.env.local` out of git.

### Environment placeholders

`.env.example` intentionally contains placeholders only:

| Key | Purpose | Local guidance |
| --- | --- | --- |
| `DATABASE_URI` | Payload Postgres connection string | Use a local Postgres URI for `docker-compose.yml`, or leave placeholder only for scaffold build/typecheck commands that use safe local fallbacks. Production/start must use a real secret value. |
| `PAYLOAD_SECRET` | Payload auth/session secret | Use a local-only random value; production value must come from Secrets Manager. |
| `NEXT_PUBLIC_SITE_URL` | Public base URL | Use `http://127.0.0.1:3000` locally or a non-production preview URL. |
| `PAYLOAD_PUBLIC_SERVER_URL` | Payload server URL | Match the local or deployed app URL. |
| `AWS_REGION` | AWS region | Local mock verification can use a placeholder; production defaults are managed by Terraform. |
| `PAYLOAD_MEDIA_BUCKET` | Private Payload media bucket | Placeholder locally unless testing a non-production bucket. Public S3 URLs are not allowed for private/draft media. |
| `FORM_SUBMISSIONS_BUCKET` | Form JSON source-of-truth bucket | Placeholder locally; route handlers default to mocked S3 writes unless configured for AWS mode. |
| `GHL_API_KEY` | GoHighLevel best-effort sync | Placeholder only in local/PR verification. |
| `SLACK_WEBHOOK_URL` | Deal-interest Slack alert destination | Placeholder only; never commit a real webhook URL. |
| `INTERNAL_ALERT_EMAIL` | Approved internal email alert config | Placeholder only; do not put raw email addresses in docs/evidence. |

The form pipeline also supports `FORM_PIPELINE_S3_WRITER=mock` (default) or `FORM_PIPELINE_S3_WRITER=aws` for approved non-production AWS smoke tests. Do not enable AWS mode unless the bucket, credentials, and approval scope are safe.

### Local Postgres

`docker-compose.yml` provides Postgres 16 for local development.

```bash
cd apps/gcoffers-site
docker compose up -d postgres
```

Use matching local-only values in `.env.local`, for example with placeholders rather than committed secrets:

```bash
DATABASE_URI=[LOCAL_POSTGRES_CONNECTION_STRING]
PAYLOAD_SECRET=[REDACTED_LOCAL_PAYLOAD_SECRET]
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
PAYLOAD_PUBLIC_SERVER_URL=http://127.0.0.1:3000
```

Production/start/runtime fail fast if `DATABASE_URI` or `PAYLOAD_SECRET` are missing or still placeholder values. Scaffold commands, typecheck, codegen, and local build have explicit safe fallbacks so contributors can verify the code before wiring local secrets.

### Run the app locally

```bash
cd apps/gcoffers-site
npm run payload:importmap
npm run dev
```

Open or curl:

- Seller surface: `http://127.0.0.1:3000/`
- Payload admin: `http://127.0.0.1:3000/admin`
- GraphQL playground: `http://127.0.0.1:3000/api/graphql-playground` in development only
- Readiness health: `http://127.0.0.1:3000/api/health/readiness`
- Public content health: `http://127.0.0.1:3000/api/health/public-content`

Buyer/deals rendering is served from main-domain paths. For local smoke testing, hit the buyer paths directly:

```bash
curl -fsS http://127.0.0.1:3000/deals/
curl -fsS http://127.0.0.1:3000/join/
curl -fsS http://127.0.0.1:3000/faq/
```

### Verification scripts

From `apps/gcoffers-site`:

```bash
npm run verify:scaffold
npm run verify:schema-access
npm run verify:seller-site
npm run verify:buyer-deals-site
npm run verify:s3-first-form-pipeline
npm run typecheck
npm run build
```

Expected outcomes:

- `verify:scaffold` passes when the Next/Payload scaffold, Dockerfile, local Postgres compose file, required scripts, `.env.example`, and health routes are present.
- `verify:schema-access` passes when Payload collections and public helper predicates protect draft/hidden/private content, exact addresses, public media, buyer signups, and deal interest.
- `verify:seller-site` passes when seller pages, legal pages, `/get-your-offer` redirect, brand assets, and seller lead form contract are present without legacy live API endpoints.
- `verify:buyer-deals-site` passes when buyer home, `/join`, `/faq`, `/deals/[slug]`, host-aware routing, exact deal predicates, buyer forms, and safety scans pass.
- `verify:s3-first-form-pipeline` passes when seller, buyer, and deal-interest routes write S3 first, skip side effects on S3 failure, mock GHL/Payload/Slack/email side effects, enforce honeypot/rate/idempotency controls, and avoid raw PII in verification output.
- `typecheck` runs `tsc --noEmit`.
- `build` runs Payload import-map generation and `next build`; expected output includes seller/buyer pages, Payload API/admin routes, health routes, and public form API routes.

## AWS deployment design summary

The Terraform stack is in `infra/payload-site` and is intentionally separate from `infra/website`, which owns the legacy static website/API/DNS resources until approved cutover.

Target architecture:

```text
Visitors
  -> Route 53
  -> CloudFront
  -> ALB
  -> ECS Fargate service running Next.js + Payload
       -> RDS Postgres for Payload CMS data/auth
       -> private S3 bucket for Payload media
       -> existing or successor S3 bucket/prefixes for form JSON source of truth
       -> Secrets Manager for app, DB, GHL, Slack, and email configuration
       -> CloudWatch logs, metrics, metric filters, and alarms
```

Key design points:

- **ECS Fargate:** one Next.js + Payload container behind an ALB. ECR repository uses immutable image tags and scan-on-push. Default `ecs_desired_count=0` keeps PR/default planning safe until a real image and secrets exist.
- **RDS Postgres:** Payload primary database. Defaults to low-cost Postgres 16, encrypted gp3 storage, managed master password in Secrets Manager, automated backups, and production-safe deletion/final snapshot defaults when `environment=prod`.
- **S3 media:** private-by-default Payload media bucket with public access block, bucket owner enforced ownership, SSE-S3, versioning, and lifecycle rules. Public media delivery must be app-mediated or signed and must validate parent page/deal visibility.
- **S3 forms:** form JSON remains source-of-truth. The stack references existing `goldcoast-leads` by default and grants only approved prefixes: `seller-leads/`, `buyer-signups/`, and `deal-interest/`. Creating a successor bucket is an explicit migration decision.
- **Secrets Manager:** ECS receives secret values by ARN only. Do not put secret values in Terraform variables, docs, logs, or evidence. Live alert secrets are injected only when `enable_live_alerts=true`.
- **CloudFront/ALB/Route 53:** CloudFront fronts the ALB, forwards `Host`, caches public pages briefly, caches immutable assets longer, and disables caching for `/admin*`, `/api/*`, `/payload*`, `/preview*`, `/draft*`, `/_next/data/*`, and `/media/private/*`. Buyer/deals pages currently live on main-domain paths. Route 53 A/AAAA records are created only when `enable_dns_cutover=true`; no hosted zone is created by this stack.
- **CloudWatch:** ECS app logs, non-PII log metric filter for form S3 persistence failures, and alarms for form persistence failure, ALB/app 5xx, unhealthy targets, high latency, ECS CPU/memory, and RDS CPU/free storage. Alarm actions are disabled unless `enable_live_alerts=true`.

## Terraform verification and safe plan caveat

From `infra/payload-site`:

```bash
terraform fmt -check -recursive
terraform init -backend=false -input=false
terraform validate
rm -rf .terraform .terraform.lock.hcl
```

Expected outcome: formatting passes, backend-disabled initialization succeeds, and validation reports the configuration is valid.

Do not run `terraform plan` unless all of the following are true:

1. The owner has approved a safe plan-only read against the intended AWS account/state.
2. Credentials and backend/state are known to be correct.
3. `enable_dns_cutover=false`, `enable_prod_alias=false`, and `enable_live_alerts=false` remain set for the plan.
4. No production DNS, CloudFront aliases, S3/API Gateway/Lambda, Secrets Manager, or other live resources are mutated.

Do not run `terraform apply` before explicit deployment approval.

## GitHub Actions CI/CD lifecycle

The Payload site deploy lifecycle is handled by `.github/workflows/gcoffers-payload-deploy.yml`. The workflow does not run Terraform and does not require Tej to open AWS for each PR deploy after the one-time GitHub setup is complete.

### One-time GitHub setup

Configure these GitHub repository variables and secret before enabling the deploy workflow. Keep non-secret deploy target values at repository scope so both staging and production jobs can compare staging/prod targets and so production can scale staging off. The staging cluster, service, or URL variables must clearly contain `staging`; the production post-deploy scale-down target also requires `staging` in the staging cluster or service name. If environment-scoped variables are used later, duplicate the cross-environment target values intentionally. Store values only in GitHub secrets/variables; do not commit real account IDs, ARNs, registry URLs, hostnames, secret values, DB endpoints, credentials, webhook URLs, or raw PII.

Secret:

- `AWS_DEPLOY_ROLE_ARN` — OIDC-assumable deploy role ARN with the least privilege required for ECR push, ECS task/service update, ECS wait/read, CloudFront invalidation, and the staging scale-down action.

Variables:

- `AWS_REGION`
- `GCOFFERS_PAYLOAD_ECR_REPOSITORY` — ECR repository name only, not a registry URL.
- `GCOFFERS_PAYLOAD_STAGING_CLUSTER`
- `GCOFFERS_PAYLOAD_STAGING_SERVICE`
- `GCOFFERS_PAYLOAD_STAGING_CLOUDFRONT_DISTRIBUTION_ID`
- `GCOFFERS_PAYLOAD_STAGING_URL`
- `GCOFFERS_PAYLOAD_PRODUCTION_CLUSTER`
- `GCOFFERS_PAYLOAD_PRODUCTION_SERVICE`
- `GCOFFERS_PAYLOAD_PRODUCTION_CLOUDFRONT_DISTRIBUTION_ID`
- `GCOFFERS_PAYLOAD_PRODUCTION_URL`

Use GitHub environments named `staging` and `production`. Production deploys MUST require explicit GitHub environment approval/rules before this workflow is enabled for production. Production deploys will not work until the production ECS and CloudFront variables above are present.

### Trigger behavior

- Pull requests targeting `main` or `feat/data-lake-monorepo-slice-1` and changing the Payload app, Payload infra, or this workflow deploy to the GitHub `staging` environment.
- `workflow_dispatch` supports `target=staging` from the selected ref or `target=production` only from `main`.
- Pushes to `main` deploy to the GitHub `production` environment.

PR staging deploys run the PR branch container in AWS staging. Keep staging secrets and data non-production, and restrict this workflow to trusted repository contributors/branches if that assumption changes.

### What the workflow does

For both staging and production deploys, the workflow serializes ECS deploy mutations through one concurrency group, then:

1. Assumes `AWS_DEPLOY_ROLE_ARN` via GitHub OIDC.
2. Builds `apps/gcoffers-site/Dockerfile`.
3. Pushes one immutable ECR tag derived from the deploy target, commit SHA, run ID, and run attempt.
4. Reads the current ECS service task definition, changes only container `app` to the new image, registers a new task definition revision, updates the service to desired count `1`, and waits for ECS service stability.
5. Creates and waits for a CloudFront invalidation.
6. Smoke checks `${GCOFFERS_PAYLOAD_<ENV>_URL}/api/health/readiness` and expects JSON with `ok: true`.

After a successful production deploy and production readiness smoke, the workflow scales staging ECS compute off:

```bash
aws ecs update-service \
  --cluster "$GCOFFERS_PAYLOAD_STAGING_CLUSTER" \
  --service "$GCOFFERS_PAYLOAD_STAGING_SERVICE" \
  --desired-count 0
aws ecs wait services-stable \
  --cluster "$GCOFFERS_PAYLOAD_STAGING_CLUSTER" \
  --services "$GCOFFERS_PAYLOAD_STAGING_SERVICE"
```

This staging shutdown only sets ECS service desired count to `0`. Shared fixed infrastructure remains in place: ALB, target group, RDS, private media/form S3 buckets, CloudFront, DNS/certificates, logs, alarms, and Terraform state are not destroyed by the deploy workflow.

### Operator commands and expected status

Manual dispatch examples:

```bash
gh workflow run gcoffers-payload-deploy.yml -f target=staging
gh workflow run gcoffers-payload-deploy.yml --ref main -f target=production
gh run list --workflow gcoffers-payload-deploy.yml --limit 5
gh run watch <run-id>
```

Staging should be on after a successful PR or manual staging deploy:

```bash
aws ecs describe-services \
  --cluster "$GCOFFERS_PAYLOAD_STAGING_CLUSTER" \
  --services "$GCOFFERS_PAYLOAD_STAGING_SERVICE" \
  --query 'services[0].{status:status,desired:desiredCount,running:runningCount,pending:pendingCount,rollout:deployments[0].rolloutState}' \
  --output table
curl -fsS "${GCOFFERS_PAYLOAD_STAGING_URL%/}/api/health/readiness"
```

Expected staging result: ECS `status` is `ACTIVE`, `desired` is `1`, `running` is `1`, `pending` is `0`, rollout is `COMPLETED`, and readiness returns non-secret JSON with `ok: true`.

Production should be on and staging should be off after a successful production deploy:

```bash
aws ecs describe-services \
  --cluster "$GCOFFERS_PAYLOAD_PRODUCTION_CLUSTER" \
  --services "$GCOFFERS_PAYLOAD_PRODUCTION_SERVICE" \
  --query 'services[0].{status:status,desired:desiredCount,running:runningCount,pending:pendingCount,rollout:deployments[0].rolloutState}' \
  --output table
aws ecs describe-services \
  --cluster "$GCOFFERS_PAYLOAD_STAGING_CLUSTER" \
  --services "$GCOFFERS_PAYLOAD_STAGING_SERVICE" \
  --query 'services[0].{status:status,desired:desiredCount,running:runningCount,pending:pendingCount}' \
  --output table
curl -fsS "${GCOFFERS_PAYLOAD_PRODUCTION_URL%/}/api/health/readiness"
```

Expected production result: production ECS `status` is `ACTIVE`, `desired` is `1`, `running` is `1`, `pending` is `0`, rollout is `COMPLETED`, production readiness returns `ok: true`, and staging ECS `desired`/`running` are both `0`.

CloudFront invalidation status, if checking an invalidation ID captured from a workflow run or a manual invalidation, should be `Completed`:

```bash
aws cloudfront get-invalidation \
  --distribution-id "$GCOFFERS_PAYLOAD_STAGING_CLOUDFRONT_DISTRIBUTION_ID" \
  --id "$INVALIDATION_ID" \
  --query 'Invalidation.Status' \
  --output text
```

Do not use the workflow as a substitute for production cutover approval, DNS approval, live-alert approval, or Terraform apply approval. It only publishes a new app image to an already-created ECS/CloudFront environment and manages the low-cost staging desired-count lifecycle.

## Migration and cutover plan

### Phase 0 — PR review and approval gate

- Review app, schema/access, forms, Terraform, this runbook, and PR evidence.
- Confirm no secrets/raw PII are present in committed files or evidence.
- Confirm local verification and backend-disabled Terraform validation pass.
- Confirm production cutover/live flags remain disabled by default.
- Owner explicitly approves or rejects any next phase. No deployment occurs from PR approval alone.

### Phase 1 — Pre-production preparation after approval

- Build an immutable app image from `apps/gcoffers-site/Dockerfile`.
- Push the image to the Terraform-managed ECR repository or approved non-production ECR repository.
- Create/populate required Secrets Manager values by ARN only:
  - `DATABASE_URI` or equivalent app-supported DB connection secret.
  - `PAYLOAD_SECRET`.
  - Optional approved GHL secret for non-production/live sync smoke.
  - Optional Slack/email alert secrets only when alert destinations are approved.
- Apply Terraform only in an approved staging/non-production context first.
- Set ECS desired/min count to at least `1` only after a real image and required secrets exist.
- Create first Payload admin user and editor user using approved operational procedure; never store passwords in repo.

### Phase 2 — Staging and pre-cutover smoke

- Smoke through a non-production alias, CloudFront default domain, or ALB with a controlled `Host` header.
- Verify `/`, `/privacy-policy`, `/terms`, and `/get-your-offer` seller behavior.
- Verify buyer host behavior for `/`, `/join`, `/faq`, and public `/deals/[slug]` pages.
- Verify `/admin` authentication and role behavior.
- Verify `/api/health/readiness` and `/api/health/public-content` without exposing secrets.
- Verify form routes in mock or approved non-production AWS mode. Confirm source-of-truth S3 persistence before GHL/Payload/alert side effects.
- Verify hidden/draft/preview/archived/cancelled/internal-only deals and private media do not appear publicly.
- Verify CloudFront no-cache behavior for admin/API/draft/private-media paths.

### Phase 3 — Explicit production cutover approval gate

Stop here until the owner approves production cutover. The approval should explicitly name:

- Target environment/account/state.
- Immutable image tag.
- Secret ARN readiness.
- DNS/CloudFront alias changes to make.
- Whether live GHL/Slack/email alerts are enabled.
- Rollback owner and communication plan.

Only after that approval may operators set production cutover variables such as:

```hcl
enable_prod_alias  = true
enable_dns_cutover = true
enable_live_alerts = true # only if live destinations are separately approved
```

`enable_live_alerts` may remain `false` for an initial production traffic cutover if the owner wants form persistence live before live alert delivery.

### Phase 4 — Cutover execution

- Confirm legacy `infra/website` static site/API remains intact for rollback.
- Confirm RDS backup retention, final snapshot policy, and media bucket versioning are production-safe.
- Confirm ECS service has healthy tasks behind ALB.
- Attach production CloudFront aliases only after ACM certificate readiness is verified.
- Create/update Route 53 alias records only through approved cutover Terraform variables.
- Monitor CloudWatch alarms, ALB target health, app logs, RDS metrics, form persistence metrics, and user-reported behavior.
- Keep a short observation window before considering old paths decommissioned.

## Rollback and backout plan

### Before production cutover

- No public DNS or production CloudFront alias changes should exist.
- Leave legacy `apps/website`, `apps/deals`, existing static S3/CloudFront, and API Gateway/Lambda intact.
- If staging fails, reduce the new ECS service desired count to `0` or destroy only approved non-production resources.
- Keep RDS snapshots and S3 media/form evidence until the owner approves cleanup.

### After production cutover

If the new app causes customer-impacting issues:

1. Repoint Route 53 aliases and/or CloudFront aliases back to the existing static distribution/API Gateway path owned by `infra/website`.
2. Invalidate CloudFront caches as needed for seller and buyer paths.
3. Reduce the new ECS service desired count to `0` or remove the target group from traffic after traffic is safely off the new app.
4. Preserve RDS snapshots, app logs, form submission S3 objects, and private media buckets for investigation.
5. Keep Secrets Manager values intact until incident review is complete.
6. Verify seller lead, buyer signup, and any legacy buyer routes have returned to the known fallback behavior.
7. Document what changed, when rollback completed, and what data (if any) needs reconciliation from the new S3 form prefixes or Payload records.

Do not delete RDS databases, S3 media buckets, or form submission objects as part of an emergency rollback. Cleanup is a separate approved operation.

## Smoke tests

### Static/local verification commands

From `apps/gcoffers-site`:

```bash
npm run verify:scaffold
npm run verify:schema-access
npm run verify:seller-site
npm run verify:buyer-deals-site
npm run verify:s3-first-form-pipeline
npm run typecheck
npm run build
```

Expected outcomes are the pass statements described in the local verification section. `npm run build` should show these route classes at minimum:

- Seller/shared pages: `/`, `/privacy-policy`, `/terms`, `/get-your-offer`.
- Buyer pages: `/join`, `/faq`, `/deals/[slug]` with generated public fixture slugs.
- Payload/admin/API routes: `/admin/[[...segments]]`, `/api/[...slug]`, `/api/graphql`, `/api/graphql-playground`.
- Form routes: `/api/seller-leads`, `/api/buyer-signups`, `/api/deal-interest`.
- Health routes: `/api/health/readiness`, `/api/health/public-content`.

### Local runtime smoke commands

With `npm run dev` running:

```bash
curl -fsS http://127.0.0.1:3000/api/health/readiness
curl -fsS http://127.0.0.1:3000/api/health/public-content
curl -fsS http://127.0.0.1:3000/
curl -fsS http://127.0.0.1:3000/privacy-policy/
curl -fsS http://127.0.0.1:3000/terms/
curl -fsSI http://127.0.0.1:3000/get-your-offer/
curl -fsS http://127.0.0.1:3000/deals/
curl -fsS http://127.0.0.1:3000/join/
curl -fsS http://127.0.0.1:3000/faq/
```

Expected outcomes:

- Health endpoints return JSON with `ok: true` and no secrets.
- Seller home, privacy, and terms return HTML.
- `/get-your-offer` redirects to the seller lead CTA and stays noindex.
- Main-domain buyer paths render the buyer listing, join, FAQ, and public deal routes.

### Local form route smoke

Keep local form smoke in mock mode unless the owner approves a non-production AWS S3 test.

```bash
export FORM_PIPELINE_S3_WRITER=mock
export SAFE_EMAIL='[REDACTED_EMAIL]'
export SAFE_PHONE='[REDACTED_PHONE_OPTIONAL]'

curl -fsS -X POST http://127.0.0.1:3000/api/buyer-signups \
  -H 'Content-Type: application/json' \
  -d '{"email":"'"$SAFE_EMAIL"'","source":"deals-website","serviceConsent":false,"marketingConsent":false}'

curl -fsS -X POST http://127.0.0.1:3000/api/deal-interest \
  -H 'Content-Type: application/json' \
  -d '{"dealSlug":"sample-deal","email":"'"$SAFE_EMAIL"'","source":"deals-website","serviceConsent":false}'
```

Before running these commands, replace `[REDACTED_EMAIL]` with a valid non-production test address in the local shell only. Do not commit it to docs/evidence. Expected response after valid local test data: `success: true`, `accepted: true`, a user-facing `message`, `requestId`, and no raw persistence internals or contact details in logs/evidence.

### Terraform smoke

From `infra/payload-site`:

```bash
terraform fmt -check -recursive
terraform init -backend=false -input=false
terraform validate
rm -rf .terraform .terraform.lock.hcl
```

Expected outcome: validation succeeds and no plan/apply is run.

## Operations

### Health endpoints

- `/api/health/readiness` is the ALB/ECS health check path and should remain no-cache. It verifies the app can initialize Payload and query public pages without leaking credentials.
- `/api/health/public-content` verifies the public content query path and required seller content availability. It returns `503` when required public content is missing or queries fail.

### Logs, metrics, and alarms

Use CloudWatch for:

- ECS app logs under `/aws/ecs/<stack-name>` with non-PII operational metadata only.
- Form persistence failures via `form_submission_s3_persist_failed` metric filter.
- ALB 5xx, target 5xx, unhealthy targets, and p95 latency.
- ECS CPU/memory utilization.
- RDS CPU and free storage.
- Optional custom app metrics such as `FormSubmissionReceived`, `FormSubmissionPersistedToS3`, `FormSubmissionGhlSyncFailed`, `DealInterestAlertFailed`, `PayloadPublicAccessDenied`, and `PayloadDraftLeakageTestFailure`.

Alarm actions remain disabled unless `enable_live_alerts=true` and approved alert destinations are supplied.

### Admin user creation

- Create the first Payload admin only after the approved environment has a real `DATABASE_URI`, `PAYLOAD_SECRET`, and reachable app runtime.
- Use the Payload admin UI or an approved one-time operational seed/migration. Do not commit credentials or seed raw passwords.
- Set Tej-equivalent owner account role to `admin` and Juhi-equivalent editor account role to `editor` using placeholder identities in docs/evidence only.
- Verify admin can manage users/settings and editor can manage content/deals without managing secrets or admin-only fields.
- Store generated/reset credentials only in the approved password manager or secret-sharing process, never in repo or Slack/evidence.

### Secrets checklist

Required before any production ECS task should run:

- `DATABASE_URI` secret ARN or approved app support for deriving the DB URL from RDS host/user/managed secret metadata.
- `PAYLOAD_SECRET` secret ARN.
- Immutable `app_image` tag.
- Optional GHL API secret ARN for best-effort CRM sync.
- Optional Slack webhook and internal email config secret ARNs, injected only when live alerts are approved.
- KMS decrypt permissions if custom-encrypted secrets are used.
- No secret values in Terraform variable files, docs, logs, or PR evidence.

### Database backup, restore, and PITR

- Production should keep RDS automated backups at least `7` days unless the owner approves a different retention policy.
- Production should enable deletion protection and require a final snapshot on delete.
- Test restore/PITR before cutover if production content will be managed in Payload before launch.
- Restore drill outline:
  1. Choose an RDS restore time or snapshot.
  2. Restore to a new DB instance in the same VPC/subnet controls.
  3. Point a non-production ECS task or one-off smoke environment at the restored DB secret.
  4. Verify `/admin`, public pages, deal visibility, and form mirror records.
  5. Do not overwrite the production DB until a separate incident recovery decision is approved.

### S3 media privacy and versioning

- Media bucket must keep public access blocked, SSE enabled, bucket owner enforced ownership, and versioning enabled.
- Public pages must use app-mediated/signed media URLs that validate parent page/deal visibility.
- Hidden/draft/preview/archived/cancelled/internal-only media must not be delivered through guessable public S3 URLs.
- Use lifecycle rules for incomplete multipart uploads and noncurrent versions; do not disable versioning during production incident response.
- Form submission objects are source-of-truth records; preserve them through rollback and reconciliation.

### ECS image rollback

- Use immutable ECR tags for app images.
- Record the previous task definition revision and image tag before deployment.
- To roll back app code after cutover, update the ECS service to the prior task definition/image tag, or redeploy the prior image through the approved pipeline.
- Monitor ALB target health and app logs during rollback.
- If rollback is not immediately healthy, route traffic back to the legacy static/API stack per the post-cutover rollback plan.

### Non-production cleanup

- Cleanup non-production ECS/RDS resources only after evidence and logs are no longer needed.
- Prefer scaling ECS desired count to `0` before deleting stateful resources.
- Preserve snapshots/media/form data until the owner approves deletion.
