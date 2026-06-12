# gcoffers Payload CMS AWS infrastructure

Terraform for the whole-site `gcoffers.com` Next.js + Payload runtime on AWS, including seller pages and main-domain buyer/deals routes.

This directory is intentionally separate from `infra/website`, which owns the current static website/API/DNS resources. This stack **does not create a Route 53 hosted zone** and defaults all production cutover and live-alert controls to off.

## What this stack defines

- ECS Fargate cluster, task definition, service, IAM roles, and autoscaling target for the Next.js + Payload container.
- ECR repository for immutable app images.
- Internet-facing ALB and target group with health checks at `/api/health/readiness`.
- RDS Postgres for Payload CMS data/auth with RDS-managed master password in Secrets Manager.
- Private S3 Payload media bucket with public access blocked, SSE, versioning, and lifecycle controls.
- Referenced form-submission source-of-truth bucket/prefixes, defaulting to existing `goldcoast-leads` without recreating it.
- Secrets Manager ARN injection points for `DATABASE_URI`, `PAYLOAD_SECRET`, `GHL_API_KEY`, Slack webhook, and internal alert config.
- CloudWatch log group, metric filter, and alarms for form persistence failures, ALB 5xx/latency/unhealthy targets, ECS CPU/memory, and RDS CPU/storage.
- CloudFront distribution in front of the ALB with safe default aliases/DNS disabled.
- Optional Route 53 A/AAAA cutover records, gated behind `enable_dns_cutover=true`.

## Safety defaults

These defaults are part of the acceptance criteria and should not be changed casually:

```hcl
enable_dns_cutover = false
enable_prod_alias  = false
enable_live_alerts = false
```

Default `ecs_desired_count = 0` also keeps first validation/planning safe until a real immutable image and required Secrets Manager values are available. Production should set desired/min count to at least `1` after deploy approval.

Do **not** run `terraform apply` from autonomous PR work. Do **not** change DNS, attach production aliases, send live Slack/email alerts, or mutate production AWS resources without explicit approval.

## Validation commands

From this directory:

```bash
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
```

A plan is optional and should only be run with safe credentials/state and cutover/live flags disabled, for example:

```bash
terraform plan \
  -var='enable_dns_cutover=false' \
  -var='enable_prod_alias=false' \
  -var='enable_live_alerts=false'
```

## CloudFront caching and route protection

CloudFront forwards `Host` and includes it in the public-page cache key. Production buyer/deals pages currently live on main-domain paths rather than a buyer subdomain.

No-cache behavior is configured for paths that must not be cached or must forward auth/session/form details:

- `/admin*`
- `/api/*` (covers auth/session endpoints, public form POST routes, health routes, and Payload/Next API routes)
- `/payload*`
- `/preview*`
- `/draft*`
- `/_next/data/*`
- `/media/private/*`

Immutable static assets under `/_next/static/*`, `/assets/*`, and `/favicon.ico` receive a long cache policy. Public pages use a short cache (`default_ttl = 60`, `max_ttl = 300`) and vary by `Host`.

## Media privacy model

The Payload media bucket is private by default:

- S3 public access block is fully enabled.
- Bucket owner enforced object ownership is enabled.
- Objects use SSE-S3 and bucket versioning.
- Public media delivery must be app-mediated or signed and must validate the parent page/deal visibility before serving content.
- Do not expose public S3 object URLs for draft, hidden, preview, archived, cancelled, internal-only, or exact-address-sensitive media.

## Form submission source of truth

By default, this stack references the existing legacy source-of-truth bucket:

```hcl
create_form_submissions_bucket = false
form_submissions_bucket_name   = "goldcoast-leads"
form_submissions_prefixes      = ["seller-leads/", "buyer-signups/", "deal-interest/"]
```

Set `create_form_submissions_bucket=true` only if an approved migration creates a successor bucket. Do not duplicate or take ownership of `infra/website` buckets unintentionally.

## Secrets

Never put secret values in Terraform variables, docs, logs, or evidence. Provide ARNs only:

```hcl
database_uri_secret_arn = "arn:aws:secretsmanager:...:secret:..."
payload_secret_arn      = "arn:aws:secretsmanager:...:secret:..."
ghl_api_key_secret_arn  = "arn:aws:secretsmanager:...:secret:..."
```

Slack/email alert secret ARNs are injected only when `enable_live_alerts=true`; the default is disabled. The app should log only non-PII metadata and emit custom metrics such as `FormSubmissionPersistedToS3`, `FormSubmissionGhlSyncFailed`, and `DealInterestAlertFailed` without raw contact details.

RDS uses `manage_master_user_password = true`; the generated master secret ARN is output as sensitive metadata. The current app contract still supports `DATABASE_URI`, so an operator should create/populate a separate `DATABASE_URI` secret before running tasks, or the app should be updated to derive its URL from the RDS host/user/secret variables.

## RDS defaults

- Low-cost V1 class: `db.t4g.micro`, Single-AZ, 20 GiB gp3, autoscale to 100 GiB.
- Non-prod defaults: 1 day backups, deletion protection off, final snapshot skipped.
- Prod defaults: 7 day backups, deletion protection on, final snapshot required.
- Production launch should confirm restore/PITR expectations and whether Multi-AZ is required before cutover.

## DNS and alias cutover

This stack uses data-source/reference patterns only:

- It never creates `gcoffers.com` hosted zone ownership.
- Production aliases are not attached unless `enable_prod_alias=true` and `cloudfront_acm_certificate_arn` is supplied.
- Route 53 A/AAAA records are not created unless `enable_dns_cutover=true`.
- Use either `route53_zone_id` for the existing zone or let the data source look up `route53_zone_name` only during approved cutover planning.

Cutover variables should stay disabled for PR validation and any pre-approval plans.
