data "aws_route53_zone" "selected" {
  count = var.enable_dns_cutover && var.route53_zone_id == "" ? 1 : 0

  name         = var.route53_zone_name
  private_zone = false
}

locals {
  selected_route53_zone_id = var.route53_zone_id != "" ? var.route53_zone_id : try(data.aws_route53_zone.selected[0].zone_id, "")
}

# DNS records are cutover-only and default to disabled. This stack never creates
# a hosted zone, avoiding duplicate ownership with the root legacy static Terraform stack.
resource "aws_route53_record" "cloudfront_a" {
  for_each = var.enable_dns_cutover ? toset(local.cloudfront_aliases) : toset([])

  zone_id = local.selected_route53_zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.app.domain_name
    zone_id                = aws_cloudfront_distribution.app.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "cloudfront_aaaa" {
  for_each = var.enable_dns_cutover ? toset(local.cloudfront_aliases) : toset([])

  zone_id = local.selected_route53_zone_id
  name    = each.value
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.app.domain_name
    zone_id                = aws_cloudfront_distribution.app.hosted_zone_id
    evaluate_target_health = false
  }
}
