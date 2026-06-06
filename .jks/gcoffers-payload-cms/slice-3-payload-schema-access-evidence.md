# Slice 3: Payload schema and access control evidence

Status: completed
Completed: 2026-06-05
Quality-review remediation: completed 2026-06-05
Remaining quality-blocker remediation: completed 2026-06-05

## Scope
Implemented Payload collection schema and access helpers for Pages, Deals, Media, Markets/Areas, FAQs, Site Settings, Buyer Signups, Deal Interest, and preserved Users auth/roles in `apps/gcoffers-site`.

## Files changed / created
- `apps/gcoffers-site/package.json` — added `verify:schema-access` script.
- `apps/gcoffers-site/src/payload.config.ts` — registered Users, Media, Markets, Pages, FAQs, Deals, Site Settings, Buyer Signups, and Deal Interest collections.
- `apps/gcoffers-site/src/payload-types.ts` — regenerated with `npm run payload:types` during the original slice.
- `apps/gcoffers-site/src/access/roles.ts` — role helpers for admin/editor access.
- `apps/gcoffers-site/src/access/deals.ts` — exact-address public/staff field access helper.
- `apps/gcoffers-site/src/collections/Users.ts` — Payload auth with admin/editor role preservation and editor default.
- `apps/gcoffers-site/src/collections/Pages.ts` — CMS pages with published public read predicate.
- `apps/gcoffers-site/src/collections/Deals.ts` — deal schema, public visibility access, exact-address guard, internal notes guard.
- `apps/gcoffers-site/src/collections/Media.ts` — private-by-default media schema, direct file access denial for public users, reference-check policy fields.
- `apps/gcoffers-site/src/collections/Markets.ts` — market/area schema with enabled public read predicate.
- `apps/gcoffers-site/src/collections/FAQs.ts` — FAQ schema with published public read predicate.
- `apps/gcoffers-site/src/collections/SiteSettings.ts` — public-safe settings read predicate with staff-only/admin-or-editor alerting group.
- `apps/gcoffers-site/src/collections/BuyerSignups.ts` — staff-only/admin-or-editor S3-first buyer signup mirror schema.
- `apps/gcoffers-site/src/collections/DealInterest.ts` — staff-only/admin-or-editor S3-first deal interest mirror schema.
- `apps/gcoffers-site/src/lib/deals/visibility.ts` — canonical public deal visibility predicates and strict public deal sanitizer.
- `apps/gcoffers-site/src/lib/deals/fixtures.ts` — placeholder deal visibility fixtures.
- `apps/gcoffers-site/src/lib/deals/financials.ts` — basic deal financial calculation helper.
- `apps/gcoffers-site/src/lib/media/publicMedia.ts` — private-by-default, policy-gated, app-mediated public media helpers and sanitizer.
- `apps/gcoffers-site/src/lib/payload/publicQueries.ts` — public query predicate exports and frontend-facing Payload query helpers with access-safe selects/sanitizers.
- `apps/gcoffers-site/src/app/(payload)/api/[...slug]/route.ts` — default Payload REST route guarded for unauthenticated public collection GET reads while keeping authenticated/admin and OPTIONS paths.
- `apps/gcoffers-site/src/app/(payload)/api/graphql/route.ts` — default Payload GraphQL POST guarded for unauthenticated callers while keeping authenticated and OPTIONS paths.
- `apps/gcoffers-site/src/fixtures/schema-access-fixtures.ts` — placeholder-only schema/access verification fixtures.
- `apps/gcoffers-site/scripts/verify-payload-schema-access.mjs` — focused local verifier for predicates, sanitization, media decisions, registered collections, public query hardening, access shape, and fixture safety.

## Public query quality-review fixes
- Every public Payload Local API helper now sets `overrideAccess: false` so collection and field access are not bypassed.
- Public helpers use conservative `depth: 0` via `clampPublicDepth`, preventing automatic relationship population of Media or other private documents.
- Public helpers use explicit select objects:
  - `publicDealSelect`
  - `publicPageSelect`
  - `publicFAQSelect`
  - `publicMarketSelect`
  - `publicSiteSettingsSelect`
- Public deal helpers pass all returned docs through `sanitizeDealForPublic`.
- `getPublicDealBySlug` and `getPublishedPageBySlug` now return a sanitized document or `null` rather than a full paginated result.
- Public site settings helper passes docs through `sanitizeSiteSettingsForPublic`; the operational `alerting` group is omitted from the select and removed by the sanitizer if present in a raw document.
- Public list helpers now clamp caller-provided `limit` and `page` options before calling Payload (`limit` capped at each helper's conservative default/max and `page` capped at 100).
- Nested public sanitizers now explicitly pick child keys for page navigation/SEO/sections, FAQ related pages, and site settings navigation/social links; non-object child entries are dropped.

## Public visibility predicates verified
- Public deal detail/API visibility: `websiteVisibility === "public"` and `dealStatus IN ["coming_soon", "available", "under_contract", "sold"]`.
- Active public listing: `websiteVisibility === "public"` and `dealStatus IN ["coming_soon", "available", "under_contract"]`.
- Sold social proof only: `websiteVisibility === "public"` and `dealStatus === "sold"`.
- Draft, hidden/internal-only, preview, archived, and cancelled fixtures are excluded from all public helpers.
- Exact address is removed from public deal payloads unless `showExactAddressPublicly === true`.
- Internal notes are removed from public deal payloads.
- Non-public deals return `null` from the public deal sanitizer.
- Internal-only maps to `websiteVisibility = "hidden"`.

## Public media safety verified
- Media remains private by default.
- Direct unauthenticated upload/file reads are denied with a 404 handler.
- Public media helper decisions require both eligible media (`accessPolicy = public_after_reference_check`, `mediaStatus = ready`, no private-detail flag) and a public deal or published page reference.
- Public media sanitizer returns only app-mediated paths (`/api/media/public/<id>` and `/api/media/public/<id>/thumbnail` when a thumbnail exists) plus label fields after policy validation and strips policy/private metadata such as access policy, media status, private-detail flags, filenames, file sizes, internal notes, and raw storage thumbnail URLs.
- Public media reference sanitizer refuses unvalidated raw media IDs instead of manufacturing public URLs without a policy-eligible media document.
- Public deal sanitizer strips private media objects and returns only app-mediated safe media references when the populated media document passes policy.

## Default Payload API exposure guard
- `apps/gcoffers-site/src/app/(payload)/api/[...slug]/route.ts` now wraps the default Payload REST GET handler. Unauthenticated GET requests to `deals`, `pages`, `faqs`, `markets`, `site-settings`, and `media` return a 404 guard response unless a `payload-token` auth cookie is present. Cookie-authenticated admin/staff requests continue to flow to `payloadRestGet`, and POST/PATCH/PUT/DELETE/OPTIONS retain the Payload handlers.
- `apps/gcoffers-site/src/app/(payload)/api/graphql/route.ts` now wraps the default GraphQL POST handler. Unauthenticated POST returns a 404 guard response unless a `payload-token` auth cookie is present. Cookie-authenticated POST and OPTIONS continue to flow to Payload.
- The verifier source-checks both route wrappers, rejects `Authorization`-header-only bypasses, and verifies the public collection slug allowlist/guard behavior so later default-route regressions fail `npm run verify:schema-access`.

## Submission collection wording
- Buyer Signups and Deal Interest are intentionally staff-only/admin-or-editor through Payload access controls in this slice.
- Evidence and verifier wording now consistently uses “staff-only/admin-or-editor” to match the code.

## Commands run
All commands were run from `apps/gcoffers-site` unless noted.

1. `npm run verify:schema-access`
   - Passed. Output ended with `Payload schema/access verification passed` and included new checks for app-mediated media thumbnails, public limit/page runtime clamp (`depth` 0, `limit` 24, `page` 100 for an oversized active-deals request), nested child-key sanitizers, default Payload REST guard, and default Payload GraphQL guard.
2. `npm run typecheck`
   - Passed. `tsc --noEmit` completed without diagnostics.
3. `npm run build`
   - Passed. `payload generate:importmap` reported `No new imports found, skipping writing import map`; `next build` compiled successfully in 6.9s, finished TypeScript in 2.5s, generated 8/8 static pages, and listed the expected dynamic `/api/[...slug]`, `/api/graphql`, and `/api/graphql-playground` routes.
4. Scoped secret/PII scan from repo root over changed slice files and this evidence artifact.
   - Passed. Patterns covered raw email addresses, North American phone numbers, Slack webhook URLs, AWS access key IDs, GitHub tokens, generic bearer/private-key markers, and assignment-style secret names.

## PII / secret safety
- Fixtures use placeholders only (`[REDACTED_EMAIL]`, `[REDACTED_PHONE]`, placeholder hashes, and placeholder object keys).
- No real email addresses, phone numbers, webhook URLs, credentials, tokens, or private keys were added.
- Evidence and changed slice files were scanned with the scoped safety command described above.

## Caveats / non-goals
- No deployment, Terraform, AWS mutation, live GHL calls, Slack/email alerts, or S3 writes were performed.
- Public media streaming/proxy implementation is a later-slice route concern; this slice provides the schema/access model and policy-gated helper shape only.
- Site settings public access is limited by `isPublic === true`; the operational `alerting` group is field-access restricted to admin/editor users and omitted from public query selects/sanitizers.
