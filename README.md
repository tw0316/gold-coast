# Gold Coast Home Buyers — gcoffers.com

Gold Coast Home Buyers production monorepo. The active public website for `gcoffers.com` and `www.gcoffers.com` is the Next.js + Payload CMS app in `apps/gcoffers-site`.

## Current stack

- **App:** Next.js + Payload CMS in `apps/gcoffers-site`
- **Runtime:** AWS ECS Fargate behind ALB + CloudFront
- **CMS database:** AWS RDS PostgreSQL
- **Media:** S3
- **Lead capture:** S3-first form pipeline, then CRM sync path
- **DNS:** Route 53 aliases to the Payload CloudFront distribution
- **IaC:** Terraform in `infra/payload-site`

## Environments

| Environment | Domain | Runtime policy |
|-------------|--------|----------------|
| Production | `gcoffers.com`, `www.gcoffers.com` | Always-on ECS service, deployed from `main` |
| Staging | `staging.gcoffers.com` | ECS service wakes for PR/manual staging deploys, then production deploys scale it back to zero |

## Deployment

Deployments run through GitHub Actions.

- **PR check:** `.github/workflows/pr-check.yml` validates pull requests.
- **Payload deploy:** `.github/workflows/gcoffers-payload-deploy.yml` builds and deploys `apps/gcoffers-site`.
  - Pull requests and manual staging dispatches deploy staging.
  - Pushes to `main` and manual production dispatches from `main` deploy production.
  - Production deploys update ECS to desired count `1`, invalidate CloudFront, check readiness, then scale staging ECS desired count to `0`.

The deploy workflow does **not** apply Terraform, change DNS, or enable live alerts. Those are explicit operational actions and require separate approval.

## Development

```bash
cd apps/gcoffers-site
npm ci
npm run typecheck
npm run build
```

Useful focused checks:

```bash
npm run verify:seller-site
npm run verify:buyer-deals-site
npm run verify:s3-first-form-pipeline
```

## Infrastructure

Active Payload infrastructure is modeled in `infra/payload-site`.

```bash
cd infra/payload-site
terraform fmt -check
terraform validate
```

Do not commit local Terraform state, `.terraform/`, `terraform.tfvars`, secrets, or local evidence files.

## Legacy static site

The old static `site/` source and static-site local deploy helpers were removed after the Payload cutover. The historical AWS static infrastructure under the root legacy `infra/` Terraform files is intentionally left in the repo until rollback/decommission resources are audited. See `docs/archive/legacy-static-site-cleanup.md`.

## Operations docs

- Payload runbook: `docs/ops/payload-site-runbook.md`
- Payload ADR: `docs/architecture/gcoffers-payload-cms-adr.md`
- Legacy static cleanup note: `docs/archive/legacy-static-site-cleanup.md`
