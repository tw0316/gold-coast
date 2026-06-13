#!/usr/bin/env node
import { createRequire } from 'node:module'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { exit } from 'node:process'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(scriptDir, '..')
const tmpRoot = mkdtempSync(join(tmpdir(), 'gcoffers-schema-access-'))
const tempRequire = createRequire(join(tmpRoot, 'entry.cjs'))

const failures = []
const pass = []

const assert = (condition, message) => {
  if (!condition) {
    failures.push(message)
  } else {
    pass.push(message)
  }
}

const readSource = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const transpileTsModule = (relativePath) => {
  const sourcePath = join(root, relativePath)
  const source = readFileSync(sourcePath, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText

  const outputPath = join(tmpRoot, relativePath).replace(/\.ts$/, '.js')
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, output)
  return outputPath
}

for (const relativePath of [
  'src/access/roles.ts',
  'src/lib/deals/slug.ts',
  'src/lib/deals/financials.ts',
  'src/lib/deals/taxonomy.ts',
  'src/lib/deals/visibility.ts',
  'src/lib/deals/dealView.ts',
  'src/lib/media/publicMedia.ts',
  'src/lib/media/resolveDealMedia.ts',
  'src/lib/payload/publicQueries.ts',
  'src/lib/deals/fixtures.ts',
  'src/fixtures/schema-access-fixtures.ts',
]) {
  transpileTsModule(relativePath)
}

try {
  const roles = tempRequire(join(tmpRoot, 'src/access/roles.js'))
  const slugs = tempRequire(join(tmpRoot, 'src/lib/deals/slug.js'))
  const visibility = tempRequire(join(tmpRoot, 'src/lib/deals/visibility.js'))
  const dealView = tempRequire(join(tmpRoot, 'src/lib/deals/dealView.js'))
  const media = tempRequire(join(tmpRoot, 'src/lib/media/publicMedia.js'))
  const publicQueries = tempRequire(join(tmpRoot, 'src/lib/payload/publicQueries.js'))
  const { schemaAccessFixtures } = tempRequire(
    join(tmpRoot, 'src/fixtures/schema-access-fixtures.js'),
  )

  const exactArray = (actual, expected) =>
    Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => value === expected[index])

  const normalizeMigrationSlug = (rawSlug, id) => {
    const base = String(rawSlug ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    return base || `deal-${id}`
  }
  const simulateDealSlugMigration = (rows) => {
    const normalizedRows = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      baseSlug: normalizeMigrationSlug(row.slug, row.id),
    }))
    const counts = normalizedRows.reduce((acc, row) => {
      acc.set(row.baseSlug, (acc.get(row.baseSlug) ?? 0) + 1)
      return acc
    }, new Map())
    return normalizedRows
      .sort((left, right) => {
        if (left.baseSlug !== right.baseSlug) {
          return left.baseSlug.localeCompare(right.baseSlug)
        }
        const leftCanonical = (left.slug ?? '') === left.baseSlug ? 0 : 1
        const rightCanonical = (right.slug ?? '') === right.baseSlug ? 0 : 1
        return leftCanonical - rightCanonical || left.id - right.id
      })
      .reduce((acc, row) => {
        const priorSameBase = [...acc.values()].filter((slug) => slug === row.baseSlug || slug.startsWith(`${row.baseSlug}-`)).length
        const isDuplicate = (counts.get(row.baseSlug) ?? 0) > 1 && priorSameBase > 0
        acc.set(row.id, isDuplicate ? `${row.baseSlug}-${row.id}` : row.baseSlug)
        return acc
      }, new Map())
  }

  assert(roles.isAdmin({ id: 1, role: 'admin' }), 'Admin role grants admin access')
  assert(roles.isAdminOrEditor({ id: 2, role: 'editor' }), 'Editor role grants staff content access')
  assert(roles.isAdminOrEditor({ id: 3, role: ' Admin ' }), 'Role checks trim and normalize legacy capitalization')
  assert(!roles.isAdminOrEditor({ id: 4 }), 'Roleless authenticated users do not receive staff content access without the migration backfill')
  assert(!roles.isAdmin({ id: 4 }), 'Roleless authenticated users are not promoted to admin-only access')
  assert(!roles.isAdminOrEditor(null), 'Anonymous users do not receive staff content access')

  assert(slugs.toDealSlug('Test Deal') === 'test-deal', 'Deal slugs normalize title-case spaces into URL-safe lowercase paths')
  assert(slugs.toDealSlug('  123 Main & Rehab  ') === '123-main-and-rehab', 'Deal slugs normalize symbols without leaking raw titles into URLs')
  assert(slugs.normalizeDealSlugInput('Test%20Deal') === 'test-deal', 'Encoded legacy deal URLs resolve to canonical slug form')

  const dealsCollectionSource = readSource('src/collections/Deals.ts')
  assert(dealsCollectionSource.includes('beforeValidate: [normalizeDealSlugBeforeValidate]'), 'Deals collection normalizes slugs before validation')
  assert(dealsCollectionSource.includes('originalDoc'), 'Deal slug normalization preserves existing slugs on partial updates')
  assert(dealsCollectionSource.includes('afterChange: [syncReferencedMediaPublicState, revalidateAfterChange]'), 'Deals collection promotes eligible public-deal media before revalidation')
  assert(dealsCollectionSource.includes('gcoffers deal media public-state sync failed'), 'Deals collection isolates media sync errors from deal saves')
  assert(dealsCollectionSource.includes('gallery media is buyer-facing by design'), 'Deals collection documents public gallery media promotion intent')
  assert(dealsCollectionSource.includes('allowCreate: true'), 'Deal market/media admin fields explicitly allow create drawers')
  assert(dealsCollectionSource.includes('allowEdit: true'), 'Deal market relationship explicitly allows editing existing markets')

  const staffMigrationSource = readSource('src/migrations/20260612_151525_staff_access_and_default_markets.ts')
  for (const marker of [
    'WITH first_legacy_user AS',
    'THEN \'admin\'::"enum_users_role"',
    'ELSE \'editor\'::"enum_users_role"',
    "'Miami-Dade', 'miami-dade'",
    "'Broward', 'broward'",
    "'Palm Beach', 'palm-beach'",
    'ON CONFLICT ("slug") DO UPDATE',
  ]) {
    assert(staffMigrationSource.includes(marker), `Staff/default markets migration marker present: ${marker}`)
  }

  const publicSurfaceMigrationSource = readSource('src/migrations/20260612_171059_deal_public_surface_regressions.ts')
  for (const marker of [
    'regexp_replace(lower("slug")',
    '"base_slug" || \'-\' || "id"',
    'CASE WHEN COALESCE("slug", \'\') = "base_slug" THEN 0 ELSE 1 END',
    '"slug_count" > 1 AND "slug_rank" > 1',
    'public-deal-referenced cover/gallery media',
    'media flagged as containing private details is never promoted',
    'public_deal_media AS',
    '"deals_rels"."path" = \'photos\'',
    '"access_policy" = \'public_after_reference_check\'',
    '"media_status" = \'ready\'',
    '"media"."media_status" NOT IN (\'hidden\', \'archived\')',
  ]) {
    assert(publicSurfaceMigrationSource.includes(marker), `Public deal surface migration marker present: ${marker}`)
  }
  assert(
    /WITH normalized AS \([\s\S]*?SELECT\s+"id",\s+"slug",\s+COALESCE\(/.test(publicSurfaceMigrationSource),
    'Public deal surface migration projects slug into the normalized CTE without whitespace-sensitive matching',
  )
  const migratedSlugs = simulateDealSlugMigration([
    { id: 8, slug: 'Test Deal' },
    { id: 3, slug: 'test-deal' },
    { id: 12, slug: null },
  ])
  assert(migratedSlugs.get(3) === 'test-deal', 'Public deal slug migration keeps an existing canonical slug unsuffixed')
  assert(migratedSlugs.get(8) === 'test-deal-8', 'Public deal slug migration suffixes lower-priority duplicate normalized slugs')
  assert(migratedSlugs.get(12) === 'deal-12', 'Public deal slug migration falls back deterministically for null/blank slugs')

  assert(
    exactArray(visibility.PUBLIC_DEAL_STATUSES, [
      'coming_soon',
      'available',
      'under_contract',
      'sold',
    ]),
    'Public deal visibility statuses are exactly coming_soon, available, under_contract, sold',
  )
  assert(
    exactArray(visibility.PUBLIC_ACTIVE_DEAL_STATUSES, [
      'coming_soon',
      'available',
      'under_contract',
    ]),
    'Public active listing statuses are exactly coming_soon, available, under_contract',
  )
  assert(
    visibility.PUBLIC_SOLD_DEAL_STATUS === 'sold',
    'Public sold proof status is exactly sold',
  )

  assert(
    JSON.stringify(visibility.publicDealVisibilityWhere) ===
      JSON.stringify({
        and: [
          { websiteVisibility: { equals: 'public' } },
          { dealStatus: { in: ['coming_soon', 'available', 'under_contract', 'sold'] } },
        ],
      }),
    'Payload public deal where uses websiteVisibility equals public AND dealStatus in the approved public statuses',
  )
  assert(
    JSON.stringify(visibility.publicActiveDealsWhere) ===
      JSON.stringify({
        and: [
          { websiteVisibility: { equals: 'public' } },
          { dealStatus: { in: ['coming_soon', 'available', 'under_contract'] } },
        ],
      }),
    'Payload active deal where uses websiteVisibility equals public AND dealStatus in the approved active statuses',
  )
  assert(
    JSON.stringify(visibility.publicSoldProofDealsWhere) ===
      JSON.stringify({
        and: [
          { websiteVisibility: { equals: 'public' } },
          { dealStatus: { equals: 'sold' } },
        ],
      }),
    'Payload sold proof where uses websiteVisibility equals public AND dealStatus equals sold',
  )

  const visibleIds = schemaAccessFixtures.deals
    .filter((deal) => visibility.isPublicDealVisible(deal))
    .map((deal) => deal.id)
  const activeIds = schemaAccessFixtures.deals
    .filter((deal) => visibility.isPublicActiveDeal(deal))
    .map((deal) => deal.id)
  const soldProofIds = schemaAccessFixtures.deals
    .filter((deal) => visibility.isPublicSoldProofDeal(deal))
    .map((deal) => deal.id)

  assert(
    exactArray(visibleIds, [
      'public-coming-soon',
      'public-available',
      'public-under-contract',
      'public-sold',
    ]),
    'Public detail/API predicate includes only public coming soon, available, under contract, and sold fixtures',
  )
  assert(
    exactArray(activeIds, ['public-coming-soon', 'public-available', 'public-under-contract']),
    'Public active listing predicate excludes sold and all non-public fixtures',
  )
  assert(
    exactArray(soldProofIds, ['public-sold']),
    'Public sold proof predicate includes only public sold fixtures',
  )

  for (const excludedId of [
    'hidden-internal-only',
    'preview-deal',
    'archived-deal',
    'draft-deal',
    'cancelled-deal',
  ]) {
    assert(
      !visibleIds.includes(excludedId) && !activeIds.includes(excludedId) && !soldProofIds.includes(excludedId),
      `${excludedId} fixture is excluded from public detail/listing/sold-proof helpers`,
    )
  }

  const hiddenAddressDeal = {
    ...schemaAccessFixtures.deals.find((deal) => deal.id === 'public-available'),
    county: 'Broward County',
    internalNotes: 'REDACTED_INTERNAL_NOTE',
    mapLocation: {
      latitude: 25.7617,
      longitude: -80.1918,
    },
    photos: [
      {
        ...schemaAccessFixtures.media[2],
        alt: 'Placeholder public media',
        filename: 'private-filename-should-not-leak.jpg',
        filesize: 12345,
        id: 'ready-public-reference-media',
        internalNotes: 'REDACTED_MEDIA_NOTE',
        thumbnailURL: 'https://storage.example.invalid/raw-ready-thumbnail.jpg',
      },
      {
        ...schemaAccessFixtures.media[4],
        id: 'private-details-media',
      },
    ],
  }
  const sanitizedHiddenAddressDeal = visibility.sanitizeDealForPublic(hiddenAddressDeal)
  assert(
    sanitizedHiddenAddressDeal !== null && !Object.hasOwn(sanitizedHiddenAddressDeal, 'exactAddress'),
    'Exact address is removed from public deal payloads by default',
  )
  assert(
    sanitizedHiddenAddressDeal !== null && !Object.hasOwn(sanitizedHiddenAddressDeal, 'mapLocation'),
    'Exact map coordinates are removed from public deal payloads by default',
  )
  const sanitizedHiddenAddressBuyerView = sanitizedHiddenAddressDeal
    ? dealView.toBuyerView(sanitizedHiddenAddressDeal)
    : null
  assert(
    sanitizedHiddenAddressBuyerView?.mapLocation?.source === 'county-fallback',
    'Buyer view falls back to county map coordinates when exact coordinates are private',
  )
  assert(
    sanitizedHiddenAddressBuyerView?.mapLocation?.latitude === 26.1901 &&
      sanitizedHiddenAddressBuyerView?.mapLocation?.longitude === -80.3659,
    'Buyer view county fallback never leaks the private exact map coordinates',
  )
  assert(
    sanitizedHiddenAddressDeal !== null && !Object.hasOwn(sanitizedHiddenAddressDeal, 'internalNotes'),
    'Internal notes are removed from public deal payloads',
  )
  assert(
    sanitizedHiddenAddressDeal !== null &&
      Array.isArray(sanitizedHiddenAddressDeal.photos) &&
      sanitizedHiddenAddressDeal.photos.length === 1 &&
      sanitizedHiddenAddressDeal.photos[0].url === '/api/media/public/ready-public-reference-media' &&
      sanitizedHiddenAddressDeal.photos[0].thumbnailURL ===
        '/api/media/public/ready-public-reference-media/thumbnail' &&
      !JSON.stringify(sanitizedHiddenAddressDeal.photos[0]).includes('https://storage.example.invalid') &&
      !Object.hasOwn(sanitizedHiddenAddressDeal.photos[0], 'accessPolicy') &&
      !Object.hasOwn(sanitizedHiddenAddressDeal.photos[0], 'filename') &&
      !Object.hasOwn(sanitizedHiddenAddressDeal.photos[0], 'filesize') &&
      !Object.hasOwn(sanitizedHiddenAddressDeal.photos[0], 'internalNotes'),
    'Public deal sanitizer exposes only app-mediated safe media references and drops private media details',
  )
  assert(
    visibility.sanitizeDealForPublic(schemaAccessFixtures.deals.find((deal) => deal.id === 'hidden-internal-only')) === null,
    'Public deal sanitizer returns null for non-public deal visibility',
  )
  const explicitlyPublicAddressDeal = {
    ...hiddenAddressDeal,
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: true,
  }
  assert(
    visibility.sanitizeDealForPublic(explicitlyPublicAddressDeal)?.exactAddress ===
      'REDACTED_EXACT_ADDRESS',
    'Exact address is retained only when showExactAddressPublicly is true',
  )
  assert(
    visibility.sanitizeDealForPublic(explicitlyPublicAddressDeal)?.mapLocation?.latitude === 25.7617,
    'Exact map coordinates are retained only when showExactAddressPublicly is true',
  )

  const [privateDefaultMedia, draftPublicMedia, readyPublicMedia, hiddenPublicMedia, privateDetailsMedia] =
    schemaAccessFixtures.media
  const publicAvailableDeal = schemaAccessFixtures.deals.find((deal) => deal.id === 'public-available')
  const hiddenInternalDeal = schemaAccessFixtures.deals.find((deal) => deal.id === 'hidden-internal-only')

  assert(media.isMediaPrivateByDefault(privateDefaultMedia), 'Media access policy defaults to private')
  assert(
    media.canServeMediaForPublicDeal(readyPublicMedia, publicAvailableDeal),
    'Ready public-reference media can be served only through a public deal visibility check',
  )
  assert(
    !media.canServeMediaForPublicDeal(draftPublicMedia, publicAvailableDeal) &&
      !media.canServeMediaForPublicDeal(hiddenPublicMedia, publicAvailableDeal) &&
      !media.canServeMediaForPublicDeal(privateDetailsMedia, publicAvailableDeal),
    'Draft, hidden, and private-details media cannot be served through public deal media helpers',
  )
  assert(
    !media.canServeMediaForPublicDeal(readyPublicMedia, hiddenInternalDeal),
    'Ready media cannot be served when the referencing deal is hidden/internal-only',
  )
  assert(
    media.canServeMediaForPublicPage(readyPublicMedia, { status: 'published' }) &&
      !media.canServeMediaForPublicPage(readyPublicMedia, { status: 'draft' }) &&
      !media.canServeMediaForPublicPage(draftPublicMedia, { status: 'published' }),
    'Public page media helper requires both ready media and a published page',
  )
  assert(
    media.resolvePublicMediaDelivery(readyPublicMedia, { deal: publicAvailableDeal }).allowed &&
      media.resolvePublicMediaDelivery(readyPublicMedia, { deal: publicAvailableDeal }).reason ===
        'public_deal_reference' &&
      media.resolvePublicMediaDelivery(privateDefaultMedia, { deal: publicAvailableDeal }).reason ===
        'private_by_default' &&
      media.resolvePublicMediaDelivery(readyPublicMedia, { deal: hiddenInternalDeal }).reason ===
        'no_public_reference',
    'App-mediated public media delivery decisions require public references and deny private/default media',
  )
  assert(
    media.buildAppMediatedPublicMediaPath('placeholder-media-id') ===
      '/api/media/public/placeholder-media-id',
    'App-mediated public media helper returns the public proxy path stub',
  )
  const sanitizedReadyMedia = media.sanitizeMediaForPublic(
    {
      ...readyPublicMedia,
      alt: 'Placeholder media alt',
      filename: 'private-filename-should-not-leak.jpg',
      filesize: 12345,
      id: 'ready-public-reference-media',
      internalNotes: 'REDACTED_MEDIA_NOTE',
      thumbnailURL: 'https://storage.example.invalid/raw-ready-thumbnail.jpg',
    },
    { deal: publicAvailableDeal },
  )
  assert(
    sanitizedReadyMedia !== null &&
      sanitizedReadyMedia.url === '/api/media/public/ready-public-reference-media' &&
      sanitizedReadyMedia.thumbnailURL === '/api/media/public/ready-public-reference-media/thumbnail' &&
      !JSON.stringify(sanitizedReadyMedia).includes('https://storage.example.invalid') &&
      sanitizedReadyMedia.alt === 'Placeholder media alt' &&
      !Object.hasOwn(sanitizedReadyMedia, 'accessPolicy') &&
      !Object.hasOwn(sanitizedReadyMedia, 'mediaStatus') &&
      !Object.hasOwn(sanitizedReadyMedia, 'containsExactAddressOrPrivateDetails') &&
      !Object.hasOwn(sanitizedReadyMedia, 'filename') &&
      !Object.hasOwn(sanitizedReadyMedia, 'filesize') &&
      !Object.hasOwn(sanitizedReadyMedia, 'internalNotes'),
    'Public media sanitizer returns only app-mediated URL/label fields and strips policy/private metadata',
  )
  assert(
    media.sanitizeMediaForPublic({ ...privateDetailsMedia, id: 'private-details-media' }, { deal: publicAvailableDeal }) === null &&
      media.sanitizeMediaForPublic({ ...readyPublicMedia, id: 'ready-public-reference-media' }, { deal: hiddenInternalDeal }) === null,
    'Public media sanitizer refuses private-details media and non-public referencing deals',
  )
  assert(
    media.sanitizeMediaReferenceForPublic('unvalidated-media-id', { deal: publicAvailableDeal }) === null,
    'Public media reference sanitizer refuses unvalidated raw IDs instead of bypassing policy',
  )

  const payloadConfig = readSource('src/payload.config.ts')
  for (const collection of [
    'Users',
    'Media',
    'Markets',
    'Pages',
    'FAQs',
    'Deals',
    'SiteSettings',
    'BuyerSignups',
    'DealInterest',
  ]) {
    assert(payloadConfig.includes(collection), `Payload config includes ${collection} collection`)
  }

  const usersSource = readSource('src/collections/Users.ts')
  assert(
    usersSource.includes("defaultValue: 'editor'") &&
      usersSource.includes("value: 'admin'") &&
      usersSource.includes("value: 'editor'"),
    'Users collection preserves role field with admin/editor roles and editor default',
  )

  const dealsSource = readSource('src/collections/Deals.ts')
  assert(
    dealsSource.includes("name: 'websiteVisibility'") && dealsSource.includes("name: 'dealStatus'"),
    'Deals collection models websiteVisibility and dealStatus as separate fields',
  )
  assert(
    dealsSource.includes("defaultValue: 'hidden'") && dealsSource.includes('Hidden / internal only'),
    'Deals collection maps internal-only handling to hidden website visibility',
  )
  assert(
    dealsSource.includes("name: 'showExactAddressPublicly'") &&
      dealsSource.includes("defaultValue: false") &&
      dealsSource.includes('exactAddressPublicOrStaffFieldAccess'),
    'Deals collection defaults exact address to private and guards public reads with showExactAddressPublicly',
  )

  const mediaSource = readSource('src/collections/Media.ts')
  assert(
    mediaSource.includes('disableLocalStorage: true') &&
      mediaSource.includes("defaultValue: 'private'") &&
      mediaSource.includes("value: 'public_after_reference_check'") &&
      mediaSource.includes('status: 404'),
    'Media collection is private by default and denies unauthenticated direct file reads',
  )
  const publicMediaSource = readSource('src/lib/media/publicMedia.ts')
  assert(
    publicMediaSource.includes('sanitizeMediaForPublic') &&
      publicMediaSource.includes('resolvePublicMediaDelivery(media, context).allowed') &&
      publicMediaSource.includes('buildAppMediatedPublicMediaPath(String(id))') &&
      publicMediaSource.includes('buildAppMediatedPublicMediaThumbnailPath(String(id))') &&
      !publicMediaSource.includes('thumbnailURL: media.thumbnailURL') &&
      !publicMediaSource.includes('return media.url'),
    'Public media helper sanitizes through policy and never returns raw storage URLs directly',
  )

  const publicQueriesSource = readSource('src/lib/payload/publicQueries.ts')
  const sourceBetween = (start, end) => {
    const startIndex = publicQueriesSource.indexOf(start)
    const endIndex = publicQueriesSource.indexOf(end, startIndex + start.length)
    return startIndex >= 0 && endIndex > startIndex
      ? publicQueriesSource.slice(startIndex, endIndex)
      : ''
  }
  for (const helperName of [
    'listPublicActiveDeals',
    'listPublicSoldProofDeals',
    'getPublicDealBySlug',
    'listPublishedPages',
    'getPublishedPageBySlug',
    'listPublishedFAQs',
    'listEnabledMarkets',
    'listPublicSiteSettings',
  ]) {
    assert(publicQueriesSource.includes(helperName), `Public query helpers export ${helperName}`)
  }
  assert(
    (publicQueriesSource.match(/overrideAccess:\s*false/g) ?? []).length >= 8 &&
      !publicQueriesSource.includes('overrideAccess: true'),
    'Every public Payload Local API helper explicitly sets overrideAccess: false',
  )
  assert(
    publicQueriesSource.includes('const PUBLIC_QUERY_MAX_DEPTH = 0') &&
      (publicQueriesSource.match(/depth:\s*clampPublicDepth\(options\.depth\)/g) ?? []).length >= 8 &&
      !/depth:\s*options\.depth\s*\?\?\s*[1-9]/.test(publicQueriesSource),
    'Public query helpers clamp relationship depth to zero and do not default to unsafe populated depth',
  )
  assert(
    publicQueriesSource.includes('const PUBLIC_QUERY_MAX_PAGE = 100') &&
      publicQueriesSource.includes('const clampPublicLimit') &&
      publicQueriesSource.includes('const clampPublicPage') &&
      (publicQueriesSource.match(/limit:\s*clampPublicLimit\(options\.limit,/g) ?? []).length >= 6 &&
      (publicQueriesSource.match(/page:\s*clampPublicPage\(options\.page\)/g) ?? []).length >= 6 &&
      !/limit:\s*options\.limit/.test(publicQueriesSource) &&
      !/page:\s*options\.page/.test(publicQueriesSource),
    'Public query helpers clamp caller-supplied limit/page options before they reach Payload find calls',
  )
  const publicFindCalls = []
  await publicQueries.listPublicActiveDeals(
    {
      find: async (args) => {
        publicFindCalls.push(args)
        return { docs: [] }
      },
    },
    { depth: 999, limit: 9999, page: 9999 },
  )
  assert(
    publicFindCalls[0]?.depth === 0 &&
      publicFindCalls[0]?.limit === 24 &&
      publicFindCalls[0]?.page === 100,
    'Public query helper runtime clamp keeps depth at 0, limit at helper max, and page at conservative max',
  )
  assert(
    (publicQueriesSource.match(/select:\s*public[A-Za-z]+Select/g) ?? []).length >= 8,
    'Every public query helper uses an explicit public-safe select object',
  )
  const publicDealSelectSource = sourceBetween('export const publicDealSelect', 'export const publicPageSelect')
  assert(
    publicDealSelectSource.includes('exactAddress: true') &&
      !publicDealSelectSource.includes('internalNotes') &&
      publicQueriesSource.includes('sanitizeDealForPublic'),
    'Public deal queries select only safe fields and always pass results through the deal sanitizer',
  )
  const publicSiteSettingsSelectSource = sourceBetween(
    'export const publicSiteSettingsSelect',
    'export const publicPayloadQueryPredicates',
  )
  assert(
    !publicSiteSettingsSelectSource.includes('alerting') &&
      publicQueriesSource.includes('sanitizeSiteSettingsForPublic'),
    'Public site settings select/sanitizer omit the operational alerting group',
  )
  assert(
    publicQueriesSource.includes('sanitized.navigation = pickKeys(page.navigation') &&
      publicQueriesSource.includes('sanitized.seo = pickKeys(page.seo') &&
      publicQueriesSource.includes('.filter((section): section is Record<string, unknown> => section !== null)') &&
      publicQueriesSource.includes('sanitized.navigation = Array.isArray(settings.navigation)') &&
      publicQueriesSource.includes('sanitized.socialLinks = Array.isArray(settings.socialLinks)'),
    'Nested public sanitizers explicitly pick allowed child keys and drop non-object child entries',
  )
  const sanitizedPublicSiteSettings = publicQueries.sanitizeSiteSettingsForPublic({
    alerting: {
      dealInterestAlertsEnabled: true,
      routingNote: 'REDACTED_ROUTING_NOTE',
    },
    id: 'placeholder-public-site-settings',
    isPublic: true,
    label: 'Placeholder public settings',
    seoDefaults: {
      description: 'Placeholder SEO description',
      openGraphImage: {
        accessPolicy: 'private',
        filename: 'private-open-graph-image.jpg',
        id: 'private-og-media',
        mediaStatus: 'ready',
      },
      title: 'Placeholder SEO title',
    },
    surface: 'shared',
  })
  assert(
    sanitizedPublicSiteSettings !== null &&
      !Object.hasOwn(sanitizedPublicSiteSettings, 'alerting') &&
      sanitizedPublicSiteSettings.seoDefaults &&
      !Object.hasOwn(sanitizedPublicSiteSettings.seoDefaults, 'openGraphImage'),
    'Public site settings sanitizer removes alerting and private media objects even if present in a raw document',
  )
  assert(
    publicQueries.sanitizeSiteSettingsForPublic({ isPublic: false, label: 'Private settings' }) === null,
    'Public site settings sanitizer returns null for non-public settings documents',
  )

  const restRouteSource = readSource('src/app/(payload)/api/[...slug]/route.ts')
  assert(
    [
      'deals',
      'faqs',
      'markets',
      'media',
      'pages',
      'site-settings',
    ].every((collectionSlug) => restRouteSource.includes(`'${collectionSlug}'`)) &&
      restRouteSource.includes('PUBLIC_DEFAULT_REST_GET_COLLECTIONS') &&
      restRouteSource.includes('isUnauthenticatedPublicCollectionRead') &&
      restRouteSource.includes('hasPayloadAuthCookie') &&
      !restRouteSource.includes("headers.get('authorization')") &&
      restRouteSource.includes('payload-token') &&
      restRouteSource.includes('{ status: 404 }') &&
      restRouteSource.includes('return payloadRestGet(request, context)') &&
      restRouteSource.includes('export const OPTIONS = payloadRestOptions'),
    'Default Payload REST route blocks unauthenticated GET reads for public content collections while keeping cookie-authenticated/OPTIONS access paths',
  )

  const graphQLRouteSource = readSource('src/app/(payload)/api/graphql/route.ts')
  assert(
    graphQLRouteSource.includes('GRAPHQL_POST(config)') &&
      graphQLRouteSource.includes('hasPayloadAuthCookie') &&
      !graphQLRouteSource.includes("headers.get('authorization')") &&
      graphQLRouteSource.includes('payload-token') &&
      graphQLRouteSource.includes('{ status: 404 }') &&
      graphQLRouteSource.includes('return payloadGraphQLPost(request)') &&
      graphQLRouteSource.includes('export const OPTIONS = payloadGraphQLOptions'),
    'Default Payload GraphQL route blocks unauthenticated POST while preserving cookie-authenticated POST and OPTIONS handling',
  )

  for (const submissionCollection of ['BuyerSignups', 'DealInterest']) {
    const source = readSource(`src/collections/${submissionCollection}.ts`)
    assert(
      source.includes('create: adminOrEditor') &&
        source.includes('read: adminOrEditor') &&
        source.includes('update: adminOrEditor') &&
        source.includes('delete: adminOrEditor'),
      `${submissionCollection} collection is staff-only/admin-or-editor through Payload access controls`,
    )
    assert(
      source.includes('s3ObjectKey') && source.includes('S3-first source-of-truth'),
      `${submissionCollection} documents the S3-first mirror contract`,
    )
  }

  const fixtureSource = readSource('src/fixtures/schema-access-fixtures.ts') + readSource('src/lib/deals/fixtures.ts')
  assert(!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(fixtureSource), 'Fixtures contain no raw email addresses')
  assert(!/\b\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(fixtureSource), 'Fixtures contain no raw phone numbers')
} finally {
  rmSync(tmpRoot, {
    force: true,
    recursive: true,
  })
}

if (failures.length > 0) {
  console.error('Payload schema/access verification failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  exit(1)
}

console.log('Payload schema/access verification passed')
for (const message of pass) {
  console.log(`- ${message}`)
}
