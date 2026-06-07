import type { DealVisibilityInput } from '../lib/deals/visibility'

export type BuyerDealType = 'assignment' | 'double_close'

export type BuyerDealPropertyDetails = {
  baths?: number | null
  beds?: number | null
  construction?: string | null
  lotSize?: string | null
  occupancy?: string | null
  propertyType: 'Single Family' | 'Duplex' | 'Condo/Townhouse' | 'Small Multifamily'
  sqft?: number | null
  yearBuilt?: number | null
}

export type BuyerDealFinancials = {
  arv?: number | null
  askingPrice?: number | null
  closedPrice?: number | null
  estimatedClosingCosts?: number | null
  estimatedRehab?: number | null
  potentialProfitOverride?: number | null
  potentialROIOverride?: number | null
}

export type BuyerDealHeroVisual = {
  icon: string
  label: string
  tone: 'blue' | 'gold' | 'green' | 'slate'
}

export type BuyerDealFixture = DealVisibilityInput & {
  dealType: BuyerDealType
  disclaimer: string
  financials: BuyerDealFinancials
  heroVisual: BuyerDealHeroVisual
  id: string
  propertyDetails: BuyerDealPropertyDetails
  publishedAt: string
  rehabScope: string
  slug: string
  summary: string
  title: string
  closedAt?: string
}

const buyerDealDisclaimer =
  'All numbers are estimates and placeholders for the migration baseline. Buyers must verify ARV, repair budget, rents, taxes, insurance, liens, permits, code issues, occupancy, title, financing, and closing costs before making any decision.'

export const buyerDealFixtures: BuyerDealFixture[] = [
  {
    id: 'buyer-public-coming-soon',
    title: 'Broward County SFH Renovation Opportunity',
    slug: 'broward-county-sfh-renovation-opportunity',
    dealType: 'assignment',
    websiteVisibility: 'public',
    dealStatus: 'coming_soon',
    area: 'Central Broward',
    neighborhood: 'Neighborhood-level location only',
    city: 'Broward County',
    county: 'Broward',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: false,
    propertyDetails: {
      propertyType: 'Single Family',
      beds: 3,
      baths: 2,
      sqft: 1280,
      lotSize: 'Standard residential lot',
      yearBuilt: 1970,
      construction: 'Concrete block or similar; verify during diligence',
      occupancy: 'To be confirmed',
    },
    financials: {
      askingPrice: 245000,
      arv: 390000,
      estimatedRehab: 62000,
      estimatedClosingCosts: 11000,
    },
    summary:
      'Placeholder public coming-soon deal used to prove the buyer listing can show public pipeline inventory without exposing an exact address.',
    rehabScope:
      'Cosmetic and systems scope to be verified. Baseline copy intentionally avoids property-specific private details.',
    heroVisual: {
      icon: '🏡',
      label: 'Exterior preview placeholder',
      tone: 'blue',
    },
    disclaimer: buyerDealDisclaimer,
    publishedAt: '2026-06-05T12:00:00.000Z',
  },
  {
    id: 'buyer-public-available',
    title: 'Miami-Dade Value-Add Starter Deal',
    slug: 'miami-dade-value-add-starter-deal',
    dealType: 'assignment',
    websiteVisibility: 'public',
    dealStatus: 'available',
    area: 'North Miami-Dade',
    neighborhood: 'Neighborhood-level location only',
    city: 'Miami-Dade County',
    county: 'Miami-Dade',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: false,
    propertyDetails: {
      propertyType: 'Single Family',
      beds: 3,
      baths: 1,
      sqft: 1180,
      lotSize: 'Residential lot; verify survey and zoning',
      yearBuilt: 1965,
      construction: 'Verify during diligence',
      occupancy: 'Vacancy status to be confirmed',
    },
    financials: {
      askingPrice: 215000,
      arv: 335000,
      estimatedRehab: 48000,
      estimatedClosingCosts: 9500,
    },
    summary:
      'Placeholder available deal for proving public buyer deal cards, detail rendering, and interest CTA contracts.',
    rehabScope:
      'Kitchen, bath, paint, flooring, exterior cleanup, and contingency review. Buyers must confirm all costs independently.',
    heroVisual: {
      icon: '🔨',
      label: 'Renovation placeholder',
      tone: 'gold',
    },
    disclaimer: buyerDealDisclaimer,
    publishedAt: '2026-06-05T11:00:00.000Z',
  },
  {
    id: 'buyer-public-under-contract',
    title: 'Palm Beach County Duplex Assignment',
    slug: 'palm-beach-county-duplex-assignment',
    dealType: 'assignment',
    websiteVisibility: 'public',
    dealStatus: 'under_contract',
    area: 'Palm Beach County',
    neighborhood: 'Neighborhood-level location only',
    city: 'Palm Beach County',
    county: 'Palm Beach',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: false,
    propertyDetails: {
      propertyType: 'Duplex',
      beds: 4,
      baths: 2,
      sqft: 1760,
      lotSize: 'Multifamily lot; verify zoning',
      yearBuilt: 1980,
      construction: 'Verify during diligence',
      occupancy: 'Tenant status to be confirmed',
    },
    financials: {
      askingPrice: 325000,
      arv: 510000,
      estimatedRehab: 85000,
      estimatedClosingCosts: 14000,
    },
    summary:
      'Placeholder under-contract deal that remains visible in the active listing but clearly labeled for buyer expectations.',
    rehabScope:
      'Two-unit renovation scope, rent roll, occupancy, leases, and code status require independent buyer diligence.',
    heroVisual: {
      icon: '🏘️',
      label: 'Small multifamily placeholder',
      tone: 'slate',
    },
    disclaimer: buyerDealDisclaimer,
    publishedAt: '2026-06-05T10:00:00.000Z',
  },
  {
    id: 'buyer-public-sold',
    title: 'Closed Broward Buyer Proof Deal',
    slug: 'closed-broward-buyer-proof-deal',
    dealType: 'double_close',
    websiteVisibility: 'public',
    dealStatus: 'sold',
    area: 'Broward County',
    neighborhood: 'Neighborhood-level location only',
    city: 'Broward County',
    county: 'Broward',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: false,
    propertyDetails: {
      propertyType: 'Single Family',
      beds: 3,
      baths: 2,
      sqft: 1360,
      lotSize: 'Residential lot',
      yearBuilt: 1978,
      construction: 'Verify from closing file',
      occupancy: 'Closed transaction placeholder',
    },
    financials: {
      askingPrice: 230000,
      arv: 365000,
      estimatedRehab: 52000,
      estimatedClosingCosts: 10000,
      closedPrice: 230000,
    },
    summary:
      'Placeholder sold social-proof deal. The public card uses broad location and safe placeholder metrics only.',
    rehabScope:
      'Closed proof summary intentionally avoids private seller, buyer, address, and document details.',
    heroVisual: {
      icon: '✅',
      label: 'Closed deal placeholder',
      tone: 'green',
    },
    disclaimer: buyerDealDisclaimer,
    publishedAt: '2026-06-04T12:00:00.000Z',
    closedAt: '2026-05-20T12:00:00.000Z',
  },
  {
    id: 'buyer-public-sold-second',
    title: 'Closed Miami-Dade Assignment Proof',
    slug: 'closed-miami-dade-assignment-proof',
    dealType: 'assignment',
    websiteVisibility: 'public',
    dealStatus: 'sold',
    area: 'Miami-Dade County',
    neighborhood: 'Neighborhood-level location only',
    city: 'Miami-Dade County',
    county: 'Miami-Dade',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: false,
    propertyDetails: {
      propertyType: 'Condo/Townhouse',
      beds: 2,
      baths: 2,
      sqft: 980,
      lotSize: 'Association-managed property; verify documents',
      yearBuilt: 1988,
      construction: 'Verify association records',
      occupancy: 'Closed transaction placeholder',
    },
    financials: {
      askingPrice: 155000,
      arv: 245000,
      estimatedRehab: 28000,
      estimatedClosingCosts: 7000,
      closedPrice: 155000,
    },
    summary:
      'Second public sold placeholder used for social proof filtering and route-generation checks.',
    rehabScope:
      'Closed proof summary intentionally avoids private seller, buyer, address, and document details.',
    heroVisual: {
      icon: '🏢',
      label: 'Closed condo placeholder',
      tone: 'green',
    },
    disclaimer: buyerDealDisclaimer,
    publishedAt: '2026-06-04T11:00:00.000Z',
    closedAt: '2026-05-05T12:00:00.000Z',
  },
  {
    id: 'buyer-hidden-internal-only',
    title: 'Hidden Internal Buyer Deal',
    slug: 'hidden-internal-buyer-deal',
    dealType: 'assignment',
    websiteVisibility: 'hidden',
    dealStatus: 'available',
    area: 'Internal-only area placeholder',
    city: 'Internal-only city placeholder',
    county: 'Internal-only county placeholder',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: false,
    propertyDetails: {
      propertyType: 'Single Family',
    },
    financials: {},
    summary: 'Non-public fixture that must never render in buyer listing, detail, or slug helpers.',
    rehabScope: 'Non-public fixture.',
    heroVisual: {
      icon: '🚫',
      label: 'Hidden placeholder',
      tone: 'slate',
    },
    disclaimer: buyerDealDisclaimer,
    publishedAt: '2026-06-05T09:00:00.000Z',
  },
  {
    id: 'buyer-preview-deal',
    title: 'Preview Buyer Deal',
    slug: 'preview-buyer-deal',
    dealType: 'assignment',
    websiteVisibility: 'preview',
    dealStatus: 'available',
    area: 'Preview area placeholder',
    city: 'Preview city placeholder',
    county: 'Preview county placeholder',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: false,
    propertyDetails: {
      propertyType: 'Single Family',
    },
    financials: {},
    summary: 'Preview fixture that must not render publicly.',
    rehabScope: 'Preview fixture.',
    heroVisual: {
      icon: '👁️',
      label: 'Preview placeholder',
      tone: 'slate',
    },
    disclaimer: buyerDealDisclaimer,
    publishedAt: '2026-06-05T08:00:00.000Z',
  },
  {
    id: 'buyer-archived-deal',
    title: 'Archived Buyer Deal',
    slug: 'archived-buyer-deal',
    dealType: 'assignment',
    websiteVisibility: 'archived',
    dealStatus: 'available',
    area: 'Archived area placeholder',
    city: 'Archived city placeholder',
    county: 'Archived county placeholder',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: false,
    propertyDetails: {
      propertyType: 'Single Family',
    },
    financials: {},
    summary: 'Archived fixture that must not render publicly.',
    rehabScope: 'Archived fixture.',
    heroVisual: {
      icon: '📦',
      label: 'Archived placeholder',
      tone: 'slate',
    },
    disclaimer: buyerDealDisclaimer,
    publishedAt: '2026-06-05T07:00:00.000Z',
  },
  {
    id: 'buyer-draft-deal',
    title: 'Draft Buyer Deal',
    slug: 'draft-buyer-deal',
    dealType: 'assignment',
    websiteVisibility: 'public',
    dealStatus: 'draft',
    area: 'Draft area placeholder',
    city: 'Draft city placeholder',
    county: 'Draft county placeholder',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: false,
    propertyDetails: {
      propertyType: 'Single Family',
    },
    financials: {},
    summary: 'Draft fixture that must not render publicly even with public website visibility.',
    rehabScope: 'Draft fixture.',
    heroVisual: {
      icon: '📝',
      label: 'Draft placeholder',
      tone: 'slate',
    },
    disclaimer: buyerDealDisclaimer,
    publishedAt: '2026-06-05T06:00:00.000Z',
  },
  {
    id: 'buyer-cancelled-deal',
    title: 'Cancelled Buyer Deal',
    slug: 'cancelled-buyer-deal',
    dealType: 'assignment',
    websiteVisibility: 'public',
    dealStatus: 'cancelled',
    area: 'Cancelled area placeholder',
    city: 'Cancelled city placeholder',
    county: 'Cancelled county placeholder',
    exactAddress: 'REDACTED_EXACT_ADDRESS',
    showExactAddressPublicly: false,
    propertyDetails: {
      propertyType: 'Single Family',
    },
    financials: {},
    summary: 'Cancelled fixture that must not render publicly even with public website visibility.',
    rehabScope: 'Cancelled fixture.',
    heroVisual: {
      icon: '⛔',
      label: 'Cancelled placeholder',
      tone: 'slate',
    },
    disclaimer: buyerDealDisclaimer,
    publishedAt: '2026-06-05T05:00:00.000Z',
  },
]
