import type { Payload, Where } from 'payload'

import type {
  DealsSelect,
  FaqsSelect,
  MarketsSelect,
  PagesSelect,
  SiteSettingsSelect,
} from '../../payload-types'
import {
  publicActiveDealsWhere,
  publicDealVisibilityWhere,
  publicSoldProofDealsWhere,
  sanitizeDealForPublic,
  type DealVisibilityInput,
} from '../deals/visibility'
import { sanitizeMediaReferenceForPublic } from '../media/publicMedia'
import { attachPublicDealMedia } from '../media/resolveDealMedia'
import { normalizeDealSlugInput } from '../deals/slug'

export type PublicSiteSurface = 'seller' | 'buyer' | 'shared'

export type PublicQueryOptions = {
  depth?: number
  limit?: number
  page?: number
}

export type PublicSurfaceQueryOptions = PublicQueryOptions & {
  surface?: PublicSiteSurface
}

export const publishedPagesWhere: Where = {
  status: {
    equals: 'published',
  },
}

export const publishedFAQsWhere: Where = {
  status: {
    equals: 'published',
  },
}

export const enabledMarketsWhere: Where = {
  enabled: {
    equals: true,
  },
}

export const publicSiteSettingsWhere: Where = {
  isPublic: {
    equals: true,
  },
}

export const andWhere = (...clauses: Where[]): Where => ({
  and: clauses,
})

const surfaceWhere = (surface: PublicSiteSurface | undefined): Where | null => {
  if (!surface) {
    return null
  }

  if (surface === 'shared') {
    return {
      surface: {
        equals: 'shared',
      },
    }
  }

  return {
    surface: {
      in: [surface, 'shared'],
    },
  }
}

const withOptionalWhere = (baseWhere: Where, optionalWhere: Where | null): Where =>
  optionalWhere ? andWhere(baseWhere, optionalWhere) : baseWhere

const PUBLIC_QUERY_MAX_DEPTH = 0
const PUBLIC_QUERY_MAX_PAGE = 100

// Public helpers intentionally ignore positive caller-supplied depth. Later route-param wiring
// must not be able to populate relationships that could include private Media or staff fields.
const clampPublicDepth = (depth: number | undefined): number => {
  if (typeof depth !== 'number' || !Number.isFinite(depth)) {
    return PUBLIC_QUERY_MAX_DEPTH
  }

  return Math.max(0, Math.min(PUBLIC_QUERY_MAX_DEPTH, Math.floor(depth)))
}

const clampPositiveInteger = (value: number | undefined, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(1, Math.floor(value))
}

const clampPublicLimit = (limit: number | undefined, fallback: number, max = fallback): number =>
  Math.min(max, clampPositiveInteger(limit, fallback))

const clampPublicPage = (page: number | undefined): number =>
  Math.min(PUBLIC_QUERY_MAX_PAGE, clampPositiveInteger(page, 1))

const sanitizeDocs = <TDoc, TPublic>(
  result: { docs: TDoc[] },
  sanitizer: (doc: TDoc) => TPublic | null,
) => ({
  ...result,
  docs: result.docs.map((doc) => sanitizer(doc)).filter((doc): doc is TPublic => doc !== null),
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const pickKeys = (
  source: Record<string, unknown>,
  allowedKeys: readonly string[],
): Record<string, unknown> => {
  const picked: Record<string, unknown> = {}

  for (const key of allowedKeys) {
    if (Object.hasOwn(source, key)) {
      picked[key] = source[key]
    }
  }

  return picked
}

const sanitizeUploadReference = (
  value: unknown,
  context: Parameters<typeof sanitizeMediaReferenceForPublic>[1],
) => {
  if (typeof value === 'number' || typeof value === 'string') {
    return sanitizeMediaReferenceForPublic(value, context)
  }

  if (isRecord(value)) {
    return sanitizeMediaReferenceForPublic(value, context)
  }

  return null
}

export const publicDealSelect = {
  title: true,
  slug: true,
  bestUse: true,
  websiteVisibility: true,
  dealStatus: true,
  market: true,
  area: true,
  city: true,
  county: true,
  zip: true,
  showExactAddressPublicly: true,
  exactAddress: true,
  // Selected for sanitizer-only use. Public helpers must pass raw results through
  // sanitizeDealForPublic before returning; exact coordinates are exposed only when
  // showExactAddressPublicly is explicitly true.
  mapLocation: {
    latitude: true,
    longitude: true,
  },
  propertyDetails: {
    propertyType: true,
    units: true,
    beds: true,
    baths: true,
    sqft: true,
    lotSize: true,
    yearBuilt: true,
    construction: true,
    occupancy: true,
  },
  financials: {
    askingPrice: true,
    arv: true,
    estimatedRehab: true,
    estimatedClosingCosts: true,
    marketRent: true,
    currentRent: true,
    estCapRate: true,
    potentialProfitOverride: true,
    potentialROIOverride: true,
    closedPrice: true,
  },
  summary: true,
  rehabScope: true,
  conditionSummary: true,
  saleComps: {
    id: true,
    label: true,
    value: true,
    note: true,
  },
  rentalComps: {
    id: true,
    label: true,
    value: true,
    note: true,
  },
  featureTags: true,
  coverPhoto: true,
  photos: true,
  videoTourUrl: true,
  disclaimer: true,
  closedAt: true,
  publishedAt: true,
  updatedAt: true,
} satisfies DealsSelect

export const publicPageSelect = {
  title: true,
  slug: true,
  surface: true,
  status: true,
  summary: true,
  sections: {
    sectionType: true,
    eyebrow: true,
    heading: true,
    body: true,
    image: true,
    ctaLabel: true,
    ctaHref: true,
    sortOrder: true,
  },
  navigation: {
    showInNav: true,
    navLabel: true,
    sortOrder: true,
  },
  seo: {
    title: true,
    description: true,
    canonicalPath: true,
    noIndex: true,
  },
  publishedAt: true,
  updatedAt: true,
} satisfies PagesSelect

export const publicFAQSelect = {
  question: true,
  answer: true,
  surface: true,
  status: true,
  sortOrder: true,
  relatedPage: true,
} satisfies FaqsSelect

export const publicMarketSelect = {
  name: true,
  slug: true,
  county: true,
  sortOrder: true,
  enabled: true,
  description: true,
} satisfies MarketsSelect

export const publicSiteSettingsSelect = {
  label: true,
  surface: true,
  isPublic: true,
  navigation: {
    label: true,
    href: true,
    surface: true,
    sortOrder: true,
  },
  footerDisclaimer: true,
  publicContactLabel: true,
  socialLinks: {
    label: true,
    href: true,
  },
  seoDefaults: {
    title: true,
    description: true,
    openGraphImage: true,
  },
  updatedAt: true,
} satisfies SiteSettingsSelect

export const publicPayloadQueryPredicates = Object.freeze({
  deals: publicDealVisibilityWhere,
  activeDeals: publicActiveDealsWhere,
  soldProofDeals: publicSoldProofDealsWhere,
  faqs: publishedFAQsWhere,
  markets: enabledMarketsWhere,
  pages: publishedPagesWhere,
  siteSettings: publicSiteSettingsWhere,
})

const sanitizePageForPublic = <TPage extends Record<string, unknown>>(page: TPage): Record<string, unknown> | null => {
  if (page.status !== 'published') {
    return null
  }

  const sanitized = pickKeys(page, [
    'id',
    'title',
    'slug',
    'surface',
    'status',
    'summary',
    'publishedAt',
    'updatedAt',
  ])

  if (isRecord(page.navigation)) {
    sanitized.navigation = pickKeys(page.navigation, ['showInNav', 'navLabel', 'sortOrder'])
  }

  if (isRecord(page.seo)) {
    sanitized.seo = pickKeys(page.seo, ['title', 'description', 'canonicalPath', 'noIndex'])
  }

  sanitized.sections = Array.isArray(page.sections)
    ? page.sections
        .map((section) => {
          if (!isRecord(section)) {
            return null
          }

          const sanitizedSection = pickKeys(section, [
            'id',
            'sectionType',
            'eyebrow',
            'heading',
            'body',
            'ctaLabel',
            'ctaHref',
            'sortOrder',
          ])

          const image = sanitizeUploadReference(section.image, { page })
          if (image) {
            sanitizedSection.image = image
          }

          return sanitizedSection
        })
        .filter((section): section is Record<string, unknown> => section !== null)
    : []

  return sanitized
}

const sanitizeFAQForPublic = <TFAQ extends Record<string, unknown>>(faq: TFAQ): Record<string, unknown> | null => {
  if (faq.status !== 'published') {
    return null
  }

  const sanitized = pickKeys(faq, ['id', 'question', 'answer', 'surface', 'status', 'sortOrder'])

  if (typeof faq.relatedPage === 'number' || typeof faq.relatedPage === 'string') {
    sanitized.relatedPage = faq.relatedPage
  } else if (isRecord(faq.relatedPage)) {
    sanitized.relatedPage = pickKeys(faq.relatedPage, ['id', 'title', 'slug', 'surface', 'status'])
  }

  return sanitized
}

const sanitizeMarketForPublic = <TMarket extends Record<string, unknown>>(
  market: TMarket,
): Record<string, unknown> | null => {
  if (market.enabled !== true) {
    return null
  }

  return pickKeys(market, ['id', 'name', 'slug', 'county', 'sortOrder', 'enabled', 'description'])
}

export const sanitizeSiteSettingsForPublic = <TSettings extends Record<string, unknown>>(
  settings: TSettings,
): Record<string, unknown> | null => {
  if (settings.isPublic !== true) {
    return null
  }

  const sanitized = pickKeys(settings, [
    'id',
    'label',
    'surface',
    'isPublic',
    'footerDisclaimer',
    'publicContactLabel',
    'updatedAt',
  ])

  sanitized.navigation = Array.isArray(settings.navigation)
    ? settings.navigation
        .map((navItem) =>
          isRecord(navItem) ? pickKeys(navItem, ['id', 'label', 'href', 'surface', 'sortOrder']) : null,
        )
        .filter((navItem): navItem is Record<string, unknown> => navItem !== null)
    : []

  sanitized.socialLinks = Array.isArray(settings.socialLinks)
    ? settings.socialLinks
        .map((socialLink) =>
          isRecord(socialLink) ? pickKeys(socialLink, ['id', 'label', 'href']) : null,
        )
        .filter((socialLink): socialLink is Record<string, unknown> => socialLink !== null)
    : []

  if (isRecord(settings.seoDefaults)) {
    sanitized.seoDefaults = pickKeys(settings.seoDefaults, ['title', 'description'])
    const openGraphImage = sanitizeUploadReference(settings.seoDefaults.openGraphImage, {})
    if (openGraphImage && isRecord(sanitized.seoDefaults)) {
      sanitized.seoDefaults.openGraphImage = openGraphImage
    }
  }

  return sanitized
}

// Deals are fetched at depth 0 (media as ids), then referenced media is resolved with a
// safe-field select before sanitization so public deals can emit app-mediated image URLs.
const sanitizePublicDealDocs = async <TDoc extends DealVisibilityInput>(
  payload: Payload,
  result: { docs: TDoc[] },
) =>
  sanitizeDocs(
    { ...result, docs: await attachPublicDealMedia(payload, result.docs) },
    sanitizeDealForPublic,
  )

export const listPublicActiveDeals = async (
  payload: Payload,
  options: PublicQueryOptions = {},
) =>
  sanitizePublicDealDocs(
    payload,
    await payload.find({
      collection: 'deals',
      depth: clampPublicDepth(options.depth),
      limit: clampPublicLimit(options.limit, 24),
      overrideAccess: false,
      page: clampPublicPage(options.page),
      select: publicDealSelect,
      sort: '-publishedAt',
      where: publicActiveDealsWhere,
    }),
  )

export const listPublicSoldProofDeals = async (
  payload: Payload,
  options: PublicQueryOptions = {},
) =>
  sanitizePublicDealDocs(
    payload,
    await payload.find({
      collection: 'deals',
      depth: clampPublicDepth(options.depth),
      limit: clampPublicLimit(options.limit, 12),
      overrideAccess: false,
      page: clampPublicPage(options.page),
      select: publicDealSelect,
      sort: '-closedAt',
      where: publicSoldProofDealsWhere,
    }),
  )

const uniqueSlugCandidates = (candidates: string[]) =>
  candidates.filter((candidate, index, all) => candidate.length > 0 && all.indexOf(candidate) === index)

const legacySlugCandidatesFor = (slug: string, normalizedSlug: string) => {
  let decodedSlug = slug
  try {
    decodedSlug = decodeURIComponent(slug)
  } catch {
    decodedSlug = slug
  }

  const spacedSlug = normalizedSlug.replace(/-/g, ' ')
  const titleSpacedSlug = spacedSlug.replace(/\b[a-z]/g, (letter) => letter.toUpperCase())

  return uniqueSlugCandidates([normalizedSlug, decodedSlug, slug, spacedSlug, titleSpacedSlug])
}

export const getPublicDealBySlug = async (
  payload: Payload,
  slug: string,
  options: PublicQueryOptions = {},
) => {
  const normalizedSlug = normalizeDealSlugInput(slug)
  const findByExactSlug = async (candidateSlug: string) =>
    payload.find({
      collection: 'deals',
      depth: clampPublicDepth(options.depth),
      limit: 1,
      overrideAccess: false,
      page: 1,
      select: publicDealSelect,
      where: andWhere(publicDealVisibilityWhere, {
        slug: {
          equals: candidateSlug,
        },
      }),
    })

  let result = await findByExactSlug(normalizedSlug)

  // Legacy production deals were easy to save with title-cased/space-containing slugs.
  // Resolve a small set of deterministic legacy forms instead of scanning public deals on every 404.
  for (const candidateSlug of legacySlugCandidatesFor(slug, normalizedSlug)) {
    if (result.docs.length > 0 || candidateSlug === normalizedSlug) {
      continue
    }
    result = await findByExactSlug(candidateSlug)
  }

  const [doc] = await attachPublicDealMedia(payload, result.docs.slice(0, 1))
  return sanitizeDealForPublic(doc)
}

export const listPublishedPages = async (
  payload: Payload,
  options: PublicSurfaceQueryOptions = {},
) =>
  sanitizeDocs(
    await payload.find({
      collection: 'pages',
      depth: clampPublicDepth(options.depth),
      limit: clampPublicLimit(options.limit, 50),
      overrideAccess: false,
      page: clampPublicPage(options.page),
      select: publicPageSelect,
      sort: 'navigation.sortOrder',
      where: withOptionalWhere(publishedPagesWhere, surfaceWhere(options.surface)),
    }),
    sanitizePageForPublic,
  )

export const getPublishedPageBySlug = async (
  payload: Payload,
  slug: string,
  options: PublicSurfaceQueryOptions = {},
) => {
  const surfaceClause = surfaceWhere(options.surface)
  const result = await payload.find({
    collection: 'pages',
    depth: clampPublicDepth(options.depth),
    limit: 1,
    overrideAccess: false,
    page: 1,
    select: publicPageSelect,
    where: andWhere(
      publishedPagesWhere,
      {
        slug: {
          equals: slug,
        },
      },
      ...(surfaceClause ? [surfaceClause] : []),
    ),
  })

  return result.docs[0] ? sanitizePageForPublic(result.docs[0]) : null
}

export const listPublishedFAQs = async (
  payload: Payload,
  options: PublicSurfaceQueryOptions = {},
) =>
  sanitizeDocs(
    await payload.find({
      collection: 'faqs',
      depth: clampPublicDepth(options.depth),
      limit: clampPublicLimit(options.limit, 50),
      overrideAccess: false,
      page: clampPublicPage(options.page),
      select: publicFAQSelect,
      sort: 'sortOrder',
      where: withOptionalWhere(publishedFAQsWhere, surfaceWhere(options.surface)),
    }),
    sanitizeFAQForPublic,
  )

export const listEnabledMarkets = async (payload: Payload, options: PublicQueryOptions = {}) =>
  sanitizeDocs(
    await payload.find({
      collection: 'markets',
      depth: clampPublicDepth(options.depth),
      limit: clampPublicLimit(options.limit, 100),
      overrideAccess: false,
      page: clampPublicPage(options.page),
      select: publicMarketSelect,
      sort: 'sortOrder',
      where: enabledMarketsWhere,
    }),
    sanitizeMarketForPublic,
  )

export const listPublicSiteSettings = async (
  payload: Payload,
  options: PublicSurfaceQueryOptions = {},
) =>
  sanitizeDocs(
    await payload.find({
      collection: 'site-settings',
      depth: clampPublicDepth(options.depth),
      limit: clampPublicLimit(options.limit, 10),
      overrideAccess: false,
      page: clampPublicPage(options.page),
      select: publicSiteSettingsSelect,
      where: withOptionalWhere(publicSiteSettingsWhere, surfaceWhere(options.surface)),
    }),
    sanitizeSiteSettingsForPublic,
  )
