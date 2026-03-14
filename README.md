# Gold Coast Home Buyers — gcoffers.com

Lead generation website for Gold Coast Home Buyers, a South Florida real estate wholesaling business.

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

## Architecture

```
User → CloudFront → S3 (static site)
                  → API Gateway → Lambda → S3 (lead data)
                                         → GoHighLevel (CRM)
```

Form submissions hit Lambda via API Gateway. Lambda writes to S3 first (source of truth), then syncs to GoHighLevel CRM in parallel. If GHL fails, the lead is still captured in S3.

## Development

No build step needed. Edit HTML/CSS/JS directly in `site/` and deploy.

```bash
# Preview locally
cd site && python3 -m http.server 8080
```

## Infrastructure

All AWS resources are managed via Terraform in `infra/`.

```bash
cd infra
terraform init
terraform plan -var-file=staging.tfvars -var="ghl_api_key=YOUR_KEY"
terraform apply -var-file=staging.tfvars -var="ghl_api_key=YOUR_KEY"
```

## Standards

See [docs/STANDARDS.md](docs/STANDARDS.md) for full development standards, testing checklist, and deployment procedures.
