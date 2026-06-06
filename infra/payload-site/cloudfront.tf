resource "terraform_data" "cutover_guards" {
  input = {
    enable_dns_cutover = var.enable_dns_cutover
    enable_prod_alias  = var.enable_prod_alias
    aliases            = local.cloudfront_aliases
  }

  lifecycle {
    precondition {
      condition     = length(local.cloudfront_aliases) == 0 || var.cloudfront_acm_certificate_arn != ""
      error_message = "cloudfront_acm_certificate_arn (us-east-1) is required before attaching CloudFront aliases."
    }

    precondition {
      condition     = !var.enable_dns_cutover || length(local.cloudfront_aliases) > 0
      error_message = "enable_dns_cutover=true requires at least one CloudFront alias."
    }

    precondition {
      condition     = !contains(["https-only", "match-viewer"], var.cloudfront_origin_protocol_policy) || var.alb_certificate_arn != ""
      error_message = "CloudFront HTTPS/match-viewer origin policy requires alb_certificate_arn for the ALB HTTPS listener."
    }
  }
}

resource "aws_cloudfront_cache_policy" "public_pages" {
  name        = "${local.name}-public-pages"
  comment     = "Short public page cache; Host is part of cache key for seller vs buyer host rendering."
  default_ttl = 60
  min_ttl     = 0
  max_ttl     = 300

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Host"]
      }
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "${local.name}-static-assets"
  comment     = "Long cache for immutable Next/static assets."
  default_ttl = 86400
  min_ttl     = 0
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_cache_policy" "no_cache" {
  name        = "${local.name}-no-cache"
  comment     = "No cache for admin/auth/session/forms/health/draft/preview/media-sensitive routes."
  default_ttl = 0
  min_ttl     = 0
  max_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_origin_request_policy" "public_host" {
  name    = "${local.name}-public-host"
  comment = "Forward Host to ALB so the app can render seller vs buyer domains."

  cookies_config {
    cookie_behavior = "none"
  }

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = ["Host"]
    }
  }

  query_strings_config {
    query_string_behavior = "none"
  }
}

resource "aws_cloudfront_origin_request_policy" "no_cache_all_viewer" {
  name    = "${local.name}-no-cache-all-viewer"
  comment = "Forward all viewer values for no-cache admin, auth/session, form POST, health, draft/preview routes."

  cookies_config {
    cookie_behavior = "all"
  }

  headers_config {
    header_behavior = "allViewer"
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}

resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "${local.name}-security"
  comment = "Baseline security headers for Payload/Next public edge."

  security_headers_config {
    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "SAMEORIGIN"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = false
      override                   = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
  }
}

resource "aws_cloudfront_distribution" "app" {
  enabled         = true
  is_ipv6_enabled = true
  price_class     = var.cloudfront_price_class
  aliases         = local.cloudfront_aliases
  comment         = "gcoffers Payload CMS whole-site app (${var.environment})"
  http_version    = "http2and3"

  origin {
    domain_name = aws_lb.app.dns_name
    origin_id   = "alb-payload-app"

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = var.cloudfront_origin_protocol_policy
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_keepalive_timeout = 10
      origin_read_timeout      = 60
    }
  }

  default_cache_behavior {
    target_origin_id           = "alb-payload-app"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    cache_policy_id            = aws_cloudfront_cache_policy.public_pages.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.public_host.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
    compress                   = true
  }

  dynamic "ordered_cache_behavior" {
    for_each = local.no_cache_path_patterns

    content {
      path_pattern               = ordered_cache_behavior.value
      target_origin_id           = "alb-payload-app"
      viewer_protocol_policy     = "https-only"
      allowed_methods            = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods             = ["GET", "HEAD"]
      cache_policy_id            = aws_cloudfront_cache_policy.no_cache.id
      origin_request_policy_id   = aws_cloudfront_origin_request_policy.no_cache_all_viewer.id
      response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
      compress                   = true
    }
  }

  dynamic "ordered_cache_behavior" {
    for_each = local.static_cache_path_patterns

    content {
      path_pattern               = ordered_cache_behavior.value
      target_origin_id           = "alb-payload-app"
      viewer_protocol_policy     = "https-only"
      allowed_methods            = ["GET", "HEAD", "OPTIONS"]
      cached_methods             = ["GET", "HEAD"]
      cache_policy_id            = aws_cloudfront_cache_policy.static_assets.id
      origin_request_policy_id   = aws_cloudfront_origin_request_policy.public_host.id
      response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
      compress                   = true
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  dynamic "viewer_certificate" {
    for_each = length(local.cloudfront_aliases) > 0 ? [1] : []

    content {
      acm_certificate_arn      = var.cloudfront_acm_certificate_arn
      ssl_support_method       = "sni-only"
      minimum_protocol_version = "TLSv1.2_2021"
    }
  }

  dynamic "viewer_certificate" {
    for_each = length(local.cloudfront_aliases) == 0 ? [1] : []

    content {
      cloudfront_default_certificate = true
    }
  }

  wait_for_deployment = false

  tags = {
    Name = local.name
  }

  depends_on = [terraform_data.cutover_guards]
}
