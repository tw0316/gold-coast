# Infrastructure

## Active stack

`infra/payload-site/` is the active Terraform stack for the live Next.js + Payload runtime serving `gcoffers.com`, `www.gcoffers.com`, and `/deals`.

Use the Payload stack docs before making infrastructure changes:

- `infra/payload-site/README.md`
- `docs/ops/payload-site-runbook.md`
- `docs/deployment-pipeline.md`

## Legacy static stack

The root Terraform files in this directory (`main.tf`, `variables.tf`, `outputs.tf`, `prod.tfvars`, `staging.tfvars`) describe the old static website/API architecture. They are retained only as rollback/decommission audit context.

Do not apply, destroy, or use the legacy static stack for routine deploys. Routine site deploys use GitHub Actions and `apps/gcoffers-site`. Terraform, DNS, alias, and live-alert changes require explicit approval.
