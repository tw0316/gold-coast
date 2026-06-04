#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 || -z "${1:-}" || -z "${2:-}" ]]; then
  echo "Usage: $0 <site-dir> <s3-bucket>" >&2
  exit 64
fi

SITE_DIR="$1"
BUCKET="$2"
DEST="s3://${BUCKET}"

if [[ ! -d "$SITE_DIR" ]]; then
  echo "Static site directory not found: $SITE_DIR" >&2
  exit 66
fi

# Sync removes deleted files and uploads changed files. A follow-up cp pass rewrites
# metadata even for unchanged files, which matters when cache policy changes.
aws s3 sync "$SITE_DIR" "$DEST" \
  --delete \
  --cache-control "public,max-age=0,must-revalidate" \
  --exclude ".DS_Store" \
  --exclude "*.git*"

aws s3 cp "$SITE_DIR" "$DEST" \
  --recursive \
  --metadata-directive REPLACE \
  --cache-control "public,max-age=0,must-revalidate" \
  --exclude ".DS_Store" \
  --exclude "*.git*"

# Public image assets can cache a bit longer. They are still invalidated through
# CloudFront on every deploy, so rollbacks and replacements are safe.
if [[ -d "$SITE_DIR/assets" ]]; then
  aws s3 cp "$SITE_DIR/assets" "$DEST/assets" \
    --recursive \
    --metadata-directive REPLACE \
    --cache-control "public,max-age=86400" \
    --exclude ".DS_Store"
fi
