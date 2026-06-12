# Deployment Pipeline

Gold Coast Home Buyers deploys the Payload/Next site from `apps/gcoffers-site` through GitHub Actions. This is the canonical description of how code reaches staging and production.

The legacy static `site/` deploy path has been removed from the active tree. Historical static infrastructure remains in the root legacy `infra/` Terraform files only for rollback/decommission audit context.

Two workflows make up the pipeline:

- `.github/workflows/pr-check.yml` — CI on pull requests into `main`.
- `.github/workflows/gcoffers-payload-deploy.yml` — the deploy workflow: a `workflow_dispatch`-only single-run promotion gate.

The key property: **merging to `main` deploys nothing to AWS.** A deploy only happens when an operator manually dispatches a release.

## Flow at a glance

```text
feature branch
  ↓  open PR into main
PR Check (required: Validate Payload site + Validate Payload Terraform)
  ↓  1 approval, conversations resolved
merge into main                          ── deploys NOTHING to AWS
  ↓  when ready to release: workflow_dispatch from main (no deploy_ref)
======================= ONE RELEASE RUN =======================
job deploy-staging:  build image ONCE → push to shared ECR →
                     deploy staging by digest → readiness → rollback on fail
                     (emits image_digest / image_ref as job outputs)
  ↓
=== run PAUSES at the production environment approval ===  ← operator tests staging
  ↓  Tej approves
job promote-production:  deploy the SAME image digest (no rebuild) →
                         assert task-def image == staging image_ref →
                         readiness → rollback on fail → scale staging ECS to 0
===============================================================
```

## PR / CI / review flow into main

Changes reach `main` only through a reviewed pull request:

- A pull request into `main` is required; direct pushes to `main` are blocked.
- **1 approving review** is required.
- **Required status checks** must pass: `Validate Payload site` and `Validate Payload Terraform` (both jobs in `pr-check.yml`).
- **Conversation resolution** is required before merge.
- **No force-push** and **no branch deletion** on `main`.
- The repository **owner may bypass** the review requirement (admin bypass on the review ruleset); the required-CI ruleset has no bypass.

`pr-check.yml` runs on every pull request into `main` (and can be dispatched manually). It performs:

- `Validate Payload site` — installs `apps/gcoffers-site` dependencies, runs the focused app verification (`verify:seller-site`, `verify:buyer-deals-site`, `verify:s3-first-form-pipeline`), `typecheck`, and the production `build`, plus a retained `node --check` syntax pass over any tracked `lambda/*.js`.
- `Validate Payload Terraform` — `terraform fmt -check -recursive` and a backend-disabled `terraform init` + `terraform validate` in `infra/payload-site`.

CI never deploys to AWS. There is no PR-triggered or push-triggered staging or production deploy.

## Release flow (single-run promotion gate)

A **release** is one manual dispatch of `gcoffers Payload deploy` from `main` with no `deploy_ref`. The single run has two jobs and one approval pause.

### 1. `deploy-staging` (environment: `staging`)

1. Checks out the dispatched `main` commit (or `deploy_ref` when set — see the escape hatch).
2. Assumes the AWS deploy role (`secrets.AWS_DEPLOY_ROLE_ARN`) via GitHub OIDC.
3. Builds `apps/gcoffers-site/Dockerfile` **exactly once** with Buildx (`provenance: false`, `sbom: false`) and pushes it to the shared ECR repository (`vars.GCOFFERS_PAYLOAD_ECR_REPOSITORY`, currently `gcoffers-payload-staging-app`). It captures the pushed image digest and exposes the digest-pinned reference `<registry>/<repo>@sha256:<digest>` as the job outputs `image_digest` and `image_ref`.
4. Captures the current staging ECS task definition and desired count, sets container `app` to the new image, registers a new task definition revision, updates the service without overriding desired count, and waits for stability. If staging was scaled to `0`, it temporarily raises desired count to `1` so readiness can be smoke checked.
5. Invalidates CloudFront and smoke checks `${GCOFFERS_PAYLOAD_STAGING_URL}/api/health/readiness` for JSON with `ok: true`.
6. On any failure after ECS state capture, rolls staging back to the captured prior task definition and desired count.

### 2. Production approval pause

The run then pauses at the `production` GitHub environment approval. **This pause is the staging test window** — the operator validates staging while the run waits. GitHub holds the run in progress until approval (up to its 30-day limit).

### 3. `promote-production` (environment: `production`)

Runs only after approval, and only when `inputs.deploy_ref == ''`:

1. Assumes the deploy role via OIDC. It does **not** rebuild or re-checkout source — it consumes `needs.deploy-staging.outputs.image_ref` directly, so the digest is handed job-to-job inside the run with no copy-paste and no cross-run storage.
2. Captures the current production ECS task definition and desired count, sets container `app` to the same staging-built `image_ref`, and registers a new production task definition revision.
3. **Promotion proof:** asserts the registered production task definition's container image equals the staging-built `image_ref` (string compare via `ecs:DescribeTaskDefinition`) and fails if they differ. Runtime-digest verification against the running task is intentionally out of scope — the deploy role lacks `ecs:DescribeTasks`, and adding it would violate the no-new-IAM constraint.
4. Updates the production service without overriding desired count and waits for stability.
5. Invalidates CloudFront and smoke checks `${GCOFFERS_PAYLOAD_PRODUCTION_URL}/api/health/readiness` for `ok: true`.
6. On any failure after ECS state capture, rolls production back to the captured prior task definition and desired count.
7. On success, scales the staging ECS service to desired count `0` (cost control). Shared fixed infrastructure — ALB, target group, RDS, S3 buckets, CloudFront, DNS/certificates, logs, alarms, Terraform state — is untouched.

Because staging and production share the ECR repository, production pulls the exact image that was built and validated on staging; nothing is rebuilt during promotion.

## Ad-hoc staging escape hatch (`deploy_ref`)

To test a branch or specific commit on staging without releasing it to production, dispatch the workflow from `main` with the `deploy_ref` input set to a branch, ref, or SHA:

```bash
gh workflow run gcoffers-payload-deploy.yml --ref main -f deploy_ref=<branch-or-sha>
```

`deploy-staging` builds and deploys that ref to staging only. `promote-production` is **skipped for any run with a non-empty `deploy_ref`**, so branch code can never reach production. The workflow itself must still be dispatched from `main`.

## Gates

- **Dispatch from `main`** — the `validate-dispatch-source` job fails any dispatch from a ref other than `main`, before AWS authentication.
- **Production approval** — the `production` environment requires Tej's approval; the run pauses there until approved.
- **Protected branches** — production is restricted to protected branches.
- **Staging** — the `staging` environment no longer has a reviewer (removed 2026-06-09). The dispatch-from-`main` requirement and the production approval are the gates; the `deploy_ref` escape hatch only ever touches non-production staging.

## One release in flight at a time

Do **not** dispatch a second release while one is awaiting production approval.

Both jobs share the concurrency group `gcoffers-payload-ecs-deploy` with `cancel-in-progress: false`, so ECS mutations can never interleave — **safety is preserved** (a cancelled pending job performs no ECS mutation, so there is no clobbering). However, GitHub keeps only **one pending entry per concurrency group**: if a newer release queues while an older release is pending on the production approval, the older pending production promotion can be **silently cancelled**. That costs you the older release (a liveness loss), not a corrupted deploy. Run releases one at a time and let each finish — approved or cancelled — before starting the next.

## What the deploy intentionally does not do

The deploy workflow does **not**:

- run Terraform;
- change DNS records;
- attach or move CloudFront aliases;
- create or destroy infrastructure;
- enable live Slack/email/external alerts.

Those are operational changes that require explicit approval. The workflow only publishes a new app image to an already-created ECS/CloudFront environment and manages the low-cost staging desired-count lifecycle.

## Environments

| Environment | URL | How it is deployed |
|---|---|---|
| staging | `https://staging.gcoffers.com` | First job of a release, or an escape-hatch run with `deploy_ref`. Scaled to desired count `0` after a successful production promotion. |
| production | `https://gcoffers.com` / `https://www.gcoffers.com` | Second job of a release, after approval, using the exact image staging built. Never deployed by `deploy_ref` runs. |

## Required GitHub configuration

The workflow uses a single OIDC deploy-role secret and repository variables for AWS resources; do not store long-lived AWS access keys in GitHub.

- Secret: `AWS_DEPLOY_ROLE_ARN` — OIDC-assumable deploy role with least privilege for ECR push/pull, ECS task/service register/update/describe, `iam:PassRole` on the task/execution roles, CloudFront invalidation, and the staging scale-down.
- Variables: `AWS_REGION`, `GCOFFERS_PAYLOAD_ECR_REPOSITORY` (repository name only, shared by both jobs), and the staging/production `*_CLUSTER`, `*_SERVICE`, `*_CLOUDFRONT_DISTRIBUTION_ID`, and `*_URL` variables.

Both jobs re-run defensive validations: required variables present, `GCOFFERS_PAYLOAD_ECR_REPOSITORY` is a name and not a registry URL, staging targets are clearly named `staging`, the promoted image reference is digest-pinned (`repo@sha256:...`), and staging vs. production ECS/CloudFront targets are distinct before any deploy or staging scale-down.

The deeper operational runbook (local development, AWS architecture, Terraform, secrets, smoke tests, rollback, and step-by-step operator commands and expected status) lives in `docs/ops/payload-site-runbook.md`.

## One-time transition note

The PR that introduced this single-run promotion gate is the **last change that merging to `main` deployed automatically** — it replaced the prior behavior where pushing to `main` deployed production and PR/manual staging runs deployed staging. After that PR merged, merging to `main` no longer deploys anything to AWS; every release is an explicit `workflow_dispatch` of `gcoffers Payload deploy` from `main`.
