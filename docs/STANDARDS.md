# Gold Coast Home Buyers — Development Standards

Updated: 2026-06-07

## Current production architecture

Gold Coast Home Buyers now serves `gcoffers.com` and `www.gcoffers.com` from the Next.js + Payload CMS app in `apps/gcoffers-site`.

```text
User browser
  -> Route 53
  -> CloudFront
  -> ALB
  -> ECS Fargate running Next.js + Payload
       -> RDS Postgres for Payload CMS
       -> private S3 media bucket
       -> S3-first form submission records
       -> Secrets Manager runtime secrets
       -> CloudWatch logs, metrics, alarms
```

The old static `site/` source and static deploy helpers have been removed from the active tree. Historical static AWS infrastructure under the root legacy `infra/` Terraform files remains only for rollback/decommission audit context until Tej explicitly approves retirement.

## Active surfaces

- Seller site: `https://gcoffers.com/` and `https://www.gcoffers.com/`.
- Buyer/deals surface: `https://gcoffers.com/deals/`.
- Payload admin: `/admin`.
- Health checks: `/api/health/readiness` and `/api/health/public-content`.

`deals.gcoffers.com` is not a live target for the current site.

## Environments

- Production: always-on ECS service behind production CloudFront aliases for apex and `www`.
- Staging: `https://staging.gcoffers.com`, ECS service wakes for PR/manual staging deploys and is scaled back to desired count `0` after successful production deploys.

Staging off means ECS app compute is off. It does not destroy staging ALB, RDS, CloudFront, S3, DNS, logs, alarms, or Terraform state.

## Branch and PR strategy

```text
feature/fix/chore branch
  -> PR into main
  -> PR Check validates app + Payload Terraform
  -> optional PR staging deploy when staging evidence is needed
  -> merge to main after review
  -> production deploy workflow runs from main
```

Do not merge, deploy, apply Terraform, change DNS, or enable live alerts without explicit approval when a task guardrail says so.

## App standards

- Use `apps/gcoffers-site` for current website changes.
- Use Next.js App Router patterns already present in the app.
- Payload schema/access changes must preserve public/private boundaries for drafts, hidden records, exact addresses, media, buyer signups, and deal interest.
- Public forms must remain S3-first: persist source-of-truth JSON before GHL, Payload mirror, Slack, email, or other side effects.
- Public success responses must only happen after S3 persistence succeeds.
- Do not log or commit raw PII, secrets, webhook URLs, exact private addresses, DB URLs, AWS account IDs, ARNs, CloudFront IDs, Route53 zone IDs, or credentials.
- TCPA/service consent controls must remain unchecked by default and explicit.

## Local verification

From `apps/gcoffers-site`:

```bash
npm ci
npm run verify:seller-site
npm run verify:buyer-deals-site
npm run verify:s3-first-form-pipeline
npm run typecheck
npm run build
```

Use local/mock mode for form tests unless Tej explicitly approves a non-production AWS smoke.

## Terraform standards

Active Payload infrastructure lives in `infra/payload-site`.

Safe validation only:

```bash
cd infra/payload-site
terraform fmt -check -recursive
terraform init -backend=false -input=false
terraform validate
rm -rf .terraform .terraform.lock.hcl
```

Do not run `terraform apply` without explicit approval. Do not commit `.terraform/`, `.terraform.lock.hcl`, `terraform.tfvars`, `*.tfstate`, or `*.tfstate.backup`.

Default safety flags should stay non-mutating unless an approved operation says otherwise:

```hcl
enable_dns_cutover = false
enable_prod_alias  = false
enable_live_alerts = false
```

## Deployment standards

Active workflows:

- `.github/workflows/pr-check.yml` validates the Payload app and Payload Terraform.
- `.github/workflows/gcoffers-payload-deploy.yml` deploys app images to ECS and invalidates CloudFront.

The deploy workflow intentionally does not run Terraform, change DNS, attach/move CloudFront aliases, create/destroy infrastructure, or enable live external alerts.

## Files that matter now

```text
apps/gcoffers-site/              # active Next.js + Payload app
infra/payload-site/              # active Payload AWS Terraform
docs/ops/payload-site-runbook.md # operational runbook
docs/deployment-pipeline.md      # GitHub deploy lifecycle
docs/archive/legacy-static-site-cleanup.md
```

Historical references and old docs may mention static site paths. Do not treat them as current implementation instructions unless they are explicitly updated for the Payload app.
