import type { Where } from 'payload'

import {
  sanitizeMediaReferenceForPublic,
  type MediaVisibilityInput,
  type PublicMediaReference,
} from '../media/publicMedia'

export const WEBSITE_VISIBILITIES = ['hidden', 'preview', 'public', 'archived'] as const

export type WebsiteVisibility = (typeof WEBSITE_VISIBILITIES)[number]

export const DEAL_STATUSES = [
  'draft',
  'coming_soon',
  'available',
  'under_contract',
  'sold',
  'cancelled',
] as const

export type DealStatus = (typeof DEAL_STATUSES)[number]

export const PUBLIC_DEAL_STATUSES = [
  'coming_soon',
  'available',
  'under_contract',
  'sold',
] as const

export const PUBLIC_ACTIVE_DEAL_STATUSES = [
  'coming_soon',
  'available',
  'under_contract',
] as const

export const PUBLIC_SOLD_DEAL_STATUS = 'sold' as const

export type PublicDealStatus = (typeof PUBLIC_DEAL_STATUSES)[number]
export type PublicActiveDealStatus = (typeof PUBLIC_ACTIVE_DEAL_STATUSES)[number]

export type DealMapLocationInput = {
  latitude?: number | null
  longitude?: number | null
}

export type DealCompInput = {
  label?: string | null
  value?: string | number | null
  note?: string | null
}

export type DealVisibilityInput = {
  area?: string | null
  city?: string | null
  conditionSummary?: string | null
  county?: string | null
  coverPhoto?: MediaVisibilityInput | number | string | null
  dealStatus?: string | null
  exactAddress?: string | null
  mapLocation?: DealMapLocationInput | null
  photos?: (MediaVisibilityInput | number | string | null | undefined)[] | null
  rentalComps?: DealCompInput[] | null
  saleComps?: DealCompInput[] | null
  showExactAddressPublicly?: boolean | null
  websiteVisibility?: string | null
  zip?: string | null
}

export type PublicDeal = Record<string, unknown> & {
  coverPhoto?: PublicMediaReference | null
  exactAddress?: string | null
  mapLocation?: DealMapLocationInput | null
  photos?: PublicMediaReference[]
  rentalComps?: DealCompInput[] | null
  saleComps?: DealCompInput[] | null
}

export const publicDealVisibilityWhere: Where = {
  and: [
    {
      websiteVisibility: {
        equals: 'public',
      },
    },
    {
      dealStatus: {
        in: [...PUBLIC_DEAL_STATUSES],
      },
    },
  ],
}

export const publicActiveDealsWhere: Where = {
  and: [
    {
      websiteVisibility: {
        equals: 'public',
      },
    },
    {
      dealStatus: {
        in: [...PUBLIC_ACTIVE_DEAL_STATUSES],
      },
    },
  ],
}

export const publicSoldProofDealsWhere: Where = {
  and: [
    {
      websiteVisibility: {
        equals: 'public',
      },
    },
    {
      dealStatus: {
        equals: PUBLIC_SOLD_DEAL_STATUS,
      },
    },
  ],
}

export const isPublicDealVisible = (deal: DealVisibilityInput): boolean =>
  deal.websiteVisibility === 'public' &&
  PUBLIC_DEAL_STATUSES.includes(deal.dealStatus as PublicDealStatus)

export const isPublicActiveDeal = (deal: DealVisibilityInput): boolean =>
  deal.websiteVisibility === 'public' &&
  PUBLIC_ACTIVE_DEAL_STATUSES.includes(deal.dealStatus as PublicActiveDealStatus)

export const isPublicSoldProofDeal = (deal: DealVisibilityInput): boolean =>
  deal.websiteVisibility === 'public' && deal.dealStatus === PUBLIC_SOLD_DEAL_STATUS

export const isExactAddressPublic = (deal: DealVisibilityInput): boolean =>
  deal.showExactAddressPublicly === true

const publicDealAllowedKeys = new Set([
  'id',
  'title',
  'slug',
  'bestUse',
  'dealStatus',
  'market',
  'area',
  'city',
  'conditionSummary',
  'county',
  'zip',
  // exactAddress and mapLocation are intentionally excluded here; they are
  // conditionally copied below only behind isExactAddressPublic.
  'propertyDetails',
  'financials',
  'summary',
  'rehabScope',
  'saleComps',
  'rentalComps',
  'featureTags',
  'photos',
  'videoTourUrl',
  'disclaimer',
  'closedAt',
  'publishedAt',
  'updatedAt',
])

export const sanitizeDealForPublic = <TDeal extends DealVisibilityInput>(
  deal: TDeal | null | undefined,
): PublicDeal | null => {
  if (!deal || !isPublicDealVisible(deal)) {
    return null
  }

  const sanitized: PublicDeal = {}

  for (const [key, value] of Object.entries(deal as Record<string, unknown>)) {
    if (publicDealAllowedKeys.has(key)) {
      sanitized[key] = value
    }
  }

  // Some public queries fetch exactAddress/mapLocation so this sanitizer can make the disclosure decision.
  // Raw selected deal documents must never be returned from public surfaces without passing through this gate.
  if (isExactAddressPublic(deal) && typeof deal.exactAddress === 'string') {
    sanitized.exactAddress = deal.exactAddress
  }

  if (isExactAddressPublic(deal) && deal.mapLocation) {
    sanitized.mapLocation = deal.mapLocation
  }

  sanitized.photos = Array.isArray(deal.photos)
    ? deal.photos
        .map((photo) => sanitizeMediaReferenceForPublic(photo, { deal }))
        .filter((photo): photo is PublicMediaReference => photo !== null)
    : []

  const sanitizedCover = sanitizeMediaReferenceForPublic(deal.coverPhoto, { deal })
  if (sanitizedCover) {
    sanitized.coverPhoto = sanitizedCover
  }

  return sanitized
}

export const getPublicLocationLabel = (deal: DealVisibilityInput): string => {
  if (isExactAddressPublic(deal) && deal.exactAddress) {
    return deal.exactAddress
  }

  return [deal.area, deal.city, deal.county, deal.zip]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(', ')
}
