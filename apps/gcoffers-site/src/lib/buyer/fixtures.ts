import {
  isPublicActiveDeal,
  isPublicDealVisible,
  isPublicSoldProofDeal,
  sanitizeDealForPublic,
  type DealVisibilityInput,
  type PublicDeal,
} from '../deals/visibility'

export type BuyerDealFixture = DealVisibilityInput & {
  id: string
  title: string
  slug: string
  bestUse?: string[]
  featureTags?: string[]
  propertyDetails?: {
    propertyType?: string
    units?: number
    beds?: number
    baths?: number
    sqft?: number
    lotSize?: string
    yearBuilt?: number
    construction?: string
    occupancy?: string
  }
  financials?: {
    askingPrice?: number
    arv?: number
    estimatedRehab?: number
    estimatedClosingCosts?: number
    marketRent?: number
    currentRent?: number
    estCapRate?: number
    potentialProfitOverride?: number
    potentialROIOverride?: number
    closedPrice?: number
  }
  summary?: string
  rehabScope?: string
  disclaimer?: string
  closedAt?: string
  publishedAt?: string
}

const readyPublicFixtureMedia = (id: string, alt: string) => ({
  accessPolicy: 'public_after_reference_check',
  alt,
  containsExactAddressOrPrivateDetails: false,
  id,
  mediaStatus: 'ready',
  thumbnailURL: 'REDACTED_RAW_THUMBNAIL_URL',
})

export const buyerDealFixtures: BuyerDealFixture[] = [
  {
    area: 'Central Broward',
    bestUse: ['fix_and_flip', 'buy_and_hold'],
    city: 'Fort Lauderdale area',
    county: 'Broward County',
    dealStatus: 'available',
    disclaimer:
      'Fixture deal for local buyer-page rendering only. Buyers must independently verify all numbers.',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    featureTags: ['cosmetic_reno', 'cash_only'],
    financials: {
      arv: 410000,
      askingPrice: 245000,
      estimatedClosingCosts: 9000,
      estimatedRehab: 62000,
      marketRent: 2800,
    },
    id: 'buyer-public-available',
    photos: [readyPublicFixtureMedia('buyer-fixture-available', 'Exterior placeholder for a public available deal')],
    propertyDetails: {
      baths: 2,
      beds: 3,
      construction: 'CBS',
      occupancy: 'vacant',
      propertyType: 'single_family',
      sqft: 1320,
      yearBuilt: 1978,
    },
    publishedAt: '2026-01-10T12:00:00.000Z',
    rehabScope: 'Cosmetic updates, kitchen refresh, bath updates, flooring, and paint.',
    showExactAddressPublicly: false,
    slug: 'sample-broward-rehab-opportunity',
    summary:
      'Public fixture for a value-add single-family opportunity in Broward County with room for cosmetic improvements.',
    title: 'Broward Rehab Opportunity',
    websiteVisibility: 'public',
    zip: 'REDACTED_ZIP',
  },
  {
    area: 'North Miami corridor',
    bestUse: ['fix_and_flip'],
    city: 'North Miami area',
    county: 'Miami-Dade County',
    dealStatus: 'coming_soon',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    financials: {
      arv: 520000,
      askingPrice: 330000,
      estimatedClosingCosts: 12000,
      estimatedRehab: 85000,
    },
    id: 'buyer-public-coming-soon',
    photos: [readyPublicFixtureMedia('buyer-fixture-coming-soon', 'Exterior placeholder for a coming soon public deal')],
    propertyDetails: {
      baths: 2,
      beds: 4,
      occupancy: 'unknown',
      propertyType: 'single_family',
      sqft: 1680,
    },
    publishedAt: '2026-01-08T12:00:00.000Z',
    showExactAddressPublicly: false,
    slug: 'sample-miami-dade-coming-soon',
    summary: 'Coming-soon public fixture with high-level location only until diligence materials are ready.',
    title: 'Miami-Dade Coming Soon Deal',
    websiteVisibility: 'public',
  },
  {
    area: 'Palm Beach County',
    bestUse: ['buy_and_hold', 'brrrr'],
    city: 'Palm Beach County',
    county: 'Palm Beach County',
    dealStatus: 'under_contract',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    featureTags: ['tenant_occupied'],
    financials: {
      arv: 360000,
      askingPrice: 238000,
      currentRent: 2100,
      estimatedClosingCosts: 8000,
      estimatedRehab: 52000,
      marketRent: 2600,
    },
    id: 'buyer-public-under-contract',
    photos: [
      readyPublicFixtureMedia(
        'buyer-fixture-under-contract',
        'Exterior placeholder for an under-contract public deal',
      ),
    ],
    propertyDetails: {
      baths: 2,
      beds: 4,
      occupancy: 'occupied',
      propertyType: 'duplex',
      sqft: 1760,
      units: 2,
    },
    publishedAt: '2026-01-06T12:00:00.000Z',
    showExactAddressPublicly: false,
    slug: 'sample-palm-beach-under-contract',
    summary: 'Under-contract public fixture retained in the active listing until status changes to sold.',
    title: 'Palm Beach Rental Candidate',
    websiteVisibility: 'public',
  },
  {
    area: 'Dania Beach area',
    bestUse: ['fix_and_flip'],
    city: 'Dania Beach area',
    closedAt: '2026-01-02T12:00:00.000Z',
    county: 'Broward County',
    dealStatus: 'sold',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    financials: {
      arv: 395000,
      closedPrice: 226000,
    },
    id: 'buyer-public-sold-proof',
    photos: [readyPublicFixtureMedia('buyer-fixture-sold-proof', 'Exterior placeholder for a sold proof deal')],
    propertyDetails: {
      baths: 2,
      beds: 3,
      propertyType: 'single_family',
      sqft: 1240,
    },
    showExactAddressPublicly: false,
    slug: 'sample-sold-proof-deal',
    summary: 'Sold public fixture used only as social proof, never in the active listing.',
    title: 'Closed Broward Assignment',
    websiteVisibility: 'public',
  },
  {
    area: 'Public address area',
    bestUse: ['land_bank', 'development'],
    city: 'Example City',
    county: 'Example County',
    dealStatus: 'available',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    financials: {
      askingPrice: 150000,
      estimatedClosingCosts: 5000,
      estimatedRehab: 0,
    },
    id: 'buyer-public-exact-address-enabled',
    propertyDetails: {
      lotSize: '0.25 acre',
      propertyType: 'land',
    },
    publishedAt: '2026-01-04T12:00:00.000Z',
    showExactAddressPublicly: true,
    slug: 'sample-public-address-disclosure',
    summary: 'Fixture demonstrating that exact address appears only when explicitly enabled.',
    title: 'Public Address Disclosure Example',
    websiteVisibility: 'public',
  },
  {
    area: 'Hidden area',
    city: 'Hidden City',
    dealStatus: 'available',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    id: 'buyer-hidden-internal-only',
    showExactAddressPublicly: false,
    slug: 'hidden-internal-only-fixture',
    title: 'Hidden Internal Only Fixture',
    websiteVisibility: 'hidden',
  },
  {
    area: 'Preview area',
    dealStatus: 'available',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    id: 'buyer-preview-fixture',
    showExactAddressPublicly: false,
    slug: 'preview-fixture',
    title: 'Preview Fixture',
    websiteVisibility: 'preview',
  },
  {
    area: 'Archived area',
    dealStatus: 'available',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    id: 'buyer-archived-fixture',
    showExactAddressPublicly: false,
    slug: 'archived-fixture',
    title: 'Archived Fixture',
    websiteVisibility: 'archived',
  },
  {
    area: 'Draft area',
    dealStatus: 'draft',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    id: 'buyer-draft-fixture',
    showExactAddressPublicly: false,
    slug: 'draft-fixture',
    title: 'Draft Fixture',
    websiteVisibility: 'public',
  },
  {
    area: 'Cancelled area',
    dealStatus: 'cancelled',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    id: 'buyer-cancelled-fixture',
    showExactAddressPublicly: false,
    slug: 'cancelled-fixture',
    title: 'Cancelled Fixture',
    websiteVisibility: 'public',
  },
]

const sanitizeFixture = (deal: BuyerDealFixture): PublicDeal => {
  const sanitized = sanitizeDealForPublic(deal)

  if (!sanitized) {
    throw new Error(`Fixture ${deal.id} unexpectedly failed public deal sanitization`)
  }

  return sanitized
}

export const getBuyerFallbackActiveDeals = (): PublicDeal[] =>
  buyerDealFixtures.filter(isPublicActiveDeal).map(sanitizeFixture)

export const getBuyerFallbackSoldProofDeals = (): PublicDeal[] =>
  buyerDealFixtures.filter(isPublicSoldProofDeal).map(sanitizeFixture)

export const getBuyerFallbackDealBySlug = (slug: string): PublicDeal | null => {
  const deal = buyerDealFixtures.find((candidate) => candidate.slug === slug)

  return deal ? sanitizeDealForPublic(deal) : null
}

export const getBuyerFallbackDealSlugs = (): string[] =>
  buyerDealFixtures.filter(isPublicDealVisible).map((deal) => deal.slug)
