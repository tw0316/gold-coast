variable "aws_region" {
  description = "AWS region for regional resources. Existing website infra currently uses us-east-1."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment name. Prod enables safer RDS backup/deletion defaults, but DNS/live cutover still stays disabled unless separately enabled."
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "resource_prefix" {
  description = "Prefix for new Payload-site resources. This stack does not create or rename resources owned by the root legacy static Terraform stack."
  type        = string
  default     = "gcoffers-payload"
}

variable "tags" {
  description = "Additional tags merged into all resources."
  type        = map(string)
  default     = {}
}

variable "domain_name" {
  description = "Primary hosted-zone domain name, used only for references/cutover records when explicitly enabled."
  type        = string
  default     = "gcoffers.com"
}

variable "seller_domain" {
  description = "Seller-facing production alias. Not attached unless enable_prod_alias=true."
  type        = string
  default     = "gcoffers.com"
}

variable "www_domain" {
  description = "www production alias. Not attached unless enable_prod_alias=true."
  type        = string
  default     = "www.gcoffers.com"
}

variable "buyer_domain" {
  description = "Optional buyer/deals production alias. Default is empty because deals.gcoffers.com is not a live production target."
  type        = string
  default     = ""
}

variable "staging_domain" {
  description = "Staging website alias for the Payload runtime. Attach only with enable_staging_alias=true and an approved certificate."
  type        = string
  default     = "staging.gcoffers.com"
}

variable "enable_staging_alias" {
  description = "Attach the staging_domain alias to CloudFront. Use for staging cutover/reconciliation only; DNS records are still controlled by enable_dns_cutover."
  type        = bool
  default     = false
}

variable "additional_cloudfront_aliases" {
  description = "Optional non-production/test aliases. DNS records are still not created unless enable_dns_cutover=true."
  type        = list(string)
  default     = []
}

variable "enable_dns_cutover" {
  description = "Create Route53 alias records pointing at this CloudFront distribution. MUST remain false until explicit cutover approval."
  type        = bool
  default     = false
}

variable "enable_prod_alias" {
  description = "Attach production aliases (gcoffers.com and www.gcoffers.com, plus optional buyer_domain when non-empty) to CloudFront. MUST remain false until explicit cutover approval."
  type        = bool
  default     = false
}

variable "enable_live_alerts" {
  description = "Enable CloudWatch alarm actions and inject live Slack/email alert secrets. MUST remain false for PR validation/default plans."
  type        = bool
  default     = false
}

variable "route53_zone_id" {
  description = "Existing Route53 hosted zone id. Leave empty to look up route53_zone_name only when enable_dns_cutover=true. No hosted zone is created by this stack."
  type        = string
  default     = ""
}

variable "route53_zone_name" {
  description = "Existing hosted zone name for optional DNS cutover data-source lookup."
  type        = string
  default     = "gcoffers.com"
}

variable "cloudfront_acm_certificate_arn" {
  description = "ACM certificate ARN in us-east-1 for CloudFront aliases. Required if any CloudFront aliases are enabled."
  type        = string
  default     = ""
}

variable "alb_certificate_arn" {
  description = "Optional regional ACM certificate ARN for an ALB HTTPS listener. The default stack keeps CloudFront-to-ALB HTTP until a certificate/origin policy is supplied."
  type        = string
  default     = ""
}

variable "cloudfront_origin_protocol_policy" {
  description = "Protocol CloudFront uses to reach the ALB origin. Default http-only works before an ALB certificate/origin name is configured."
  type        = string
  default     = "http-only"

  validation {
    condition     = contains(["http-only", "https-only", "match-viewer"], var.cloudfront_origin_protocol_policy)
    error_message = "cloudfront_origin_protocol_policy must be http-only, https-only, or match-viewer."
  }
}

variable "cloudfront_price_class" {
  description = "CloudFront price class. PriceClass_100 is the low-cost V1 default."
  type        = string
  default     = "PriceClass_100"
}

variable "create_vpc" {
  description = "Create a small dedicated VPC/subnets for the Payload site. Set false and provide existing_* subnet values to reuse an existing VPC."
  type        = bool
  default     = true
}

variable "vpc_cidr" {
  description = "CIDR for the optional dedicated VPC."
  type        = string
  default     = "10.42.0.0/16"
}

variable "availability_zones" {
  description = "Optional AZ override. Defaults to the first two available AZs in aws_region."
  type        = list(string)
  default     = []
}

variable "public_subnet_cidrs" {
  description = "CIDRs for public subnets when create_vpc=true. Use at least two for ALB/RDS subnet groups."
  type        = list(string)
  default     = ["10.42.0.0/24", "10.42.1.0/24"]
}

variable "existing_vpc_id" {
  description = "Existing VPC id when create_vpc=false."
  type        = string
  default     = ""
}

variable "existing_public_subnet_ids" {
  description = "Existing public subnet ids for the ALB when create_vpc=false."
  type        = list(string)
  default     = []
}

variable "app_subnet_ids" {
  description = "Subnets for ECS tasks. Defaults to the public subnets for the no-NAT low-cost design."
  type        = list(string)
  default     = []
}

variable "database_subnet_ids" {
  description = "Subnets for the RDS subnet group. Defaults to app/public subnets with publicly_accessible=false and SG-only ingress."
  type        = list(string)
  default     = []
}

variable "assign_public_ip" {
  description = "Assign public IPs to Fargate tasks. Default true avoids NAT Gateway costs in staging/low-cost V1; ingress is still ALB-only via SG."
  type        = bool
  default     = true
}

variable "allowed_alb_cidr_blocks" {
  description = "CIDR blocks allowed to reach the public ALB. Default is public internet; restrict for staging if desired."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "container_port" {
  description = "Next.js/Payload container port."
  type        = number
  default     = 3000
}

variable "app_image" {
  description = "Immutable app container image URI. If empty, Terraform points at the managed ECR repo with a REPLACE_WITH_IMMUTABLE_TAG placeholder; set ecs_desired_count=0 until a real image exists."
  type        = string
  default     = ""
}

variable "ecs_cpu" {
  description = "Fargate task CPU units. 512 = 0.5 vCPU."
  type        = number
  default     = 512
}

variable "ecs_memory" {
  description = "Fargate task memory MiB."
  type        = number
  default     = 1024
}

variable "ecs_desired_count" {
  description = "Desired ECS task count. Default 0 keeps first infra plans safe until secrets and an immutable app image are supplied; production should set 1+."
  type        = number
  default     = 0
}

variable "ecs_min_capacity" {
  description = "Application autoscaling minimum task count. Production should set at least 1."
  type        = number
  default     = 0
}

variable "ecs_max_capacity" {
  description = "Application autoscaling maximum task count."
  type        = number
  default     = 2
}

variable "enable_service_autoscaling" {
  description = "Enable target-tracking autoscaling for the ECS service."
  type        = bool
  default     = true
}

variable "enable_container_insights" {
  description = "Enable ECS Container Insights. Disabled by default for low-cost V1."
  type        = bool
  default     = false
}

variable "enable_execute_command" {
  description = "Enable ECS Exec for break-glass debugging. Disabled by default; requires IAM/operator controls before production use."
  type        = bool
  default     = false
}

variable "alb_health_check_path" {
  description = "ALB/ECS health check path."
  type        = string
  default     = "/api/health/readiness"
}

variable "health_check_grace_period_seconds" {
  description = "ECS health check grace period after deployments."
  type        = number
  default     = 90
}

variable "app_environment_variables" {
  description = "Additional non-secret environment variables for the app container. Do not place secrets or raw PII here."
  type        = map(string)
  default     = {}
}

variable "app_secret_arns" {
  description = "Additional ECS-injected Secrets Manager ARNs keyed by container environment variable name. Values must be ARNs, not secret values."
  type        = map(string)
  default     = {}
}

variable "database_uri_secret_arn" {
  description = "Optional Secrets Manager ARN containing DATABASE_URI for the current app contract. Leave empty until an operator has created/populated it."
  type        = string
  default     = ""
}

variable "payload_secret_arn" {
  description = "Optional Secrets Manager ARN containing PAYLOAD_SECRET."
  type        = string
  default     = ""
}

variable "ghl_api_key_secret_arn" {
  description = "Optional Secrets Manager ARN containing GHL_API_KEY for best-effort CRM sync."
  type        = string
  default     = ""
}

variable "slack_webhook_secret_arn" {
  description = "Optional Secrets Manager ARN containing SLACK_WEBHOOK_URL. Injected only when enable_live_alerts=true."
  type        = string
  default     = ""
}

variable "internal_alert_email_secret_arn" {
  description = "Optional Secrets Manager ARN/string secret for approved internal email alert configuration. Injected only when enable_live_alerts=true."
  type        = string
  default     = ""
}

variable "secret_kms_key_arns" {
  description = "Optional KMS key ARNs required to decrypt custom-encrypted Secrets Manager values. Leave empty for AWS-managed keys."
  type        = list(string)
  default     = []
}

variable "database_name" {
  description = "Postgres database name for Payload."
  type        = string
  default     = "payload"
}

variable "database_username" {
  description = "Postgres master username. Password is generated/managed by RDS Secrets Manager, not by Terraform variables."
  type        = string
  default     = "payload_admin"
}

variable "rds_engine_version" {
  description = "Postgres engine version."
  type        = string
  default     = "16"
}

variable "rds_instance_class" {
  description = "RDS instance class. db.t4g.micro is the low-cost V1 default."
  type        = string
  default     = "db.t4g.micro"
}

variable "rds_allocated_storage" {
  description = "Initial RDS storage in GiB."
  type        = number
  default     = 20
}

variable "rds_max_allocated_storage" {
  description = "RDS autoscaling storage max in GiB."
  type        = number
  default     = 100
}

variable "rds_backup_retention_days" {
  description = "Automated backup retention days. Null means 7 for prod, 1 for non-prod."
  type        = number
  default     = null
}

variable "rds_deletion_protection" {
  description = "RDS deletion protection. Null means true for prod, false for non-prod."
  type        = bool
  default     = null
}

variable "rds_skip_final_snapshot" {
  description = "Skip final snapshot on RDS deletion. Null means false for prod, true for non-prod."
  type        = bool
  default     = null
}

variable "rds_final_snapshot_identifier" {
  description = "Final snapshot identifier if final snapshots are enabled."
  type        = string
  default     = ""
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ RDS. False is the low-cost V1 default; revisit before high-traffic production."
  type        = bool
  default     = false
}

variable "media_bucket_name" {
  description = "Optional exact S3 bucket name for private Payload media. Defaults to prefix/env plus a random suffix."
  type        = string
  default     = ""
}

variable "media_force_destroy" {
  description = "Allow Terraform to delete non-empty media bucket. Keep false for production safety."
  type        = bool
  default     = false
}

variable "media_noncurrent_version_expiration_days" {
  description = "Days to retain noncurrent media object versions."
  type        = number
  default     = 90
}

variable "create_form_submissions_bucket" {
  description = "Create a successor form-submission source-of-truth bucket. Default false references the existing goldcoast-leads bucket owned by legacy infra."
  type        = bool
  default     = false
}

variable "form_submissions_bucket_name" {
  description = "Existing or successor source-of-truth bucket for seller/buyer/deal-interest JSON. Default references legacy goldcoast-leads; this stack does not create it unless create_form_submissions_bucket=true."
  type        = string
  default     = "goldcoast-leads"
}

variable "form_submissions_prefixes" {
  description = "Allowed S3 prefixes for source-of-truth form JSON writes."
  type        = list(string)
  default     = ["seller-leads/", "buyer-signups/", "deal-interest/"]
}

variable "log_retention_days" {
  description = "CloudWatch app log retention. Null means 30 days for prod, 14 for non-prod."
  type        = number
  default     = null
}

variable "metrics_namespace" {
  description = "CloudWatch namespace for app-emitted custom metrics and log metric filters."
  type        = string
  default     = "Gcoffers/PayloadSite"
}

variable "alarm_action_arns" {
  description = "SNS topic/action ARNs for live alarms. Ignored unless enable_live_alerts=true."
  type        = list(string)
  default     = []
}
