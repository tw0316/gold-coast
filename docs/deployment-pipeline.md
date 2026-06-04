# Deployment Pipeline

Gold Coast Home Buyers deploys a static HTML/CSS/JS site to S3 + CloudFront.

The normal deploy path is GitHub Actions. Local deploy scripts are not part of the standard release flow.

## Source-of-truth release flow

```text
feature branch
  ↓
open PR into main
  ↓
PR Check passes
  ↓
Deploy Staging workflow with the PR branch/ref when staging evidence is needed
  ↓
test staging from an allowed IP
  ↓
merge PR into main
  ↓
Deploy Production workflow from main after approval
```

## Workflows

### PR Check

Runs on every PR into `main`:

```text
validate required static site files
reject .DS_Store and local absolute paths
verify a lead submission API endpoint is referenced
check Lambda JavaScript syntax
```

### Deploy Staging

Manual GitHub Actions workflow.

Use this for:

- Previewing a PR branch before merge.
- Deploying the current `main` bundle to staging after one or more PRs merge.

Inputs:

- `ref`: branch name, tag, or commit SHA to deploy.

Examples:

```text
fix/homepage-copy
main
086969d
```

Deploy Staging runs:

```text
checkout selected ref
validate static site
check Lambda JavaScript syntax
validate required GitHub Actions variables
configure AWS OIDC credentials
sync site/ to the staging S3 bucket with cache-control metadata
invalidate staging CloudFront /*
run a non-blocking staging smoke check
```

Staging is IP-restricted by WAF. GitHub-hosted runners may receive HTTP 403 during the smoke check. That is expected and does not fail the workflow. Final staging review should happen from an allowed IP.

### Deploy Production

Manual GitHub Actions workflow.

Production deploys always check out `main`. If the workflow is run from any branch other than `main`, it fails before deploying.

Use this when staging already looks good and the current `main` commit is approved for production.

Deploy Production runs:

```text
require workflow ref is main
checkout main
validate static site
check Lambda JavaScript syntax
validate required GitHub Actions variables
configure AWS OIDC credentials
sync site/ to the production S3 bucket with cache-control metadata
invalidate production CloudFront /*
require production smoke check to return HTTP 200
```

## Environments

| Environment | URL | Source allowed |
|---|---|---|
| staging | `https://staging.gcoffers.com` | any selected ref |
| production | `https://gcoffers.com` | `main` only |

## GitHub repository variables

These must be configured in GitHub Actions variables:

| Variable | Purpose | Current value |
|---|---|---|
| `AWS_REGION` | AWS region | `us-east-1` |
| `AWS_STAGING_DEPLOY_ROLE_ARN` | OIDC role for staging deploys | create during AWS setup |
| `AWS_PRODUCTION_DEPLOY_ROLE_ARN` | OIDC role for production deploys | create during AWS setup |
| `STAGING_S3_BUCKET` | staging static website bucket | `gcoffers-site-staging` |
| `STAGING_CLOUDFRONT_DISTRIBUTION_ID` | staging CloudFront distribution | `E2MA4HGXAENEX6` |
| `PRODUCTION_S3_BUCKET` | production static website bucket | `gcoffers-site` |
| `PRODUCTION_CLOUDFRONT_DISTRIBUTION_ID` | production CloudFront distribution | `E2M3ODBLV2EE62` |

The deploy workflows validate required variables before attempting AWS credentials, S3 sync, or CloudFront invalidation, so missing GitHub variables fail early with a readable error.

No long-lived AWS access keys should be stored in GitHub. GitHub Actions should use AWS OIDC and short-lived credentials.

## AWS IAM

Set up two least-privilege deploy roles in the Gold Coast AWS account:

- `GitHubActionsGoldCoastStagingDeploy`
- `GitHubActionsGoldCoastProductionDeploy`

Each role should only be assumable by `tw0316/gold-coast` GitHub Actions through `token.actions.githubusercontent.com` and should only be able to sync its own S3 bucket and invalidate its own CloudFront distribution.

Trust policy subjects:

- Staging role: `repo:tw0316/gold-coast:environment:staging`.
- Production role: `repo:tw0316/gold-coast:environment:production`.

Required permissions per role:

- `s3:ListBucket` on that environment's bucket.
- `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on that environment's bucket objects.
- `cloudfront:CreateInvalidation` on that environment's CloudFront distribution.

Production should also be protected by the GitHub `production` environment with required reviewer approval and a deployment branch policy limited to `main`.

## Cache-control policy

The site uses unversioned CSS and JavaScript filenames, so deploys should not use immutable browser caching for those files.

The Actions sync helper applies:

- `public,max-age=0,must-revalidate` to all deployed files by default.
- `public,max-age=86400` to images and icons under `site/assets/`.
- CloudFront `/*` invalidation on every deploy.

## Local deploy scripts

The standard pipeline deliberately avoids local deploy commands.

- Use GitHub Actions for staging and production deploys.
- `scripts/deploy.sh` remains only as a break-glass fallback. It refuses to run unless all of these are true:
  - `ALLOW_LOCAL_DEPLOY=1`
  - `staging` or `prod` is provided
  - `--confirm-local-break-glass` is provided
  - the git working tree is clean
  - production deploys are run from `main`

Break-glass example:

```bash
ALLOW_LOCAL_DEPLOY=1 ./scripts/deploy.sh staging --confirm-local-break-glass
```

If the site is not on fire, use GitHub Actions.
