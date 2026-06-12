# slice-4-seller-site-baseline — Seller-site page migration baseline

## Slice id/title
- `slice-4-seller-site-baseline`
- Seller-site page migration baseline

## Summary of implementation
- Replaced the initial Next scaffold homepage with a migrated Gold Coast Home Buyers seller baseline for `/`.
- Added seller legal routes for `/privacy-policy/` and `/terms/` using shared legal seed content.
- Retired `/get-your-offer/` as a conversion surface by adding an App Router redirect to `/#seller-lead-form` and keeping the retired route `noindex`.
- Preserved the legacy seller brand/design baseline: Gold Coast colors, logo/hero assets, hero CTA, lead form, how-it-works, benefits, direct-vs-traditional comparison, seller reasons, testimonials, service-area copy, CTA, footer, and legal content.
- Added Payload Pages-shaped seller seed structures for home/legal pages in `src/fixtures/sellerPages.ts`, plus seller content/form helpers under `src/lib/seller/`.
- Preserved the seller lead form contract for slice 6: `POST` to `/api/seller-leads`, fields `fullName`, `address`, `phone`, `email`, unchecked `serviceConsent` and `marketingConsent` checkboxes, and hidden `source`, `page`, `referrer`, `userAgent` context fields populated client-side where possible.
- Kept a single host-aware `(frontend)` root route using `getSurfaceForHost` instead of adding a parallel seller route group, so later buyer-domain `/` routing can be implemented without App Router route conflicts.
- Copied required legacy public assets into the new app public asset path for the seller baseline.
- Added `verify:seller-site` with focused checks for routes, redirect, form contract, unchecked consent defaults, migrated content markers, Payload seed markers, public assets, host-aware routing, and absence of the retired live legacy seller API endpoint in seller source.

## Changed files
- `.jks/gcoffers-payload-cms/slice-4-seller-site-baseline-evidence.md`
- `apps/gcoffers-site/package.json`
- `apps/gcoffers-site/scripts/verify-seller-site.mjs`
- `apps/gcoffers-site/src/app/(frontend)/layout.tsx`
- `apps/gcoffers-site/src/app/(frontend)/page.tsx`
- `apps/gcoffers-site/src/app/(frontend)/styles.css`
- `apps/gcoffers-site/src/app/(frontend)/get-your-offer/page.tsx`
- `apps/gcoffers-site/src/app/(frontend)/privacy-policy/page.tsx`
- `apps/gcoffers-site/src/app/(frontend)/terms/page.tsx`
- `apps/gcoffers-site/src/components/seller/SellerFooter.tsx`
- `apps/gcoffers-site/src/components/seller/SellerHeader.tsx`
- `apps/gcoffers-site/src/components/seller/SellerHomePage.tsx`
- `apps/gcoffers-site/src/components/seller/SellerLeadForm.tsx`
- `apps/gcoffers-site/src/components/seller/SellerLegalPage.tsx`
- `apps/gcoffers-site/src/fixtures/sellerPages.ts`
- `apps/gcoffers-site/src/lib/seller/content.ts`
- `apps/gcoffers-site/src/lib/seller/formContract.ts`
- `apps/gcoffers-site/public/assets/favicon.ico`
- `apps/gcoffers-site/public/assets/hero-home.png`
- `apps/gcoffers-site/public/assets/logo-goldcoast.png`
- `apps/gcoffers-site/public/assets/og-image.jpg`

## Commands run with results
- `git status --short --branch` from repo root: exit `0`; confirmed branch `feat/gcoffers-payload-cms-site...origin/feat/data-lake-monorepo-slice-1` and existing untracked slice workspace paths.
- `mkdir -p public/assets && cp ../website/assets/favicon.ico ../website/assets/hero-home.png ../website/assets/logo-goldcoast.png ../website/assets/og-image.jpg public/assets/` from `apps/gcoffers-site`: exit `0`; copied legacy seller assets into the new app public path.
- `npm run verify:seller-site` from `apps/gcoffers-site`: exit `0`; seller site verification passed (rerun after verification-script cleanup also passed).
- `npm run typecheck` from `apps/gcoffers-site`: exit `0`; `tsc --noEmit` passed.
- `npm run build` from `apps/gcoffers-site`: exit `0`; Payload import map had no new imports, Next 16 production build compiled successfully, generated static pages for `/get-your-offer`, `/privacy-policy`, and `/terms`, and kept `/` dynamic for host-aware rendering.
- `git status --short` from repo root: exit `0`; still shows broad untracked workspace paths (`.jks/gcoffers-payload-cms/`, `apps/gcoffers-site/`, `docs/architecture/`) because this slice is intentionally left uncommitted.

## Verification coverage and caveats
- Verification script coverage:
  - Required seller route/component/helper files exist.
  - `/get-your-offer/` redirects to the seller lead CTA and is noindex.
  - Root page uses `getSurfaceForHost` and no parallel `src/app/(seller)/page.tsx` route conflict exists.
  - Seller lead form posts to `/api/seller-leads`, uses `POST`, includes required seller identity/property/contact fields, includes hidden source/page/referrer/userAgent context fields, and keeps service/marketing consent checkboxes unchecked by default.
  - Migrated seller content markers are present for hero, how-it-works, benefits, comparison, reasons, testimonials, service area, CTA, footer/legal, and Gold Coast brand copy.
  - Payload Pages seed markers are present for seller/shared surfaces, published status, and section types (`hero`, `two_column`, `cta`, `legal`).
  - Seller CSS brand/layout markers and copied public assets are present.
  - Seller source does not contain the retired live legacy API Gateway submit-lead contract.
- TypeScript and production build passed.
- Caveat: this slice intentionally does not implement `/api/seller-leads`; the form route is a documented contract for slice 6. Until slice 6 adds the S3-first handler, submitting the form in the app will not persist a lead.
- Caveat: buyer-domain root rendering is not implemented in this slice. The root route remains host-aware and currently renders the seller baseline while preserving a clean hook for slice 5 to branch buyer content by host.

## No secrets/raw PII statement
- No secrets, credentials, production AWS mutations, GHL calls, Slack/email alerts, or raw user PII were added to this evidence artifact.
- The implementation does not call the legacy live API endpoint and does not include sample raw lead records.
- Public site content was migrated/summarized without adding private lead data.

## Notes for slice 6 seller form pipeline
- Contract target: `POST /api/seller-leads`.
- Required baseline form fields: `fullName`, `address`, `phone`, `email`.
- Consent fields: `serviceConsent` and `marketingConsent`; both are explicit checkboxes and are not prechecked. Slice 6 should coerce missing checkbox values to `false` and checked values to `true`.
- Context fields: `source` is `seller-site`; `page`, `referrer`, and `userAgent` are submitted as hidden fields populated from the browser when JavaScript runs. The server should treat these as client-provided context and enrich/validate with request headers where appropriate.
- Slice 6 should implement the ADR S3-first behavior: validate/cap request size, apply abuse controls, persist source-of-truth JSON to approved S3 first, return success only after S3 success, then perform GHL/Payload/alert side effects best-effort and redacted.
- Do not reintroduce the legacy API Gateway submit-lead route or success-on-fetch-failure behavior.

## Notes for slice 5 buyer route integration
- Routing choice: kept seller pages in the existing `(frontend)` group and retained host detection via `getSurfaceForHost` on `/` instead of creating a second route-group root. This avoids App Router conflicts when `deals.gcoffers.com` later needs its own `/` buyer page.
- Slice 5 can branch the root route by `routeSurface === 'buyer'` and render buyer content while preserving seller rendering for default/seller hosts.
- `/privacy-policy/` and `/terms/` are implemented as shared legal pages seeded with `surface: 'shared'`, so buyer pages can link to the same canonical legal routes or host-equivalent routes without duplicating legal copy.
