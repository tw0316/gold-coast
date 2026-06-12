# slice-1-preflight-adr evidence

Status: completed  
Workspace: `/Users/jarvis/LocalRepos/gold-coast-gcoffers-payload-cms`  
Slice: `slice-1-preflight-adr` — Preflight inventory and architecture ADR

## Commands / tool actions run

Evidence was created early, then updated after inventory and verification.

Terminal commands run:

```bash
git -C /Users/jarvis/LocalRepos/gold-coast-gcoffers-payload-cms status --short
```

```bash
python3 - <<'PY'
from pathlib import Path
root=Path('/Users/jarvis/LocalRepos/gold-coast-gcoffers-payload-cms')
for name in ['package.json','pnpm-workspace.yaml','yarn.lock','package-lock.json','pnpm-lock.yaml','turbo.json','tsconfig.json','eslint.config.js','.eslintrc','.eslintrc.json','.prettierrc','prettier.config.js']:
    print(f'{name}: {"present" if (root/name).exists() else "absent"}')
PY
```

```bash
# Focused quality-review verification after ADR update.
python3 - <<'PY'
from pathlib import Path
root = Path('/Users/jarvis/LocalRepos/gold-coast-gcoffers-payload-cms')
adr = root / 'docs/architecture/gcoffers-payload-cms-adr.md'
text = adr.read_text()
checks = {
    'public_form_abuse_controls': ['rate limiting', 'request size limits', '32 KiB', 'honeypot', 'idempotency', 'dedup'],
    'low_cost_networking_guardrails': ['assign_public_ip = true', 'public subnets', 'ALB security group', 'private subnets', 'NAT Gateway', 'VPC endpoints'],
    'ghl_contract_details': ['buyer-list', 'deals-website', 'interested-{dealSlug}', 'Expressed interest in {dealSlug} on {submittedAt}'],
    'buyer_success_after_s3_only': ['legacy prototype behavior', 'success only after', 'S3 persistence'],
    'source_and_sizing_caveats': ['apps/deals/js/deals.js', 'Payload admin smoke', 'memory pressure'],
}
for name, terms in checks.items():
    missing = [term for term in terms if term not in text]
    if missing:
        raise SystemExit(f'FAIL {name}: missing {missing}')
    print(f'PASS {name}: {len(terms)} terms present')
print(f'PASS file_exists: {adr.relative_to(root)}')
PY

git -C /Users/jarvis/LocalRepos/gold-coast-gcoffers-payload-cms status --short --untracked-files=all -- \
  docs/architecture/gcoffers-payload-cms-adr.md \
  .jks/gcoffers-payload-cms/slice-1-preflight-adr-evidence.md
```

Output:

```text
PASS public_form_abuse_controls: 6 terms present
PASS low_cost_networking_guardrails: 6 terms present
PASS ghl_contract_details: 4 terms present
PASS buyer_success_after_s3_only: 3 terms present
PASS source_and_sizing_caveats: 3 terms present
PASS file_exists: docs/architecture/gcoffers-payload-cms-adr.md
?? .jks/gcoffers-payload-cms/slice-1-preflight-adr-evidence.md
?? docs/architecture/gcoffers-payload-cms-adr.md
```

```bash
git -C /Users/jarvis/LocalRepos/gold-coast-gcoffers-payload-cms diff --name-only -- .
git -C /Users/jarvis/LocalRepos/gold-coast-gcoffers-payload-cms status --short --untracked-files=all -- \
  .jks/gcoffers-payload-cms/slice-1-preflight-adr-evidence.md \
  docs/architecture/gcoffers-payload-cms-adr.md
git -C /Users/jarvis/LocalRepos/gold-coast-gcoffers-payload-cms status --short --untracked-files=all -- .jks/gcoffers-payload-cms
```

```bash
# Safety scan counted email-like / phone-like strings without printing any matches.
# The scan was implemented with a local Python regex script; regex source is omitted here
# so the evidence file does not create a false positive for the scan itself.
```

Bounded tool actions run:

- `write_file` created this evidence artifact early.
- `search_files(target="files")` with explicit paths and caps for:
  - root package/workspace config discovery (`package.json`, lockfiles, workspace/turbo/tsconfig/eslint/prettier files)
  - `apps/website`
  - `apps/deals`
  - `services/lead-handler`
  - `infra/website`
  - `docs` markdown listing
  - `scripts` listing (file names only; no script contents read)
- `search_files(target="content")` with explicit paths/caps for form/API/legal/route references in `apps/website`, `apps/deals`, and `services/lead-handler`.
- `read_file` for the source epic, required product/ops docs, key app pages/scripts, Lambda handlers, package files, and Terraform files listed below.
- `write_file` wrote the ADR at `docs/architecture/gcoffers-payload-cms-adr.md`.
- `read_file` read back the ADR/evidence for verification context.
- Quality-review follow-up used `read_file`/`search_files` for context, `patch` for the allowed ADR/evidence updates, and `terminal` for the focused verification command/output recorded above.

## Files read or inventoried

### Source and required docs

- `/Users/jarvis/LocalRepos/gold-coast/epics/active/gcoffers-payload-cms-whole-site.md`
- `docs/product/deals-prd.md`
- `docs/ops/website-standards.md`

### Seller site inventory

Files read:

- `apps/website/index.html`
- `apps/website/get-your-offer/index.html`
- `apps/website/js/main.js`

Files inventoried by bounded file listing/content search:

- `apps/website/privacy-policy/index.html`
- `apps/website/terms/index.html`
- `apps/website/css/styles.css`
- `apps/website/assets/favicon.ico`
- `apps/website/assets/hero-home.png`
- `apps/website/assets/hero-home.svg`
- `apps/website/assets/logo-goldcoast.png`
- `apps/website/assets/og-image.jpg`

### Buyer/deals inventory

Files read:

- `apps/deals/index.html`
- `apps/deals/join/index.html`
- `apps/deals/faq/index.html`
- `apps/deals/js/deals.js`

Files inventoried by bounded file listing/content search:

- `apps/deals/css/styles.css`
- `apps/deals/assets/logo-goldcoast-deals.svg`

### Form/runtime inventory

- `services/lead-handler/index.js`
- `services/lead-handler/buyer-signup.js`
- `services/lead-handler/package.json`
- `services/lead-handler/package-lock.json`

### Infrastructure inventory

Files read:

- `infra/website/main.tf`
- `infra/website/variables.tf`
- `infra/website/outputs.tf`

Files inventoried by bounded file listing only:

- `infra/website/prod.tfvars`
- `infra/website/staging.tfvars`

### Package/workspace conventions

- Root config presence check found no root `package.json`, root lockfile, workspace file, turbo config, root TypeScript config, or root ESLint/Prettier config.
- Package files found under `services/lead-handler` only.

## Key findings recorded in the ADR

- Seller routes currently present: `/`, `/privacy-policy/`, `/terms/`, and `/get-your-offer/`.
- `/get-your-offer/` currently exists as a noindex step-2 static route; epic requires retiring it by redirecting rather than keeping a separate conversion surface.
- Seller assets are a small static set under `apps/website/assets`; current app is vanilla HTML/CSS/JS with no build step.
- Buyer prototype routes currently present: `/`, `/join/`, and `/faq/`.
- Buyer legal pages are not present under `apps/deals`; current buyer pages link to canonical seller legal pages.
- Buyer deal detail route `/deals/[slug]/` is not present and must be built in the new app.
- Current seller and buyer form handlers preserve S3-first then GHL-best-effort behavior, but buyer signup currently requires phone and uses phone-derived key suffixes. The epic requires buyer signup to work with email as the only required field and key generation that does not depend on phone.
- No current `deal-interest` handler was found in `services/lead-handler`.
- Current `infra/website` owns legacy static S3/CloudFront/Route 53/ACM/API Gateway/Lambda/lead-bucket/GHL-secret resources and should remain the legacy/fallback surface until explicit cutover.
- Current Terraform observed only the seller submit route wired to the Lambda handler; no `/api/buyer-signup` route was observed in `infra/website/main.tf`.
- Root JS workspace/package conventions are absent; next slice should default to npm with committed lockfile for the new app unless a later workspace decision is documented.
- ADR now carries forward required public form abuse controls: rate limiting, request size limits, honeypot/spam rejection, and idempotency/dedup marker strategy.
- ADR now states the legacy buyer frontend success-on-fetch-failure behavior must not be copied; the new UI should show success only after server-confirmed S3 persistence.
- ADR now makes low-cost ECS networking explicit: public-subnet Fargate with `assign_public_ip = true` for no-NAT preview, or private subnets only with NAT/endpoints for required services.
- ADR now records GHL buyer signup tags `buyer-list`/`deals-website` and deal-interest tag/note contract.

## Files changed

- `docs/architecture/gcoffers-payload-cms-adr.md`
- `.jks/gcoffers-payload-cms/slice-1-preflight-adr-evidence.md`

No product/code files were intentionally modified.

## Verification performed

Focused verification after writing:

- Verified both required output files exist.
- Verified the ADR contains required inventory sections:
  - seller surface inventory
  - buyer/deals surface inventory
  - current S3-first form behavior
  - current infrastructure ownership
  - package/workspace conventions
- Verified the ADR contains required decisions:
  - whole-site Next.js + Payload CMS stack
  - AWS ECS Fargate + RDS Postgres + private S3 media + CloudFront/Route 53 architecture
  - Next route handlers after cutover while preserving existing API Gateway/Lambda until explicit cutover
  - private-by-default media privacy model
  - branch/PR boundary with no merge/deploy/Terraform apply/DNS/live alerts
  - low-cost V1 AWS sizing assumptions for ECS/RDS/ALB/CloudFront/S3/Secrets/CloudWatch
  - Terraform safety defaults
- Verified exact predicates are present:
  - `websiteVisibility === "public" AND dealStatus IN ["coming_soon", "available", "under_contract", "sold"]`
  - `websiteVisibility === "public" AND dealStatus IN ["coming_soon", "available", "under_contract"]`
  - `websiteVisibility === "public" AND dealStatus === "sold"`
  - `showExactAddressPublicly === true`
- Verified quality-review additions are present:
  - public form abuse controls: rate limiting, request size limits/body cap `32 KiB`, honeypot, idempotency, and dedup
  - ECS networking guardrails: public subnets with `assign_public_ip = true`, ALB security-group-only inbound, and no private-subnet tasks without NAT Gateway or VPC endpoints
  - GHL buyer/deal contract: `buyer-list`, `deals-website`, `interested-{dealSlug}`, and note format `Expressed interest in {dealSlug} on {submittedAt}`
  - buyer frontend caveat: legacy success-on-fetch-failure is not to copy, and new success requires S3 persistence confirmation
  - source/sizing caveats: `apps/deals/js/deals.js`, Payload admin smoke, and memory-pressure bump guidance
- `git diff --name-only -- .` returned no tracked-file diff names.
- Scoped status for the allowed output paths showed only:
  - `?? .jks/gcoffers-payload-cms/slice-1-preflight-adr-evidence.md`
  - `?? docs/architecture/gcoffers-payload-cms-adr.md`
- Safety scan results for the ADR/evidence were `email_like=0` and `phone_like=0`.

## Open caveats

- `git status --short --untracked-files=all -- .jks/gcoffers-payload-cms` also lists `.jks/gcoffers-payload-cms/GOAL.md` and `.jks/gcoffers-payload-cms/goal-state.json`; those JKS metadata files were not modified by this slice and were left untouched.
- No Terraform plan/validate was run for this slice per guardrails; this slice is documentation/inventory only.
- Later slices must resolve the new app package scaffolding and lockfile convention; current root has no JS workspace config.
- Existing buyer signup code does not match the epic's lightweight/email-first contract and is not wired in observed Terraform.
- Deal detail and deal-interest functionality must be built new.
- Future infra must reference/import existing hosted zone/certificate/state safely and must not create duplicate production DNS ownership.
