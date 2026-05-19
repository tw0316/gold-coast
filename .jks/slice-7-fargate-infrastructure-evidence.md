# Slice 7 Evidence: Fargate Infrastructure Skeleton

Source epic: /Users/jarvis/.openclaw/workspace/epics/active/gold-coast-data-lake-recurring-batch-ingestion.md

## Scope

Reconciled and tightened the production runtime scaffolding for the scheduled data-lake refresh.

- Kept apps/data-lake/Dockerfile and apps/data-lake/.dockerignore for container packaging.
- Moved refresh Terraform to the epic-approved infra/data-lake-refresh boundary.
- Added Terraform for ECR, ECS Fargate, IAM, DynamoDB lock table, CloudWatch logs, HTTPS-only/no-inbound security group, and EventBridge Scheduler.
- Kept EventBridge Scheduler at rate(30 minutes) and disabled by default through schedule_enabled=false.
- Added infra/data-lake-refresh/prod.tfvars.example with placeholder ARNs only.
- Updated docs/ops/data-lake/fargate-refresh-runtime.md and README repo layout notes.
- Fixed the runner's Fargate secret contract so GHL_API_KEY and GHL_LOCATION_ID injected as process env vars are accepted without a local env file.

## Verification Completed

Python compile:

~~~
cd apps/data-lake
PYTHONPATH=src python3 -m py_compile scripts/ghl_extract_raw.py scripts/build_curated_tables.py src/gold_coast_data_lake/*.py src/gold_coast_data_lake/jobs/*.py tests/*.py
~~~

Result: passed.

Unit tests:

~~~
cd apps/data-lake
PYTHONPATH=src python3 -m unittest discover -s tests -v
~~~

Result: 25 tests run, 24 passed, 1 skipped because local pyarrow is not installed.

GET-only static check:

~~~
rg -n --glob '*.py' 'request\("(POST|PUT|PATCH|DELETE)|Request\([^\n]*method\s*=\s*"(POST|PUT|PATCH|DELETE)"|\.post\(|\.put\(|\.patch\(|\.delete\(' apps/data-lake/src apps/data-lake/scripts
~~~

Result: no matches.

Terraform formatting and validation:

~~~
terraform fmt -recursive infra/data-lake-refresh
terraform -chdir=infra/data-lake-refresh init -backend=false
terraform -chdir=infra/data-lake-refresh validate
~~~

Result: initialized successfully and validate returned Success, configuration is valid.

## Blocked Verification

Docker image build was not run because this machine has no available container engine.

~~~
command -v docker podman finch nerdctl colima lima
~~~

Result: no matching binary found.

Required completion check once a container engine is available:

~~~
cd apps/data-lake
docker build -t gold-coast-data-lake:$(git rev-parse --short HEAD) .
~~~

## Guardrails Confirmed

- No terraform plan or apply was run.
- No AWS resources were created or modified.
- No live GHL extraction was run.
- No Slack alert or routine Slack message was sent.
- EventBridge schedule defaults to disabled.
- The task security group has no ingress and HTTPS-only egress.
- The runtime design uses public subnets with assignPublicIp=true and no NAT Gateway.
- Secrets are referenced by Secrets Manager ARN placeholders only; no secret values are committed.
- apps/data-lake remains GET-only for GHL access.

## Status

Blocked on Docker build verification. Local app, static safety, and Terraform validation gates passed.
