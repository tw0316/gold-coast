# Slice 7 Evidence: Fargate Infrastructure Skeleton

Source epic: /Users/jarvis/.openclaw/workspace/epics/active/gold-coast-data-lake-recurring-batch-ingestion.md

## Scope

Added the production runtime scaffolding for the scheduled data-lake refresh.

- Added apps/data-lake/Dockerfile.
- Added apps/data-lake/.dockerignore.
- Added infra/data-lake-refresh Terraform for ECR, ECS Fargate, IAM, DynamoDB lock table, CloudWatch logs, security group, and EventBridge Scheduler.
- Added infra/data-lake-refresh/prod.tfvars.example with placeholders only.
- Added docs/ops/data-lake/fargate-refresh-runtime.md.

## Verification Completed

Terraform formatting:

~~~
terraform fmt -check -recursive infra/data-lake-refresh
~~~

Result: passed.

Terraform validation:

~~~
cd infra/data-lake-refresh
terraform init -backend=false
terraform validate
~~~

Result: passed.

## Blocked Verification

Docker image build was not run because Docker is not installed on this machine.

~~~
command -v docker
~~~

Result: no docker binary.

## Guardrails Confirmed

- No terraform apply was run.
- No terraform plan against production tfvars was run.
- No AWS resources were created or modified.
- EventBridge schedule defaults to disabled through schedule_enabled=false.
- The task security group has no ingress and HTTPS-only egress.
- The runtime design uses public subnets with assignPublicIp=true and no NAT Gateway.
- Secrets are referenced by Secrets Manager ARN placeholders only; no secret values are committed.

## Status

Blocked until Docker build verification can run on a machine with Docker.
