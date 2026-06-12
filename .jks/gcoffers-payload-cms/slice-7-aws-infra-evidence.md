# slice-7-aws-infra evidence

Started: 2026-06-06T05:16:09Z
Finished: 2026-06-06T05:30:28Z

## Scope

Implemented Terraform design/code under `infra/payload-site` for the gcoffers Payload CMS migration. No app/product code, cron jobs, Slack/reporting integrations, or files outside the allowed write set were edited.

## References inspected

- `apps/gcoffers-site/.env.example`
- `apps/gcoffers-site/Dockerfile`
- `apps/gcoffers-site/src/app/api/health/readiness/route.ts`
- `apps/gcoffers-site/src/app/api/health/public-content/route.ts`
- `infra/website/main.tf`, `variables.tf`, `outputs.tf`, `staging.tfvars`, `prod.tfvars`
- `docs/architecture/gcoffers-payload-cms-adr.md`
- `docs/ops/website-standards.md`
- `docs/product/deals-prd.md`
- Source epic: `/Users/jarvis/LocalRepos/gold-coast/epics/active/gcoffers-payload-cms-whole-site.md`

## Changed files

Created:

- `infra/payload-site/README.md`
- `infra/payload-site/alarms.tf`
- `infra/payload-site/alb.tf`
- `infra/payload-site/cloudfront.tf`
- `infra/payload-site/ecs.tf`
- `infra/payload-site/iam.tf`
- `infra/payload-site/locals.tf`
- `infra/payload-site/network.tf`
- `infra/payload-site/outputs.tf`
- `infra/payload-site/rds.tf`
- `infra/payload-site/route53.tf`
- `infra/payload-site/s3.tf`
- `infra/payload-site/security-groups.tf`
- `infra/payload-site/terraform.tfvars.example`
- `infra/payload-site/variables.tf`
- `infra/payload-site/versions.tf`
- `.jks/gcoffers-payload-cms/slice-7-aws-infra-evidence.md`

Generated during validation and then removed before finishing:

- `infra/payload-site/.terraform/`
- `infra/payload-site/.terraform.lock.hcl` (repo `.gitignore` ignores this file)

## Implementation summary

- Added a standalone Terraform stack for the new Next.js + Payload runtime:
  - ECS Fargate cluster, task definition, service, execution/task IAM, ECR repo, and autoscaling target.
  - ALB, target group, security groups, and health check path `/api/health/readiness`.
  - RDS Postgres with RDS-managed master secret, encrypted gp3 storage, backup/deletion-protection defaults that become safer in `prod`.
  - Private S3 Payload media bucket with public access block, bucket-owner-enforced ownership, SSE-S3, versioning, and lifecycle rules.
  - Referenced source-of-truth form bucket/prefixes defaulting to existing `goldcoast-leads` without creating or taking ownership unless explicitly configured.
  - Secrets Manager ARN injection points for `DATABASE_URI`, `PAYLOAD_SECRET`, `GHL_API_KEY`, Slack webhook, internal alert config, and extra app secrets; no secret values are stored.
  - CloudWatch log group, log metric filter, and alarms for form S3 persistence failures, ALB 5xx/latency/unhealthy targets, ECS CPU/memory, and RDS CPU/storage.
  - CloudFront distribution in front of ALB with `Host` forwarded and included in public page cache key for seller/buyer host-based rendering.
  - Optional Route53 A/AAAA records gated by `enable_dns_cutover` and existing hosted-zone reference/data-source lookup only.
- Safety defaults are explicitly false:
  - `enable_dns_cutover = false`
  - `enable_prod_alias = false`
  - `enable_live_alerts = false`
- Added no-cache CloudFront behavior for protected/sensitive route families:
  - `/admin*`
  - `/api/*` (covers auth/session, form POST routes, and health/API routes)
  - `/payload*`
  - `/preview*`
  - `/draft*`
  - `/_next/data/*`
  - `/media/private/*`
- Added README usage docs and `terraform.tfvars.example` with safe defaults and cutover guidance.

## Commands run

All commands were run from `/Users/jarvis/LocalRepos/gold-coast-gcoffers-payload-cms` unless a different working directory is shown.

1. `date -u '+%Y-%m-%dT%H:%M:%SZ' && git status --short`
   - Result: PASS.
   - Summary output: start timestamp `2026-06-06T05:16:09Z`; working tree already had pre-existing changes outside this slice. Those files were not edited by this slice.

2. Working directory `infra/payload-site`: `terraform version && terraform fmt -check -recursive`
   - Result: FAIL as expected before formatting.
   - Summary output: Terraform `v1.5.7` on `darwin_arm64`; fmt check listed `cloudfront.tf`, `iam.tf`, and `locals.tf` as needing formatting; exit code `3`.

3. Working directory `infra/payload-site`: `terraform fmt -recursive && terraform fmt -check -recursive`
   - Result: PASS.
   - Summary output: formatted `cloudfront.tf`, `iam.tf`, `locals.tf`; follow-up fmt check produced no output and exit code `0`.

4. Working directory `infra/payload-site`: `terraform init -backend=false && terraform validate`
   - Result: PASS.
   - Summary output: initialized providers `hashicorp/aws v5.100.0` and `hashicorp/random v3.9.0`; `Success! The configuration is valid.`

5. `rm -rf .terraform && terraform fmt -check -recursive && git status --short infra/payload-site .jks/gcoffers-payload-cms/slice-7-aws-infra-evidence.md && git diff --stat -- infra/payload-site .jks/gcoffers-payload-cms/slice-7-aws-infra-evidence.md`
   - Result: PASS.
   - Summary output: fmt check passed; status showed the new evidence file and `infra/payload-site/` as untracked. `git diff --stat` had no output because files were untracked.

6. Working directory `infra/payload-site`: `rm -rf infra/payload-site/.terraform && terraform fmt -check -recursive`
   - Result: PASS.
   - Summary output: no output; command was a harmless cleanup/fmt check, but the cleanup path was relative to `infra/payload-site` and did not remove the generated provider directory.

7. Working directory `infra/payload-site`: `rm -rf .terraform && test ! -d .terraform && terraform fmt -check -recursive`
   - Result: PASS.
   - Summary output: generated `.terraform/` directory removed; fmt check passed with no output.

8. `git status --short infra/payload-site .jks/gcoffers-payload-cms/slice-7-aws-infra-evidence.md && git ls-files --others --exclude-standard infra/payload-site .jks/gcoffers-payload-cms/slice-7-aws-infra-evidence.md | sort`
   - Result: PASS.
   - Summary output: evidence file and `infra/payload-site/` are untracked; listed the 16 new infra files plus this evidence file.

9. `git check-ignore -v infra/payload-site/.terraform.lock.hcl || true`
   - Result: PASS.
   - Summary output: `.gitignore:8:.terraform.lock.hcl` ignores `infra/payload-site/.terraform.lock.hcl`.

10. Working directory `infra/payload-site`: `rm -f .terraform.lock.hcl && test ! -e .terraform.lock.hcl && terraform fmt -check -recursive`
    - Result: PASS.
    - Summary output: ignored lock file removed; fmt check passed with no output.

11. Working directory `infra/payload-site`: `terraform init -backend=false -input=false && terraform validate && rm -rf .terraform .terraform.lock.hcl`
    - Result: PASS.
    - Summary output: initialized providers `hashicorp/aws v5.100.0` and `hashicorp/random v3.9.0`; `Success! The configuration is valid.` Generated init artifacts were removed afterwards.

12. Working directory `infra/payload-site`: `terraform fmt -check -recursive && test ! -d .terraform && test ! -e .terraform.lock.hcl && git status --short infra/payload-site .jks/gcoffers-payload-cms/slice-7-aws-infra-evidence.md`
    - Result: PASS.
    - Summary output: fmt check passed and Terraform init artifacts were absent. The `git status` path arguments were repo-root-relative while the command ran from `infra/payload-site`, so it produced no path output.

13. `date -u '+%Y-%m-%dT%H:%M:%SZ' && git status --short infra/payload-site .jks/gcoffers-payload-cms/slice-7-aws-infra-evidence.md && git ls-files --others --exclude-standard infra/payload-site .jks/gcoffers-payload-cms/slice-7-aws-infra-evidence.md | sort`
    - Result: PASS.
    - Summary output: finish timestamp `2026-06-06T05:30:28Z`; evidence file and `infra/payload-site/` are untracked; listed the 16 new infra files plus this evidence file.

## Verification

- Terraform availability: PASS (`Terraform v1.5.7`, darwin_arm64).
- `terraform fmt -check -recursive`: PASS after formatting.
- `terraform init -backend=false -input=false`: PASS; backend disabled, provider init only.
- `terraform validate`: PASS; `Success! The configuration is valid.`
- Terraform plan: NOT RUN. A plan would require live AWS provider reads (for example availability zones and any enabled data sources) and safe state/credentials. To avoid live AWS/API side effects in this bounded slice, verification stopped at backend-disabled init and validate.
- Terraform apply: NOT RUN, per guardrails.

## Caveats / blockers

- No production deployment, DNS change, CloudFront alias attachment, Terraform apply, AWS resource mutation, or live Slack/email/GHL alert was performed.
- Default `ecs_desired_count = 0` is intentional for safe first planning before an immutable app image and required Secrets Manager values exist. Production should set desired/min capacity to at least `1` only after approval and secret/image readiness.
- The current app `.env.example` expects `DATABASE_URI`. Terraform outputs/provides the RDS host/user/master-secret ARN and supports injecting a separate `database_uri_secret_arn`; an operator must create/populate that secret or the app must derive its DB URL from the provided RDS variables before running tasks.
- CloudFront aliases/DNS are disabled by default. Enabling aliases requires a us-east-1 ACM cert ARN, and enabling Route53 cutover requires explicit approval plus an existing hosted-zone id or data-source lookup.
- The form submission bucket defaults to a reference to `goldcoast-leads`; this stack does not create/take over that legacy bucket unless `create_form_submissions_bucket=true` is explicitly set.
