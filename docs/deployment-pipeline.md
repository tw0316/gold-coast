# Deployment Pipeline

Gold Coast Home Buyers now deploys the Payload/Next site from `apps/gcoffers-site` through GitHub Actions.

The legacy static `site/` deploy path has been removed from the active tree. Historical static infrastructure remains in the root legacy `infra/` Terraform files only for rollback/decommission audit context.

## Source-of-truth release flow

```text
feature branch
  ↓
open PR into main
  ↓
PR Check passes
  ↓
Payload staging deploy wakes staging ECS when staging evidence is needed
  ↓
test staging
  ↓
merge PR into main
  ↓
Payload production deploy updates production ECS, invalidates CloudFront, checks readiness, then scales staging ECS back to zero
```

## Workflows

### PR Check

`.github/workflows/pr-check.yml` validates pull requests with focused app checks, TypeScript, production build, retained Lambda syntax checks, and backend-disabled Payload Terraform validation.

### gcoffers Payload deploy

`.github/workflows/gcoffers-payload-deploy.yml` is the active staging/production deploy workflow.

Staging deploys run when:

- a pull request touches `apps/gcoffers-site/**`, `infra/payload-site/**`, or the deploy workflow; or
- a manual workflow dispatch targets `staging`.

Production deploys run when:

- code is pushed to `main`; or
- a manual workflow dispatch targets `production` from `main`.

Production is protected by the GitHub `production` environment.

## What the deploy does

Both staging and production deploys:

- check out the repo
- validate required GitHub variables
- authenticate to AWS via OIDC
- build the `apps/gcoffers-site` Docker image
- push the image to ECR
- register a new ECS task definition
- update the ECS service to desired count `1`
- wait for service stability
- invalidate CloudFront
- check `/api/health/readiness`

Production additionally scales the staging ECS service to desired count `0` after the production deploy succeeds.

## What the deploy intentionally does not do

The GitHub deploy workflow does **not**:

- run Terraform
- change DNS records
- attach or move CloudFront aliases
- create/destroy infrastructure
- enable live Slack/email/external alerts

Those are operational changes and require explicit approval.

## Environments

| Environment | URL | Source |
|---|---|---|
| staging | `https://staging.gcoffers.com` | PR branch or manual staging dispatch |
| production | `https://gcoffers.com` / `https://www.gcoffers.com` | `main` only |

## Required GitHub configuration

The workflow uses repository variables and GitHub environments for AWS OIDC role ARNs, ECS/ECR/CloudFront resource references, and public URLs. Do not store long-lived AWS access keys in GitHub.

The production workflow also validates that production and staging ECS/CloudFront targets are distinct before it can deploy or scale staging down.
