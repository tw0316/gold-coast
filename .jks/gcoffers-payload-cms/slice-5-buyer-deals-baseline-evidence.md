# slice-5-buyer-deals-baseline evidence

Status: completed
Completed: 2026-06-06T04:16:11Z

## Summary

Implemented the buyer/deals migration baseline in `apps/gcoffers-site` and left changes uncommitted.

The host-aware `/` route still renders the seller site for seller/default hosts, and renders the buyer/deals landing when `getSurfaceForHost(headers().get('host')) === 'buyer'`. Buyer non-root pages are implemented under the `(buyer)` route group for `/join/`, `/faq/`, and `/deals/[slug]/`; existing shared legal routes remain `/privacy-policy/` and `/terms/`.

## Files changed or added

- `.jks/gcoffers-payload-cms/slice-5-buyer-deals-baseline-evidence.md`
- `apps/gcoffers-site/package.json`
- `apps/gcoffers-site/scripts/verify-buyer-deals-site.mjs`
- `apps/gcoffers-site/src/app/(frontend)/page.tsx`
- `apps/gcoffers-site/src/app/(frontend)/styles.css`
- `apps/gcoffers-site/src/app/(buyer)/layout.tsx`
- `apps/gcoffers-site/src/app/(buyer)/join/page.tsx`
- `apps/gcoffers-site/src/app/(buyer)/faq/page.tsx`
- `apps/gcoffers-site/src/app/(buyer)/deals/[slug]/page.tsx`
- `apps/gcoffers-site/src/components/buyer/BuyerHeader.tsx`
- `apps/gcoffers-site/src/components/buyer/BuyerFooter.tsx`
- `apps/gcoffers-site/src/components/buyer/BuyerEmailCapture.tsx`
- `apps/gcoffers-site/src/components/buyer/BuyerHomePage.tsx`
- `apps/gcoffers-site/src/components/buyer/BuyerJoinPage.tsx`
- `apps/gcoffers-site/src/components/buyer/BuyerSignupForm.tsx`
- `apps/gcoffers-site/src/components/buyer/BuyerFaqPage.tsx`
- `apps/gcoffers-site/src/components/buyer/BuyerDealCard.tsx`
- `apps/gcoffers-site/src/components/buyer/BuyerDealDetailPage.tsx`
- `apps/gcoffers-site/src/components/buyer/DealInterestForm.tsx`
- `apps/gcoffers-site/src/fixtures/buyerDeals.ts`
- `apps/gcoffers-site/src/lib/buyer/content.ts`
- `apps/gcoffers-site/src/lib/buyer/dealPresentation.ts`
- `apps/gcoffers-site/src/lib/buyer/fixtures.ts`
- `apps/gcoffers-site/src/lib/buyer/formContract.ts`
- `apps/gcoffers-site/src/lib/buyer/formContracts.ts`
- `apps/gcoffers-site/src/lib/buyer/publicDeals.ts`
- `apps/gcoffers-site/src/lib/deals/publicBuyerDeals.ts`

Note: `git status --short` showed `.jks/gcoffers-payload-cms/goal-state.json` modified before this slice work in this session; I did not edit that file for slice 5.

## Exact commands run

From `apps/gcoffers-site`:

1. `npm run verify:buyer-deals-site`
   - Final rerun passed after route-conflict and scoped PII/secret checks were added to the verifier. Output began with `Buyer deals site verification passed` and confirmed required buyer route/component/lib files, host-aware root dispatch, no conflicting buyer root route, no duplicate `(frontend)` buyer non-root routes, exact visibility helper usage, fixture filtering coverage, exact-address redaction, signup/deal-interest contracts, unchecked consent boxes, no raw storage/CDN media URLs, and no raw PII/secrets in scoped slice files.

2. `npm run typecheck`
   - Final rerun passed. `tsc --noEmit` completed without diagnostics.

3. `npm run build`
   - Final rerun passed. `payload generate:importmap` reported no new imports; `next build` compiled successfully with Next.js 16.2.7/Turbopack, completed TypeScript, generated 15 static pages, and listed dynamic `/`, static `/faq`, dynamic `/join`, shared `/privacy-policy`, shared `/terms`, and SSG `/deals/[slug]` paths for public-visible fixture slugs.

4. `npm run verify:seller-site`
   - Passed. Re-ran after host-aware root changes; output began with `Seller site verification passed` and confirmed the seller root still uses host-aware surface detection and renders `SellerHomePage`.

5. `npm run verify:schema-access`
   - Passed. Output began with `Payload schema/access verification passed` and reconfirmed the public visibility/status matrix, exact-address suppression, public media policy, and staff-only S3-first buyer/deal-interest collection contracts.

From repo root:

6. Scoped Node PII/secret scan over this evidence file
   - Passed: no raw email, North American phone number, Slack webhook URL, AWS access key ID, GitHub token, or private key marker detected.

7. `git status --short && git branch --show-current && git merge-base HEAD origin/feat/data-lake-monorepo-slice-1 && date -u +%Y-%m-%dT%H:%M:%SZ`
   - Output showed branch `feat/gcoffers-payload-cms-site`, merge-base `775bef55d71fd67774026c10d0e516921fcdcb0f`, timestamp `2026-06-06T04:16:11Z`, uncommitted slice files, and the unrelated pre-existing `.jks/gcoffers-payload-cms/goal-state.json` modification.

## Requirements covered

- Buyer host root renders a buyer landing/listing view while seller/default host root still renders the seller homepage.
- `/join/`, `/faq/`, and `/deals/[slug]/` routes exist and build.
- Active listing helper uses the exact public active predicate: `websiteVisibility === "public"` and `dealStatus` in `coming_soon | available | under_contract`.
- Sold proof helper uses only `websiteVisibility === "public"` and `dealStatus === "sold"`; sold deals are separate from active listing.
- Detail/slug helpers exclude hidden/internal-only, preview, archived, draft, and cancelled fixtures and return 404 for missing/non-public slugs.
- Public deal detail rendering suppresses exact address by default and renders an exact address only if it survives `sanitizeDealForPublic`, which requires `showExactAddressPublicly === true`.
- Public media safety is preserved by existing sanitizer helpers; buyer UI does not add raw S3/object/storage URLs or direct media URLs.
- Buyer signup is lightweight: email required; name, phone, buyer type, areas, property types, price range, and purchase method optional/progressive.
- SMS/service consent and marketing consent are explicit checkboxes and are not prechecked.
- Buyer signup form posts to future local `/api/buyer-signups` with an explicit slice-6 contract marker.
- Deal-interest CTA/form exists on deal detail pages, posts to future local `/api/deal-interest`, carries `dealSlug`, and documents S3-first future persistence without fake success behavior.
- Shared legal links point to existing `/privacy-policy/` and `/terms/` pages.
- Added `verify:buyer-deals-site` npm script and focused verifier.

## Safety notes

- No commit, push, merge, deploy, Terraform, DNS, live external API call, CRM call, email, SMS, Slack/webhook alert, or S3 mutation was performed.
- No secrets, credential-like values, webhook URLs, raw emails, raw phone numbers, or real private addresses were added.
- Fixture exact-address values are obvious redacted placeholders only.
- Buyer forms intentionally define contracts only; slice 6 must implement S3-first route handlers before any side effects.

## Owner verification addendum

Owner inspected the evidence, key route/helper/form files, changed-file list, and worktree status after worker completion.

Additional owner-run commands:

1. `npm run verify:buyer-deals-site && npm run typecheck && npm run build`
   - Passed. Build listed dynamic `/`, static `/faq`, dynamic `/join`, shared legal pages, and SSG `/deals/[slug]` for public-visible fixture slugs.

2. `npm run verify:seller-site && npm run verify:schema-access`
   - Passed. Seller root behavior and existing Payload visibility/access checks still pass after host-aware buyer routing changes.

3. Scoped safety scan over changed/untracked slice files plus `git diff --check`
   - Passed. No raw email, phone-like value, Slack webhook, AWS key, GitHub token, private key marker, or whitespace errors found.

Owner did not commit, push, deploy, apply Terraform, change DNS, mutate cron jobs, or send external alerts.

## Quality review fix addendum

Completed: 2026-06-06T04:34:29Z

Fix notes:

- Removed the runtime URL/email prefill path. `BuyerEmailCapture` is now a link-only CTA to `/join/` with no email input, no GET form, and no query params. `/join/` no longer reads `searchParams`, `BuyerJoinPage` no longer accepts `prefilledEmail`, and `BuyerSignupForm` no longer has a prefilled email prop/default value.
- Added explicit deal-interest service/SMS consent for optional phone collection. `DealInterestForm` keeps phone optional, adds a non-prechecked `serviceConsent` checkbox with service/SMS terms, sends the hidden slice-6 contract marker, and sends an explicit `phoneConsentContract` marker.
- Set buyer-host root metadata in `(frontend)/page.tsx` to `metadataBase: new URL('https://deals.gcoffers.com')` with deals-domain canonical and OpenGraph URL so the buyer branch does not inherit seller metadata.
- Unified buyer form constants by making `src/lib/buyer/formContract.ts` canonical and changing `src/lib/buyer/formContracts.ts` to a compatibility re-export. Buyer form components now import the canonical module, and the canonical contract arrays include explicit `contract`, deal-interest `serviceConsent`, and `phoneConsentContract` fields.
- Fixed low-risk accessibility drift: the deal numbers section labels a visible `h2`, and the active deal-interest form now provides the `buyer-interest-title` heading used by the containing section.
- Updated `scripts/verify-buyer-deals-site.mjs` to catch the removed GET email PII flow, removed join prefill, buyer root metadataBase/canonical/OG settings, canonical form-contract module shape, deal-interest consent checkbox/copy/contract marker, and the aria fixes.

Exact commands run after the fixes:

From `apps/gcoffers-site`:

1. `npm run verify:buyer-deals-site`
   - Passed. Output began with `Buyer deals site verification passed` and included the new checks for no GET email capture, no URL-prefilled join email, deals-domain buyer root metadata, canonical buyer form contracts, deal-interest service/SMS consent, and visible aria labels.

2. `npm run verify:seller-site && npm run verify:schema-access && npm run typecheck`
   - Passed. `verify:seller-site` began with `Seller site verification passed`; seller host-aware root behavior and seller form contract checks still pass. `verify:schema-access` began with `Payload schema/access verification passed`; public visibility, media policy, and staff-only S3-first collection contracts still pass. `tsc --noEmit` completed without diagnostics.

3. `npm run build`
   - Passed. `payload generate:importmap` found no new imports; `next build` compiled successfully, completed TypeScript, generated 15 static pages, and listed dynamic `/`, static `/faq`, static `/join`, shared legal pages, and SSG `/deals/[slug]` public fixture paths.

From repo root:

4. `git status --short && git branch --show-current && date -u +%Y-%m-%dT%H:%M:%SZ && git diff --check`
   - Passed `git diff --check` with no output. Status still showed the pre-existing modified `.jks/gcoffers-payload-cms/goal-state.json`, plus the uncommitted slice files; branch was `feat/gcoffers-payload-cms-site`; timestamp was `2026-06-06T04:34:29Z`.

## Known caveats

- Buyer/deal content is fixture-backed placeholder content for this baseline. The existing Payload public query/media helpers remain the visibility/sanitization contract, and the UI can be switched to live Payload data when seeded/runtime querying is in scope.
- `/api/buyer-signups` and `/api/deal-interest` are future endpoint targets only in this slice; submitting those forms will not persist until slice 6 implements the local route handlers.

## Final spec and quality re-review addendum

Completed: 2026-06-06T04:58:21Z

Review result: APPROVED.

Final reviewer findings:

- Critical Issues: None.
- Important Issues: None.
- Minor Issues: None.
- Slice-6 API route handler concerns are resolved separately by the verified `slice-6-s3-first-form-pipeline` slice and no longer block slice 5.

Final checks included:

- `npm run verify:buyer-deals-site` — passed.
- `npm run typecheck` — passed.
- `npm run build` — passed.
- `npm run verify:seller-site` — passed.
- `git diff --check` — passed.

State update: `.jks/gcoffers-payload-cms/goal-state.json` now records slice 5 final review approval while preserving the already-verified slice 6 completion and next action for slice 7.
