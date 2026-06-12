# Gold Coast Home Buyers — Deployment Status

Updated: 2026-06-07

## Current status

`gcoffers.com` and `www.gcoffers.com` are live on the Next.js + Payload CMS runtime in `apps/gcoffers-site`.

The old static status in this file has been superseded. Static `site/` source and static-site deploy helpers were removed from the active tree after the Payload cutover. Historical static infrastructure under the root legacy `infra/` Terraform files remains only for rollback/decommission audit context until Tej explicitly approves retirement.

## Active deployment path

- Source app: `apps/gcoffers-site`
- Runtime infrastructure: `infra/payload-site`
- App deploy workflow: `.github/workflows/gcoffers-payload-deploy.yml`
- PR validation workflow: `.github/workflows/pr-check.yml`
- Operational runbook: `docs/ops/payload-site-runbook.md`
- Deployment lifecycle doc: `docs/deployment-pipeline.md`
- Static cleanup note: `docs/archive/legacy-static-site-cleanup.md`

## Environment summary

- Production: `https://gcoffers.com` and `https://www.gcoffers.com`
- Staging: `https://staging.gcoffers.com`
- Buyer/deals surface: `https://gcoffers.com/deals/`

`deals.gcoffers.com` is not a live production target.

## Deployment guardrails

Routine GitHub app deploys:

- build and push an immutable app image
- update the ECS service task definition
- set the target ECS service desired count to `1`
- invalidate CloudFront
- check `/api/health/readiness`
- scale staging ECS desired count to `0` after a successful production deploy

Routine GitHub app deploys do **not**:

- run Terraform
- change DNS records
- attach or move CloudFront aliases
- create or destroy infrastructure
- enable live Slack/email/external alerts

Those operations require explicit approval.

## Secret and identifier hygiene

Legacy resource IDs, AWS account IDs, ARNs, API endpoints, CloudFront IDs, Route53 zone IDs, webhook URLs, DB endpoints, credentials, and private contact values must stay out of committed docs and evidence unless they are placeholders or redacted.
