# Gold Coast Data Lake Fargate Refresh Runtime

## Scope

This is the checked-in runtime skeleton for the production GHL batch refresh.

It defines:

- Docker packaging for apps/data-lake
- ECR repository with immutable tags
- ECS Fargate cluster and task definition
- separate disabled ECS task definition for downstream GHL call transcription
- CloudWatch log group
- DynamoDB 45-minute TTL lock table
- least-privilege task/task-execution/scheduler IAM roles
- HTTPS-only egress security group with no inbound rules
- EventBridge Scheduler rate(1 hour), disabled by default until V1.1 manual validation passes
- separate transcription EventBridge schedule, disabled by default until sample/backfill acceptance and explicit approval

It does not apply AWS changes by itself. Do not enable the schedule until manual production run evidence passes.

## Build Image

Docker is required on the operator machine.

~~~
cd apps/data-lake
docker build --platform linux/arm64 -t gold-coast-data-lake:$(git rev-parse --short HEAD) .
~~~

Push only after the ECR repository exists:

~~~
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag gold-coast-data-lake:$(git rev-parse --short HEAD) \
  <ecr-repo-url>:$(git rev-parse --short HEAD)
docker push <ecr-repo-url>:$(git rev-parse --short HEAD)
~~~

## Terraform Review

Use the example tfvars as a template. Never put secret values in tfvars; use Secrets Manager ARNs.

~~~
cd infra/data-lake-refresh
cp prod.tfvars.example prod.tfvars
terraform init
terraform fmt -check
terraform validate
terraform plan -var-file=prod.tfvars
~~~

The default schedule_enabled=false keeps the EventBridge schedule disabled after apply. The V1.1 schedule expression is rate(1 hour). Flip schedule_enabled only after the manual AWS run and V1.1 smoke/duplicate checks pass.

## Runtime Notes

- Fargate uses public subnets with assignPublicIp enabled.
- The task definition uses ARM64 by default, matching Apple Silicon local builds. If this changes to X86_64, build and push an X86_64 image tag as well.
- The task security group has no ingress and egress only on TCP 443.
- No NAT Gateway is required.
- GHL credentials are injected as GHL_API_KEY and GHL_LOCATION_ID from Secrets Manager.
- The runner also supports GHL_ENV_FILE for local operator runs, but Fargate uses injected env vars.
- `LOCK_TABLE_NAME` is injected from Terraform and enables the DynamoDB conditional TTL lock before production work begins.
- Production non-dry-run tasks run the GET-only raw refresh, then build V1.1 core/reporting Parquet tables from the fresh manifest and update Glue tables.
- Core query tables live in gold_coast. Reporting marts live in gold_coast_reporting.
- Execute-mode Fargate runs upload immutable run status and sanitized JSONL logs under `run-status/ghl/` in the data lake bucket. Historical Athena rows read only `run-status/ghl/runs/`; pointer files stay outside that table location.
- Terraform injects `IMAGE_TAG=<immutable image tag>` into the task definition. The CLI reads it through `--image-tag` and writes it to the top-level run-status `image_tag` field.
- `CLOUDWATCH_LOG_URL` remains the supported env var for the run's CloudWatch log stream link. The runner writes it to the top-level run-status `cloudwatch_log_url` field.
- Slack webhook injection uses `SLACK_WEBHOOK_URL` from Secrets Manager. The secret ARN must point to the reusable Gold Coast tech-alerts webhook for Slack channel `C0B4JTC5VPF`; never place the webhook URL in tfvars, docs, logs, or status files.
- `ALERT_MODE=failure-only` is the deployed default and posts failures only.
- `ALERT_MODE=launch-window` posts failures always and successful runs only until `SUCCESS_ALERT_UNTIL=<UTC ISO timestamp>`. Terraform rejects launch-window mode without that timestamp so success alerts cannot continue forever by accident.
- `ALERT_MODE=success-and-failure` is available for bounded operator testing only. Do not leave it enabled for routine production refreshes.
- The container entrypoint is python -m gold_coast_data_lake.jobs.ghl_batch_refresh.
- The transcription task reuses the same image but overrides the ECS entry point to `python -m gold_coast_data_lake.jobs.ghl_call_transcription`.
- The transcription schedule is controlled by `transcription_schedule_enabled`, separate from the core `schedule_enabled` refresh flag.
- The transcription task uses separate IAM roles and a separate DynamoDB lock name, `ghl-call-transcription`.
- The OpenAI transcription secret ARN is optional while the transcription schedule is disabled and must never contain the secret value.

## Rollback

- Keep image tags immutable and use git SHA tags.
- Roll back by registering/deploying the previous ECS task definition or previous image tag.
- If scheduled runs misbehave, set schedule_enabled=false and apply, or disable the EventBridge schedule in AWS while preserving the last successful V1.1 output and old snapshot data.
- If transcription misbehaves, set `transcription_schedule_enabled=false` or disable only the transcription EventBridge schedule. Do not disable the core refresh schedule unless the core refresh itself is affected.
