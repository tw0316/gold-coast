# Gold Coast Data Lake Fargate Refresh Runtime

## Scope

This is the checked-in runtime skeleton for the production GHL batch refresh.

It defines:

- Docker packaging for apps/data-lake
- ECR repository with immutable tags
- ECS Fargate cluster and task definition
- CloudWatch log group
- DynamoDB 45-minute TTL lock table
- least-privilege task/task-execution/scheduler IAM roles
- HTTPS-only egress security group with no inbound rules
- EventBridge Scheduler rate(30 minutes), disabled by default

It does not apply AWS changes by itself. Do not enable the schedule until manual production run evidence passes.

## Build Image

Docker is required on the operator machine.

~~~
cd apps/data-lake
docker build -t gold-coast-data-lake:$(git rev-parse --short HEAD) .
~~~

Push only after the ECR repository exists:

~~~
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag gold-coast-data-lake:$(git rev-parse --short HEAD) <ecr-repo-url>:$(git rev-parse --short HEAD)
docker push <ecr-repo-url>:$(git rev-parse --short HEAD)
~~~

## Terraform Review

Use the example tfvars as a template. Never put secret values in tfvars; use Secrets Manager ARNs.

~~~
cd infra/data-lake
cp prod.tfvars.example prod.tfvars
terraform init
terraform fmt -check
terraform validate
terraform plan -var-file=prod.tfvars
~~~

The default schedule_enabled=false keeps the EventBridge schedule disabled after apply. Flip it only after the manual AWS run and alert/smoke-check slices pass.

## Runtime Notes

- Fargate uses public subnets with assignPublicIp enabled.
- The task security group has no ingress and egress only on TCP 443.
- No NAT Gateway is required.
- GHL credentials are injected as GHL_API_KEY and GHL_LOCATION_ID from Secrets Manager.
- Slack webhook injection is optional in this slice; alert behavior is owned by the alert slice.
- The container entrypoint is python -m gold_coast_data_lake.jobs.ghl_batch_refresh.

## Rollback

- Keep image tags immutable and use git SHA tags.
- Roll back by registering/deploying the previous ECS task definition or previous image tag.
- If scheduled runs misbehave, set schedule_enabled=false and apply, or disable the EventBridge schedule in AWS while preserving the last successful curated partitions.
