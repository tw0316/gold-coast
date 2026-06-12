output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.site.id
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.site.domain_name
}

output "site_bucket" {
  value = aws_s3_bucket.site.bucket
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.lead_api.api_endpoint
}

output "nameservers" {
  value = var.environment == "prod" ? aws_route53_zone.main[0].name_servers : []
}

output "domain" {
  value = local.domain_name
}
