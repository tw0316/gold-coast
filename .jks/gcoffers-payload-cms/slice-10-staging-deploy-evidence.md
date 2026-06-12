# Slice 10, Staging Deploy Evidence

Completed: 2026-06-06T14:43:00Z

## Scope

Deploy the Payload runtime to staging without DNS cutover, production aliases, or live alerts.

## Guardrails Verified

- `enable_dns_cutover=false`
- `enable_prod_alias=false`
- `enable_live_alerts=false`
- No Route53 records were created by this stack.
- CloudFront aliases are empty, so no production hostname was attached.
- ECS desired/min capacity were raised only for staging runtime after image and runtime secrets existed.
- Runtime secrets were stored in AWS Secrets Manager and values were not printed or committed.

## Deployment Evidence

- Stage-0 Terraform apply completed, then runtime Terraform apply completed.
- Runtime apply result: `1 added, 1 changed, 1 destroyed` for the ECS task definition/service update.
- Docker image built from merge commit `78cb7e0` and pushed to the staging ECR repository.
- Image tag: `stage-78cb7e0-20260606141229`
- ECS service reached steady state with desired `1`, running `1`, pending `0`.
- ECS task/container reported `RUNNING` and `HEALTHY`.
- Staging CloudFront URL: `https://d15i9adzz532yk.cloudfront.net`
- Staging ALB DNS: `gcoffers-payload-staging-868254024.us-east-1.elb.amazonaws.com`

## Runtime Fixes During Deploy

- CloudFront zero-TTL no-cache policy could not enable Accept-Encoding normalization. `infra/payload-site/cloudfront.tf` was patched locally to remove Brotli/Gzip normalization from that policy while keeping behavior compression enabled.
- Initial Payload admin DB connection failed on RDS SSL certificate verification. The staging `DATABASE_URI` secret was updated to use `sslmode=no-verify` for this low-risk staging smoke. This avoids printing the credential and keeps the app runtime working. Revisit CA verification before production cutover.
- Runtime form pipeline was configured with `FORM_PIPELINE_S3_WRITER=aws` and `FORM_PIPELINE_S3_BUCKET=goldcoast-leads` so staging form checks exercise real S3-first persistence. Side effects remain mocked.

## Remediation Deploy, 2026-06-06T18:21:04Z

Tej approved a staging-only remediation after browser verification showed `/admin` was rendering a Next error page despite HTTP `200` responses. The fix was limited to staging.

- Root cause: Payload admin queried missing Postgres tables, specifically `users` / `users_sessions`.
- Code fix: generated initial Payload migrations and configured `prodMigrations` in `apps/gcoffers-site/src/payload.config.ts`.
- Commit pushed to PR #6: `851dbf1b997c491e66c476d60d94dc1978cab248`.
- New image tag deployed: `stage-851dbf1-20260606180226`.
- ECS rollout completed with desired `1`, running `1`, pending `0`.
- Browser verification now shows styled Payload setup UI at `/admin` with `hasNextError=false` and no browser console errors.

## Caveats

- `staging.gcoffers.com` still points to the legacy static site. The deployed Payload runtime is currently reachable at the CloudFront URL above.
- No DNS, production alias, Terraform production cutover, deployment to prod, or live alert send was performed.
- `infra/payload-site/cloudfront.tf` is committed in PR #6 as part of the staging evidence/fix branch.
- Staging `DATABASE_URI` uses `sslmode=no-verify`; revisit CA verification before production cutover.
