data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  name = lower(replace("${var.resource_prefix}-${var.environment}", "_", "-"))

  common_tags = merge(
    {
      Project   = "gcoffers-payload-cms"
      Component = "payload-site"
      Slice     = "slice-7-aws-infra"
      Env       = var.environment
      ManagedBy = "terraform"
    },
    var.tags,
  )

  azs = length(var.availability_zones) > 0 ? var.availability_zones : slice(data.aws_availability_zones.available.names, 0, min(2, length(data.aws_availability_zones.available.names)))

  prod_cloudfront_aliases = var.enable_prod_alias ? compact([
    var.seller_domain,
    var.www_domain,
    var.buyer_domain,
  ]) : []

  staging_cloudfront_aliases = var.enable_staging_alias ? compact([
    var.staging_domain,
  ]) : []

  cloudfront_aliases = distinct(concat(local.prod_cloudfront_aliases, local.staging_cloudfront_aliases, var.additional_cloudfront_aliases))
  primary_public_url = length(local.cloudfront_aliases) > 0 ? "https://${local.cloudfront_aliases[0]}" : ""

  rds_backup_retention_days = coalesce(var.rds_backup_retention_days, var.environment == "prod" ? 7 : 1)
  rds_deletion_protection   = coalesce(var.rds_deletion_protection, var.environment == "prod")
  rds_skip_final_snapshot   = coalesce(var.rds_skip_final_snapshot, var.environment != "prod")
  log_retention_days        = coalesce(var.log_retention_days, var.environment == "prod" ? 30 : 14)

  vpc_id              = var.create_vpc ? aws_vpc.this[0].id : var.existing_vpc_id
  public_subnet_ids   = var.create_vpc ? aws_subnet.public[*].id : var.existing_public_subnet_ids
  app_subnet_ids      = length(var.app_subnet_ids) > 0 ? var.app_subnet_ids : local.public_subnet_ids
  database_subnet_ids = length(var.database_subnet_ids) > 0 ? var.database_subnet_ids : local.app_subnet_ids

  media_bucket_name            = var.media_bucket_name != "" ? var.media_bucket_name : "${local.name}-media-${random_id.media_bucket_suffix.hex}"
  form_submissions_bucket_name = var.form_submissions_bucket_name
  form_submission_object_arns  = [for prefix in var.form_submissions_prefixes : "arn:aws:s3:::${local.form_submissions_bucket_name}/${prefix}*"]

  app_image = var.app_image != "" ? var.app_image : "${aws_ecr_repository.app.repository_url}:REPLACE_WITH_IMMUTABLE_TAG"

  public_url_environment = local.primary_public_url != "" ? {
    NEXT_PUBLIC_SITE_URL       = local.primary_public_url
    PAYLOAD_PUBLIC_SERVER_URL  = local.primary_public_url
    NEXT_PUBLIC_SELLER_DOMAIN  = var.seller_domain
    NEXT_PUBLIC_BUYER_DOMAIN   = var.buyer_domain
    NEXT_PUBLIC_ENABLE_ALIASES = tostring(var.enable_prod_alias)
  } : {}

  base_environment = {
    AWS_REGION                = var.aws_region
    NODE_ENV                  = "production"
    HOSTNAME                  = "0.0.0.0"
    PORT                      = tostring(var.container_port)
    PAYLOAD_MEDIA_BUCKET      = aws_s3_bucket.media.bucket
    FORM_SUBMISSIONS_BUCKET   = local.form_submissions_bucket_name
    FORM_SUBMISSIONS_PREFIXES = join(",", var.form_submissions_prefixes)
    ENABLE_LIVE_ALERTS        = tostring(var.enable_live_alerts)
    RDS_HOST                  = aws_db_instance.payload.address
    RDS_PORT                  = tostring(aws_db_instance.payload.port)
    RDS_DATABASE              = var.database_name
    RDS_USERNAME              = var.database_username
    RDS_MASTER_SECRET_ARN     = aws_db_instance.payload.master_user_secret[0].secret_arn
  }

  ecs_environment = merge(local.base_environment, local.public_url_environment, var.app_environment_variables)

  named_secret_arns = merge(
    var.database_uri_secret_arn != "" ? { DATABASE_URI = var.database_uri_secret_arn } : {},
    var.payload_secret_arn != "" ? { PAYLOAD_SECRET = var.payload_secret_arn } : {},
    var.ghl_api_key_secret_arn != "" ? { GHL_API_KEY = var.ghl_api_key_secret_arn } : {},
    var.enable_live_alerts && var.slack_webhook_secret_arn != "" ? { SLACK_WEBHOOK_URL = var.slack_webhook_secret_arn } : {},
    var.enable_live_alerts && var.internal_alert_email_secret_arn != "" ? { INTERNAL_ALERT_EMAIL = var.internal_alert_email_secret_arn } : {},
  )

  ecs_secret_arns          = merge(local.named_secret_arns, var.app_secret_arns)
  ecs_injected_secret_arns = values(local.ecs_secret_arns)
  task_secret_read_arns    = distinct(compact(concat(local.ecs_injected_secret_arns, [aws_db_instance.payload.master_user_secret[0].secret_arn])))

  alarm_actions = var.enable_live_alerts ? var.alarm_action_arns : []

  no_cache_path_patterns = [
    "/admin*",
    "/api/*",
    "/payload*",
    "/preview*",
    "/draft*",
    "/_next/data/*",
    "/media/private/*",
  ]

  static_cache_path_patterns = [
    "/_next/static/*",
    "/assets/*",
    "/favicon.ico",
  ]
}
