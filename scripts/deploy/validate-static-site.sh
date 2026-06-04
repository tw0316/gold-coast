#!/usr/bin/env bash
set -euo pipefail

SITE_DIR="${1:-site}"

if [[ ! -d "$SITE_DIR" ]]; then
  echo "::error::Static site directory not found: $SITE_DIR" >&2
  exit 66
fi

required_files=(
  "index.html"
  "deals/index.html"
  "about/index.html"
  "privacy-policy/index.html"
  "terms/index.html"
  "css/styles.css"
  "js/main.js"
  "assets/favicon.ico"
)

missing=0
for rel_path in "${required_files[@]}"; do
  if [[ ! -s "$SITE_DIR/$rel_path" ]]; then
    echo "::error::Missing or empty required site file: $SITE_DIR/$rel_path" >&2
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  exit 66
fi

if find "$SITE_DIR" -name ".DS_Store" -print -quit | grep -q .; then
  echo "::error::.DS_Store files must not be deployed." >&2
  find "$SITE_DIR" -name ".DS_Store" -print >&2
  exit 65
fi

if grep -R -I -n --exclude-dir=.git --exclude="*.jpg" --exclude="*.png" --exclude="*.ico" --exclude="*.ttf" '/Users/' "$SITE_DIR" >/tmp/gold-coast-static-absolute-paths.txt; then
  echo "::error::Static site contains local absolute paths." >&2
  cat /tmp/gold-coast-static-absolute-paths.txt >&2
  exit 65
fi

if ! grep -R -I -n --exclude="*.jpg" --exclude="*.png" --exclude="*.ico" --exclude="*.ttf" '/api/submit-lead' "$SITE_DIR" >/tmp/gold-coast-static-seller-api.txt; then
  echo "::error::No relative seller lead API endpoint reference found in static site." >&2
  exit 65
fi

if ! grep -R -I -n --exclude="*.jpg" --exclude="*.png" --exclude="*.ico" --exclude="*.ttf" '/api/buyer-signup' "$SITE_DIR" >/tmp/gold-coast-static-buyer-api.txt; then
  echo "::error::No relative buyer signup API endpoint reference found in static site." >&2
  exit 65
fi

if grep -R -I -n --exclude="*.jpg" --exclude="*.png" --exclude="*.ico" --exclude="*.ttf" 'execute-api' "$SITE_DIR" >/tmp/gold-coast-static-direct-api.txt; then
  echo "::error::Static site must use same-origin /api/* endpoints, not direct API Gateway URLs." >&2
  cat /tmp/gold-coast-static-direct-api.txt >&2
  exit 65
fi

if grep -R -I -n --exclude="*.jpg" --exclude="*.png" --exclude="*.ico" --exclude="*.ttf" 'TweaksPanel\|useTweaks\|TweakSection' "$SITE_DIR" >/tmp/gold-coast-static-tweaks.txt; then
  echo "::error::Static site contains prototype tweak controls." >&2
  cat /tmp/gold-coast-static-tweaks.txt >&2
  exit 65
fi

if grep -R -I -n --exclude="*.jpg" --exclude="*.png" --exclude="*.ico" --exclude="*.ttf" 'serviceConsent" type="checkbox" checked\|serviceConsent" checked\|service-consent"[^>]*checked\|buyer-service-consent"[^>]*checked' "$SITE_DIR" >/tmp/gold-coast-static-prechecked-consent.txt; then
  echo "::error::Service consent checkboxes must not be pre-checked." >&2
  cat /tmp/gold-coast-static-prechecked-consent.txt >&2
  exit 65
fi

echo "Static site validation passed for $SITE_DIR."
