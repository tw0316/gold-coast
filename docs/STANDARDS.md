# Gold Coast Home Buyers — Development Standards

## Project Overview
- **Domain:** gcoffers.com
- **Purpose:** Lead generation website for South Florida real estate wholesaling
- **Business:** Gold Coast Home Buyers (Tej + Juhi)
- **Stack:** Static HTML/CSS/JS + AWS (S3, CloudFront, Lambda, API Gateway, Route 53)

---

## Architecture

```
User Browser
    │
    ├── Static Site (S3 + CloudFront)
    │     ├── index.html (homepage + Step 1 form)
    │     ├── /get-your-offer/ (Step 2 form)
    │     ├── /privacy-policy/
    │     └── /terms/
    │
    └── Form Submission (API Gateway + Lambda)
          ├── S3 Write (goldcoast-leads bucket, source of truth)
          └── GoHighLevel API (CRM sync, parallel, non-blocking)
```

## Environments

| Environment | Domain | Access |
|-------------|--------|--------|
| Production  | gcoffers.com | Public |
| Staging     | staging.gcoffers.com | IP-restricted (76.128.41.131 only) |

### Staging Rules
- Staging CloudFront distribution uses WAF with IP whitelist
- Only accessible from home network
- Deploys from `staging` branch
- Mirror of prod infrastructure (separate S3 buckets, separate Lambda)

---

## Branch Strategy

```
main        → deploys to production (gcoffers.com)
staging     → deploys to staging (staging.gcoffers.com)
feat/*      → feature branches, PR into staging first
fix/*       → bug fixes, can PR directly into main for hotfixes
```

### Commit Convention
```
feat: add testimonials section
fix: TCPA checkbox validation on mobile
infra: add WAF IP restriction for staging
style: adjust hero CTA button spacing
```

---

## Code Standards

### HTML
- Semantic HTML5 (header, nav, main, section, article, footer)
- All images have alt text
- Forms have proper labels and aria attributes
- TCPA checkbox: `<input type="checkbox" required>` — never pre-checked

### CSS
- CSS custom properties (variables) for theming
- Mobile-first responsive design
- No CSS frameworks (keep it lightweight)
- BEM-ish naming: `.hero__title`, `.form__input`, `.benefits__card`
- Max width: 1200px content area
- File: `css/styles.css` (single file, no build step needed)

### JavaScript
- Vanilla JS only (no React, no jQuery, no build tools)
- Form validation: client-side + server-side
- Async form submission via fetch()
- Progressive enhancement: forms work without JS (action fallback)
- File: `js/main.js` (single file)

### Assets
- Images: WebP preferred, JPEG fallback
- Compress all images before commit (target: <100KB each)
- Favicon: include .ico + .png variants
- Open Graph meta tags on all pages

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Lighthouse Performance | 90+ |
| First Contentful Paint | <1.5s |
| Largest Contentful Paint | <2.5s |
| Total page weight | <500KB |
| Time to Interactive | <2s |

---

## Testing

### Pre-Deploy Checklist
- [ ] All forms submit successfully (test with real data in staging)
- [ ] TCPA checkbox is unchecked by default and required
- [ ] Form data arrives in S3 bucket (check goldcoast-leads)
- [ ] Form data arrives in GoHighLevel CRM
- [ ] If GHL API fails, S3 still receives the lead
- [ ] Mobile responsive: test at 375px, 768px, 1024px, 1440px
- [ ] All links work (no 404s)
- [ ] Privacy policy and terms pages render correctly
- [ ] SSL certificate is active (HTTPS only)
- [ ] No console errors
- [ ] Lighthouse audit passes targets
- [ ] Open Graph preview renders correctly (use ogimage.dev or similar)

### Testing Workflow
1. Build locally → test in browser
2. Open PR → PR Check validates the static site and Lambda JavaScript syntax
3. Run the Deploy Staging GitHub Actions workflow with the PR branch/ref
4. Tej reviews staging from an allowed IP (`staging.gcoffers.com` is WAF-restricted)
5. Merge PR into `main`
6. Run the Deploy Production GitHub Actions workflow from `main`
7. Smoke test prod

### Lambda Testing
- Test locally with `sam local invoke` or simple Node.js test script
- Test cases:
  - Happy path (all fields valid)
  - Missing required fields (should return 400)
  - GHL API timeout (lead should still save to S3)
  - GHL API error (lead should still save to S3)
  - Duplicate submission (idempotent, don't create duplicate leads)

---

## Deployment

### Initial Setup (one-time)
1. Create AWS resources (S3 buckets, CloudFront, Route 53, Lambda, API Gateway)
2. Point Namecheap nameservers to Route 53
3. Request ACM certificate for gcoffers.com + *.gcoffers.com
4. Configure AWS GitHub Actions OIDC provider and deploy roles
5. Configure GitHub Actions variables and environments

### Deploy to Staging
Run the **Deploy Staging** GitHub Actions workflow and provide the branch, tag, or SHA to deploy.

### Deploy to Production
Run the **Deploy Production** GitHub Actions workflow from `main` after staging approval.

### Local Break-Glass Deploy
Local deployment is emergency-only and intentionally guarded:

```bash
ALLOW_LOCAL_DEPLOY=1 ./scripts/deploy.sh staging --confirm-local-break-glass
```

### Deployment Pipeline Should:
1. Validate environment and required GitHub Actions variables
2. Validate static site files and Lambda JavaScript syntax
3. Upload site files to the correct S3 bucket
4. Apply cache-control metadata
5. Invalidate CloudFront cache
6. Run smoke checks
7. Print deploy summary

---

## Secrets Management
- AWS credentials: stored locally, never in repo
- GHL API key: stored in AWS Secrets Manager, Lambda reads at runtime
- No secrets in environment variables visible in AWS Console
- `.gitignore` includes all credential files

---

## Monitoring (Post-Launch)
- CloudFront access logs → S3 bucket (for traffic analysis)
- Lambda CloudWatch logs (for form submission debugging)
- S3 lead count check (daily, automated)
- Uptime monitoring: set up after launch (UptimeRobot or similar)

---

## File Structure
```
goldcoast-website/
├── docs/
│   └── STANDARDS.md          # This file
├── site/
│   ├── index.html            # Homepage (hero + Step 1 form)
│   ├── get-your-offer/
│   │   └── index.html        # Step 2 form
│   ├── privacy-policy/
│   │   └── index.html
│   ├── terms/
│   │   └── index.html
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── main.js
│   └── assets/
│       ├── logo.svg
│       ├── favicon.ico
│       └── og-image.jpg
├── lambda/
│   ├── index.js              # Form handler
│   ├── package.json
│   └── test.js               # Local test script
├── infra/
│   ├── main.tf               # Terraform (or CDK)
│   ├── variables.tf
│   ├── outputs.tf
│   └── staging.tfvars
├── scripts/
│   ├── deploy.sh             # Break-glass local deploy wrapper
│   ├── deploy/               # GitHub Actions deploy helpers
│   └── setup.sh              # One-time infra setup
├── .gitignore
└── README.md
```
