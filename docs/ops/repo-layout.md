# Gold Coast Repo Layout

## Current Monorepo Skeleton

```text
apps/
  website/       Static gcoffers.com website
  deals/         Investor deals portal prototype
  tools/         Internal browser tools
services/
  lead-handler/  Existing lead-capture Lambda source
infra/
  website/       Existing Terraform for the website stack
sql/
  data-lake/     Reserved for analytical SQL
docs/
  ops/           Runbooks, standards, compliance tickets
  product/       PRDs and product specs
```

## Preservation Contract

- `scripts/deploy.sh` still deploys the website contents to the existing S3 bucket root.
- The public website URL structure remains unchanged because files under `apps/website/` are synced as bucket-root objects.
- `infra/website/main.tf` still packages the lead handler Lambda, now from `services/lead-handler/`.
- Data-lake code and infrastructure must land in the reserved app/infra/sql boundaries, not in the website app.
