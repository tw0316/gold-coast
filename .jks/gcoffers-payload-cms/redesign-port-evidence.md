# Gold Coast Payload redesign port evidence

Date: 2026-06-06
Branch/worktree: `chore/gcoffers-staging-runtime-evidence`.
Status: local verification complete. No commit, push, deploy, Terraform, DNS, workflow, or external alert action was run for this redesign pass.

## Source of truth

The current staging redesign source lives in `origin/main:site/*` and is visible at `https://staging.gcoffers.com`.

Key markers ported into `apps/gcoffers-site`:

- Homepage title: `Gold Coast Home Buyers | Sell Your South Florida House Fast`
- Homepage H1: `Sell your home the easy way.`
- About title: `About Gold Coast Home Buyers | South Florida Real Estate Buyers`
- About H1: `Built for South Florida. Built to move fast.`
- Deals title: `Off-Market South Florida Deals | Gold Coast Home Buyers`
- Deals H1: `Off-market deals, underwritten by us.`
- Deals empty state: `0 active deals`, `No active deals right now`

## Changed scope

### Seller/frontdoor surface

- `apps/gcoffers-site/src/fixtures/sellerPages.ts`
  - Replaced older seller copy with staging redesign homepage copy, SEO, hero, proof, reviews, comparison, FAQ, offer, and footer content.
- `apps/gcoffers-site/src/components/seller/SellerHomePage.tsx`
  - Rebuilt homepage around staging redesign sections: hero/address CTA, how-it-works, proof/reviews, comparison, FAQ, and `#offer` form section.
  - Preserved Payload markers: `data-payload-page`, `data-payload-surface`, `data-payload-section`.
- `apps/gcoffers-site/src/components/seller/SellerHeroAddressBar.tsx`
  - Added client-side address bar that scrolls to `#offer` and passes the address into the seller form without putting PII in URL/query strings.
- `apps/gcoffers-site/src/components/seller/SellerLeadForm.tsx`
  - Reworked seller form UI to match the staging offer form while preserving POST/S3-first behavior.
  - Required fields: `address`, `fullName`, `email`.
  - Optional phone. Invalid phone is rejected only when a value is provided.
  - Service SMS consent is explicit, unchecked, and only required when phone is provided.
  - Marketing SMS consent remains explicit and unchecked.
- `apps/gcoffers-site/src/components/seller/SellerHeader.tsx`
  - Ported staging header/nav with active state.
- `apps/gcoffers-site/src/components/seller/SellerFooter.tsx`
  - Ported staging footer/handoff structure and links.
- `apps/gcoffers-site/src/lib/seller/contact.ts`
  - Centralized constructed public contact constants to avoid direct phone-regex literals in source.
- `apps/gcoffers-site/src/lib/seller/formContract.ts`
  - Updated seller required field contract to remove phone.
- `apps/gcoffers-site/src/lib/forms/s3FirstFormPipeline.ts`
  - Updated seller submission builder so phone is optional and SMS eligibility requires phone plus explicit consent.

### Added staging redesign routes

- `apps/gcoffers-site/src/app/(frontend)/about/page.tsx`
- `apps/gcoffers-site/src/components/seller/SellerAboutPage.tsx`
  - Added staging redesign About page.
- `apps/gcoffers-site/src/app/(frontend)/deals/page.tsx`
- `apps/gcoffers-site/src/components/buyer/BuyerDealsIndexPage.tsx`
  - Added staging redesign public `/deals/` page with empty state and buyer-list signup.
  - Buyer-list required fields remain email plus contract marker. `fullName`, `phone`, and `buyerType` are optional.
  - Service and marketing consents remain explicit and unchecked.

### Assets and styling

- `apps/gcoffers-site/public/assets/logo-full-on-dark.svg`
- `apps/gcoffers-site/public/assets/logo-full-on-light.svg`
- `apps/gcoffers-site/public/assets/fonts/SourceSans3-VariableFont_wght.ttf`
  - Copied from `origin/main:site/assets`.
- `apps/gcoffers-site/src/app/(frontend)/styles.css`
  - Appended staging redesign CSS/tokens/classes.
- `apps/gcoffers-site/src/app/(frontend)/layout.tsx`
  - Updated frontend metadata for the redesign.
- `apps/gcoffers-site/src/app/(frontend)/get-your-offer/page.tsx`
  - Redirects to `/#offer`; noindex preserved.

## Automated validation

Command run from `apps/gcoffers-site`:

```sh
npm run verify:seller-site \
  && npm run verify:buyer-deals-site \
  && npm run verify:s3-first-form-pipeline \
  && npm run typecheck \
  && npm run build \
  && git diff --check
```

Result: passed.

Evidence from output:

- `verify:seller-site` passed.
  - Confirms staging redesign homepage markers.
  - Confirms `/get-your-offer` redirects to `/#offer`.
  - Confirms seller phone is optional.
  - Confirms service/marketing consent checkboxes are explicit and unchecked.
  - Confirms no retired legacy seller endpoint markers in scanned frontend/seller files.
- `verify:buyer-deals-site` passed.
  - Confirms host-aware buyer/seller dispatch remains in place.
  - Confirms frontend `/deals/` buyer signup posts to `/api/buyer-signups` by POST.
  - Confirms frontend `/deals/` buyer signup requires email and keeps full name, phone, and buyer type optional.
  - Confirms frontend `/deals/` service/marketing consents are explicit and unchecked.
  - Confirms scanned buyer/deal files contain no raw email, phone, webhook, AWS key, token, private key, or street-address-looking values.
- `verify:s3-first-form-pipeline` passed.
  - Confirms S3 success is recorded before side-effect attempts.
  - Confirms side effects are skipped if S3 persistence fails.
  - Confirms seller lead build accepts missing optional phone.
  - Confirms seller SMS behavior is disabled without phone plus explicit consent.
- `typecheck` passed: `tsc --noEmit`.
- `build` passed: `next build`, compiled successfully, generated 17 static pages.
- `git diff --check` passed.

## Browser-rendered validation

Temporary local production server:

```sh
npm run start -- --hostname 127.0.0.1 --port 3999
```

Browser checks were run against `http://127.0.0.1:3999`.

### `/`

Result: passed.

- Title: `Gold Coast Home Buyers | Sell Your South Florida House Fast`
- H1: `Sell your home the easy way.`
- Old H1 absent: `Sell your South Florida house fast.`
- `#offer` present.
- Stylesheet link count: 1.
- Next error marker: false.
- Seller phone input required: false.
- Seller service consent required: false.
- Seller service consent checked: false.
- Seller marketing consent checked: false.

### `/about/`

Result: passed.

- Title: `About Gold Coast Home Buyers | South Florida Real Estate Buyers`
- H1: `Built for South Florida. Built to move fast.`
- County markers present: Miami-Dade, Broward, Palm Beach.
- Stat markers present: `500+`, `3`, `14`, `$85M`.
- About nav active: true.
- Stylesheet link count: 1.
- Next error marker: false.

### `/deals/`

Result: passed.

- Title: `Off-Market South Florida Deals | Gold Coast Home Buyers`
- H1: `Off-market deals, underwritten by us.`
- Empty state markers present: `0 active deals`, `No active deals right now`.
- Buyer-list form action: `/api/buyer-signups`.
- Buyer-list form method: `post`.
- Email required: true.
- Full name required: false.
- Phone required: false.
- Buyer type required: false.
- Service consent checked: false.
- Marketing consent checked: false.
- Buy nav active: true.
- Stylesheet link count: 1.
- Next error marker: false.

### `/get-your-offer`

Result: passed.

- Final URL: `http://127.0.0.1:3999/#offer`.
- Offer section visible: true.
- Title and H1 match redesign homepage.
- Stylesheet link count: 1.
- Next error marker: false.

## Host-aware buyer route smoke

Requests were made to `127.0.0.1:3999` with `Host: deals.gcoffers.com`.

Result: passed.

- `/` returned status 200, `data-buyer-page="home"`, seller H1 absent, private placeholder absent.
- `/join/` returned status 200, `data-buyer-page="join"`, POST form, email field, seller H1 absent, private placeholder absent.
- `/deals/miami-dade-value-add-starter-deal/` returned status 200, `data-buyer-page="deal-detail"`, `/api/deal-interest`, `Numbers Breakdown`, seller H1 absent, private placeholder absent.

## Safety notes

- No deploy, Terraform, DNS, workflow, commit, push, or external alert action was run for this pass.
- No first Payload admin user was created.
- Seller and buyer/deal lead surfaces remain POST-based. No PII is placed in GET/query strings by the new address bar or buyer signup surfaces.
- S3-first persistence ordering remains verified.
- Production/cutover flags were not touched.
- Staging runtime at the generated CloudFront URL has not been updated with these local redesign changes yet.

## Still requires approval

- Commit/push these local redesign changes to PR #6.
- Add or run a Payload staging deploy GitHub Action.
- Build/deploy the redesigned app image to the Payload staging runtime.
- Any Terraform apply, DNS change, production alias, live alert, or production cutover.
