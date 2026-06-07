output "ecr_repository_url" {
  description = "ECR repository URL for the Next.js + Payload app image."
  value       = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.app.name
}

output "ecs_service_name" {
  description = "ECS service name."
  value       = aws_ecs_service.app.name
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name."
  value       = aws_lb.app.dns_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution id."
  value       = aws_cloudfront_distribution.app.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name. Use this for pre-cutover smoke tests when aliases/DNS are disabled."
  value       = aws_cloudfront_distribution.app.domain_name
}

output "cloudfront_aliases" {
  description = "Aliases attached to CloudFront. Empty by default because enable_prod_alias=false."
  value       = local.cloudfront_aliases
}

output "dns_cutover_enabled" {
  description = "Whether Route53 alias records are managed by this stack. Defaults false."
  value       = var.enable_dns_cutover
}

output "media_bucket_name" {
  description = "Private Payload media bucket name. Public media delivery must be app-mediated/signed."
  value       = aws_s3_bucket.media.bucket
}

output "form_submissions_bucket_name" {
  description = "Source-of-truth form submission bucket name. Defaults to the legacy referenced goldcoast-leads bucket."
  value       = local.form_submissions_bucket_name
}

output "form_submissions_prefixes" {
  description = "Source-of-truth form submission prefixes granted to the app."
  value       = var.form_submissions_prefixes
}

output "rds_endpoint" {
  description = "RDS Postgres endpoint hostname. Not a secret."
  value       = aws_db_instance.payload.address
}

output "rds_master_secret_arn" {
  description = "RDS-managed master user secret ARN. Treat as sensitive operational metadata."
  value       = aws_db_instance.payload.master_user_secret[0].secret_arn
  sensitive   = true
}

output "app_log_group_name" {
  description = "CloudWatch log group for ECS app logs. Logs must avoid raw PII."
  value       = aws_cloudwatch_log_group.app.name
}

output "route53_record_names" {
  description = "Route53 record names created only when enable_dns_cutover=true."
  value       = keys(aws_route53_record.cloudfront_a)
}
