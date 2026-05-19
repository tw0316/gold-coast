# Gold Coast Home Buyers — gcoffers.com

Gold Coast Home Buyers production monorepo. The current production surface is the gcoffers.com lead generation website for a South Florida real estate wholesaling business.

## Stack

- **Frontend:** Static HTML/CSS/JS (no build step)
- **Hosting:** AWS S3 + CloudFront
- **Backend:** AWS Lambda + API Gateway (form submissions)
- **Data:** S3 (source of truth) + GoHighLevel CRM (parallel sync)
- **DNS:** AWS Route 53
- **IaC:** Terraform

## Environments

| Environment | Domain | Access |
|-------------|--------|--------|
| Production  | gcoffers.com | Public |
| Staging     | staging.gcoffers.com | IP-restricted |

## Quick Start

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh prod
```

## Repository Layout

```text
apps/
  website/       Static gcoffers.com website, deployed to the existing S3 buckets
  deals/         Investor deals portal prototype
  tools/         Internal browser tools
services/
  lead-handler/  Lambda source for website lead capture
infra/
  website/       Existing Terraform for website, API Gateway, Lambda, and DNS
sql/
  data-lake/     Reserved for Gold Coast analytical SQL
docs/
  ops/           Operating docs, deployment standards, and compliance tickets
  product/       Product specs and PRDs
```

## Architecture

```
User → CloudFront → S3 (static site)
                  → API Gateway → Lambda → S3 (lead data)
                                         → GoHighLevel (CRM)
```

Form submissions hit Lambda via API Gateway. Lambda writes to S3 first (source of truth), then syncs to GoHighLevel CRM in parallel. If GHL fails, the lead is still captured in S3.

## Development

No build step needed. Edit HTML/CSS/JS directly in `apps/website/` and deploy.

```bash
# Preview locally
cd apps/website && python3 -m http.server 8080
```

## Infrastructure

Existing website AWS resources are managed via Terraform in `infra/website/`.

```bash
cd infra/website
terraform init
terraform plan -var-file=staging.tfvars -var="ghl_api_key=YOUR_KEY"
terraform apply -var-file=staging.tfvars -var="ghl_api_key=YOUR_KEY"
```

## Standards

See [docs/ops/website-standards.md](docs/ops/website-standards.md) for full development standards, testing checklist, and deployment procedures.
