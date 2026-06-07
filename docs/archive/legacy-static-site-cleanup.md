# Legacy Static Site Cleanup

Status: Archived after Payload cutover
Date: 2026-06-07

## What changed

The legacy static website source under `site/` and the local static-site deploy helpers were removed from the active tree. GitHub Actions no longer deploy the old static HTML path.

Removed active-tree paths:

- `site/`
- `scripts/`

The removed `scripts/` directory contained legacy static setup/deploy/check helpers that could create or mutate old S3, CloudFront, Route 53, ACM, Lambda, API Gateway, IAM, and Secrets Manager resources outside the approved Payload/Terraform path. Keeping those helpers in the active tree was more dangerous than useful after cutover.

## What remains intentionally

The root legacy Terraform files under `infra/` (`main.tf`, `variables.tf`, `outputs.tf`, `prod.tfvars`, `staging.tfvars`) remain in the repository for now. They represent historical/static AWS infrastructure and rollback/decommission context. Do not apply, delete, or materially change them casually.

Before removing or materially changing the legacy static Terraform files, verify:

- Which S3 buckets, CloudFront distributions, API Gateway routes, Lambda functions, Route 53 records, and ACM certificates still exist.
- Whether any resource is still needed for rollback or historical lead capture.
- Whether Terraform state exists and where it is stored.
- Whether deletion would require final snapshots, exports, object retention, or manual DNS checks.

## Current active path

- App source: `apps/gcoffers-site`
- Deploy workflow: `.github/workflows/gcoffers-payload-deploy.yml`
- Infrastructure: `infra/payload-site`
- Live domains: `gcoffers.com`, `www.gcoffers.com`

## Rollback note

Rollback should be treated as an operational incident, not a casual Git revert. The old static source can still be recovered from Git history if needed, but restoring traffic requires explicit CloudFront/DNS/resource checks.
