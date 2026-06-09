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
maintainer manually dispatches Payload staging deploy from main when staging evidence is needed
  ↓
test staging
  ↓
merge PR into main
  ↓
Payload production deploy updates production ECS, invalidates CloudFront, checks readiness, rolls back on failure, then scales staging ECS back to zero
```

## Workflows

### PR Check

`.github/workflows/pr-check.yml` validates pull requests with focused app checks, TypeScript, production build, retained Lambda syntax checks, and backend-disabled Payload Terraform validation.

### gcoffers Payload deploy

`.github/workflows/gcoffers-payload-deploy.yml` is the active staging/production deploy workflow.

Staging deploys run only by explicit manual dispatch:

- run `.github/workflows/gcoffers-payload-deploy.yml` from `main`;
- set `target=staging`;
- optionally set `deploy_ref` to the PR branch, PR ref such as `refs/pull/<number>/head`, or exact commit SHA to deploy.

PR pushes do not deploy to shared staging. Automatic PR validation remains in `.github/workflows/pr-check.yml`. Staging is protected by the GitHub `staging` environment. Manual dispatches from any ref other than `main` fail before AWS authentication.

Production deploys run when:

- code is pushed to `main`; or
- a manual workflow dispatch targets `production` from `main`.

Staging and production are protected by their GitHub environments.

## What the deploy does

Both staging and production deploys:

- check out the repo
- validate required GitHub variables
- authenticate to AWS via OIDC
- build the `apps/gcoffers-site` Docker image
- push the image to ECR
- capture the current ECS task definition and desired count before changing the service
- register a new ECS task definition
- update the ECS service without overriding the existing desired count when it is already non-zero
- wait for service stability
- invalidate CloudFront
- check `/api/health/readiness`
- roll back to the captured task definition and desired count if service stability or readiness/smoke checks fail

Staging deploys still wake staging from desired count `0` to `1` when needed so the readiness endpoint can be smoke checked, but they no longer collapse an already-scaled service down to `1`. Production deploys preserve the current production desired count. Production additionally scales the staging ECS service to desired count `0` after the production deploy succeeds.

## Image promotion status

The workflow currently rebuilds and pushes an immutable ECR tag separately for staging and production. Full staging-tested image digest promotion is intentionally deferred because staging and production deploys are triggered by different events (`pull_request`/manual staging vs. `push` to `main`/manual production). A partial implementation that only reuses tag names across those independent runs would not prove that production is using the exact digest that passed staging.

Recommended next step: split build/publish from deployment and record the image digest as a release artifact or workflow output, then gate a single promotion path through GitHub environments so production deploys the exact digest that was staged and smoke checked, without rebuilding.

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
| staging | `https://staging.gcoffers.com` | Manual staging dispatch from `main`; optional `deploy_ref` selects branch/ref/SHA |
| production | `https://gcoffers.com` / `https://www.gcoffers.com` | `main` only |

## Required GitHub configuration

The workflow uses repository variables and GitHub environments for AWS OIDC role ARNs, ECS/ECR/CloudFront resource references, and public URLs. Do not store long-lived AWS access keys in GitHub.

The production workflow also validates that production and staging ECS/CloudFront targets are distinct before it can deploy or scale staging down.
