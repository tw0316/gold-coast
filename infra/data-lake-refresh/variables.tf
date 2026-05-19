variable "region" {
  description = "AWS region for data-lake refresh runtime."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "prod"
}

variable "data_lake_bucket" {
  description = "Existing source-agnostic Gold Coast data lake bucket."
  type        = string
  default     = "gcoffers-data-lake"
}

variable "glue_database" {
  description = "Existing Glue database for curated tables."
  type        = string
  default     = "gold_coast"
}

variable "athena_workgroup" {
  description = "Existing Athena workgroup."
  type        = string
  default     = "gold_coast_data_lake"
}

variable "vpc_id" {
  description = "VPC where the Fargate task runs."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for Fargate with assignPublicIp enabled. No NAT Gateway required."
  type        = list(string)
}

variable "ghl_api_key_secret_arn" {
  description = "Secrets Manager secret ARN containing the GHL API key value."
  type        = string
  sensitive   = true
}

variable "ghl_location_id_secret_arn" {
  description = "Secrets Manager secret ARN containing the GHL location ID value."
  type        = string
  sensitive   = true
}

variable "slack_webhook_secret_arn" {
  description = "Optional Secrets Manager secret ARN for the Gold Coast tech-alerts Slack webhook."
  type        = string
  default     = null
  sensitive   = true
}

variable "image_tag" {
  description = "Immutable container image tag, normally the git SHA."
  type        = string
}

variable "task_cpu" {
  description = "Fargate task CPU units."
  type        = number
  default     = 256
}

variable "task_memory" {
  description = "Fargate task memory MiB."
  type        = number
  default     = 1024
}

variable "log_retention_days" {
  description = "CloudWatch log retention."
  type        = number
  default     = 30
}

variable "schedule_enabled" {
  description = "Enable the 30-minute EventBridge schedule. Keep false until manual run evidence passes."
  type        = bool
  default     = false
}
