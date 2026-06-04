#!/usr/bin/env bash
set -euo pipefail

# Gold Coast Home Buyers — break-glass local deploy wrapper.
# Normal deployments run through GitHub Actions. This script intentionally refuses
# to run unless explicitly unlocked for an emergency.
#
# Usage:
#   ALLOW_LOCAL_DEPLOY=1 ./scripts/deploy.sh staging --confirm-local-break-glass
#   ALLOW_LOCAL_DEPLOY=1 ./scripts/deploy.sh prod --confirm-local-break-glass

ENVIRONMENT="${1:-}"
CONFIRMATION="${2:-}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="$PROJECT_ROOT/site"

case "$ENVIRONMENT" in
  staging)
    BUCKET="gcoffers-site-staging"
    CF_DIST="E2MA4HGXAENEX6"
    DOMAIN="staging.gcoffers.com"
    ;;
  prod|production)
    ENVIRONMENT="prod"
    BUCKET="gcoffers-site"
    CF_DIST="E2M3ODBLV2EE62"
    DOMAIN="gcoffers.com"
    ;;
  *)
    echo "Use GitHub Actions for standard deploys." >&2
    echo "Break-glass usage: ALLOW_LOCAL_DEPLOY=1 $0 staging|prod --confirm-local-break-glass" >&2
    exit 64
    ;;
esac

if [[ "${ALLOW_LOCAL_DEPLOY:-}" != "1" || "$CONFIRMATION" != "--confirm-local-break-glass" ]]; then
  echo "Local deploys are disabled by default." >&2
  echo "Use GitHub Actions: Deploy Staging or Deploy Production." >&2
  echo "Break-glass usage: ALLOW_LOCAL_DEPLOY=1 $0 $ENVIRONMENT --confirm-local-break-glass" >&2
  exit 78
fi

cd "$PROJECT_ROOT"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Refusing local deploy from a dirty working tree." >&2
  git status --short >&2
  exit 78
fi

if [[ "$ENVIRONMENT" == "prod" && "$(git branch --show-current)" != "main" ]]; then
  echo "Refusing production deploy from a non-main branch." >&2
  exit 78
fi

bash scripts/deploy/validate-static-site.sh "$SITE_DIR"

echo "========================================="
echo "  BREAK-GLASS local deploy"
echo "  Environment: $ENVIRONMENT"
echo "  Bucket: $BUCKET"
echo "  CloudFront: $CF_DIST"
echo "========================================="

bash scripts/deploy/sync-static-site-with-cache-control.sh "$SITE_DIR" "$BUCKET"

INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "$CF_DIST" \
  --paths "/*" \
  --query "Invalidation.Id" \
  --output text)

echo "Invalidation: $INVALIDATION_ID"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "Site is reachable at https://$DOMAIN (HTTP $HTTP_CODE)"
elif [[ "$ENVIRONMENT" == "staging" && "$HTTP_CODE" == "403" ]]; then
  echo "Staging returned HTTP 403, expected when current IP is not in the staging WAF allowlist."
else
  echo "Site returned HTTP $HTTP_CODE; CloudFront may still be invalidating."
fi
