#!/usr/bin/env bash
set -euo pipefail

# Gold Coast Home Buyers — Deploy Script
# Usage: ./scripts/deploy.sh [staging|prod]

ENV="${1:-staging}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="$PROJECT_ROOT/site"

# Environment config
if [[ "$ENV" == "staging" ]]; then
  BUCKET="gcoffers-site-staging"
  CF_DIST="E2MA4HGXAENEX6"
  DOMAIN="staging.gcoffers.com"
elif [[ "$ENV" == "prod" ]]; then
  BUCKET="gcoffers-site"
  CF_DIST="E2M3ODBLV2EE62"
  DOMAIN="gcoffers.com"
else
  echo "Usage: $0 [staging|prod]"
  exit 1
fi

echo "========================================="
echo "  Deploying Gold Coast Home Buyers"
echo "  Environment: $ENV"
echo "  Bucket: $BUCKET"
echo "  CloudFront: $CF_DIST"
echo "========================================="

# Step 1: Upload to S3
echo ""
echo "→ Step 1: Uploading site to S3..."
aws s3 sync "$SITE_DIR" "s3://$BUCKET" \
  --delete \
  --cache-control "public, max-age=3600" \
  --exclude "*.DS_Store"

# Step 2: Set longer cache for static assets
echo ""
echo "→ Step 2: Setting asset cache headers..."
aws s3 cp "s3://$BUCKET/css/" "s3://$BUCKET/css/" \
  --recursive \
  --cache-control "public, max-age=31536000, immutable" \
  --content-type "text/css" \
  --metadata-directive REPLACE

aws s3 cp "s3://$BUCKET/js/" "s3://$BUCKET/js/" \
  --recursive \
  --cache-control "public, max-age=31536000, immutable" \
  --content-type "application/javascript" \
  --metadata-directive REPLACE

# Step 3: Invalidate CloudFront
echo ""
echo "→ Step 3: Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "$CF_DIST" \
  --paths "/*" \
  --query "Invalidation.Id" \
  --output text)
echo "  Invalidation: $INVALIDATION_ID"

# Step 4: Smoke test
echo ""
echo "→ Step 4: Smoke test..."
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "✅ Site is live at https://$DOMAIN (HTTP $HTTP_CODE)"
else
  echo "⚠️  Site returned HTTP $HTTP_CODE — may need a few minutes for cache invalidation"
fi

echo ""
echo "========================================="
echo "  Deploy complete!"
echo "  URL: https://$DOMAIN"
echo "========================================="
