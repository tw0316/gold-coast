terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# ACM certs must be in us-east-1 for CloudFront
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

locals {
  bucket_name      = var.environment == "prod" ? "gcoffers-site" : "gcoffers-site-staging"
  leads_bucket     = "goldcoast-leads"
  domain_name      = var.environment == "prod" ? var.domain : "staging.${var.domain}"
  is_staging       = var.environment == "staging"
}

# ==========================================================================
# Route 53 Hosted Zone (shared across environments)
# ==========================================================================
resource "aws_route53_zone" "main" {
  count = var.environment == "prod" ? 1 : 0
  name  = var.domain
}

data "aws_route53_zone" "main" {
  count = var.environment == "staging" ? 1 : 0
  name  = var.domain
}

locals {
  zone_id = var.environment == "prod" ? aws_route53_zone.main[0].zone_id : data.aws_route53_zone.main[0].zone_id
}

# ==========================================================================
# ACM Certificate (wildcard)
# ==========================================================================
resource "aws_acm_certificate" "cert" {
  provider          = aws.us_east_1
  domain_name       = var.domain
  subject_alternative_names = ["*.${var.domain}"]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = local.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 300
}

resource "aws_acm_certificate_validation" "cert" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# ==========================================================================
# S3 Bucket — Static Site
# ==========================================================================
resource "aws_s3_bucket" "site" {
  bucket = local.bucket_name
}

resource "aws_s3_bucket_website_configuration" "site" {
  bucket = aws_s3_bucket.site.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket = aws_s3_bucket.site.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOAC"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.site.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.site.arn
          }
        }
      }
    ]
  })
}

# ==========================================================================
# S3 Bucket — Leads (source of truth)
# ==========================================================================
resource "aws_s3_bucket" "leads" {
  count  = var.environment == "prod" ? 1 : 0
  bucket = local.leads_bucket
}

resource "aws_s3_bucket_versioning" "leads" {
  count  = var.environment == "prod" ? 1 : 0
  bucket = aws_s3_bucket.leads[0].id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "leads" {
  count  = var.environment == "prod" ? 1 : 0
  bucket = aws_s3_bucket.leads[0].id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "leads" {
  count  = var.environment == "prod" ? 1 : 0
  bucket = aws_s3_bucket.leads[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ==========================================================================
# CloudFront OAC
# ==========================================================================
resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${local.bucket_name}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ==========================================================================
# WAF (staging IP restriction)
# ==========================================================================
resource "aws_wafv2_ip_set" "home_ip" {
  count              = local.is_staging ? 1 : 0
  provider           = aws.us_east_1
  name               = "gcoffers-staging-allowed-ips"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"
  addresses          = ["${var.home_ip}/32"]
}

resource "aws_wafv2_web_acl" "staging" {
  count    = local.is_staging ? 1 : 0
  provider = aws.us_east_1
  name     = "gcoffers-staging-acl"
  scope    = "CLOUDFRONT"

  default_action {
    block {}
  }

  rule {
    name     = "allow-home-ip"
    priority = 1
    action {
      allow {}
    }
    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.home_ip[0].arn
      }
    }
    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "staging-allow-home-ip"
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "staging-waf"
  }
}

# ==========================================================================
# CloudFront Distribution
# ==========================================================================
resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [local.domain_name]
  price_class         = "PriceClass_100"
  web_acl_id          = local.is_staging ? aws_wafv2_web_acl.staging[0].arn : null

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-site"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  # API Gateway origin (for /api/* paths)
  origin {
    domain_name = replace(aws_apigatewayv2_api.lead_api.api_endpoint, "https://", "")
    origin_id   = "api-gateway"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-site"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  # Route /api/* to API Gateway
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "api-gateway"

    forwarded_values {
      query_string = true
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "https-only"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  # SPA-style: serve index.html for 404s (clean URLs)
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cert.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# ==========================================================================
# Route 53 DNS Record
# ==========================================================================
resource "aws_route53_record" "site" {
  zone_id = local.zone_id
  name    = local.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

# ==========================================================================
# Secrets Manager — GHL API Key
# ==========================================================================
resource "aws_secretsmanager_secret" "ghl_key" {
  count = var.environment == "prod" ? 1 : 0
  name  = "goldcoast/ghl-api-key"
}

resource "aws_secretsmanager_secret_version" "ghl_key" {
  count         = var.environment == "prod" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.ghl_key[0].id
  secret_string = var.ghl_api_key
}

# ==========================================================================
# IAM Role for Lambda
# ==========================================================================
resource "aws_iam_role" "lambda" {
  name = "gcoffers-lambda-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda" {
  name = "gcoffers-lambda-policy-${var.environment}"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "arn:aws:s3:::${local.leads_bucket}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = "arn:aws:secretsmanager:${var.region}:*:secret:goldcoast/ghl-api-key*"
      }
    ]
  })
}

# ==========================================================================
# Lambda Function
# ==========================================================================
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda"
  output_path = "${path.module}/.build/lambda.zip"
}

resource "aws_lambda_function" "lead_handler" {
  filename         = data.archive_file.lambda.output_path
  function_name    = "gcoffers-lead-handler-${var.environment}"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.lambda.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 15
  memory_size      = 256

  environment {
    variables = {
      LEADS_BUCKET    = local.leads_bucket
      GHL_SECRET_NAME = "goldcoast/ghl-api-key"
      ENVIRONMENT     = var.environment
    }
  }
}

# ==========================================================================
# API Gateway (HTTP API)
# ==========================================================================
resource "aws_apigatewayv2_api" "lead_api" {
  name          = "gcoffers-api-${var.environment}"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.environment == "prod" ? ["https://gcoffers.com"] : ["https://staging.gcoffers.com"]
    allow_methods = ["POST", "OPTIONS"]
    allow_headers = ["Content-Type"]
    max_age       = 3600
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.lead_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.lead_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.lead_handler.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "submit_lead" {
  api_id    = aws_apigatewayv2_api.lead_api.id
  route_key = "POST /api/submit-lead"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lead_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.lead_api.execution_arn}/*/*"
}
