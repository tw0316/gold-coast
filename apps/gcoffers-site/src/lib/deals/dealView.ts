import type { PublicMediaReference } from '../media/publicMedia'
import { calculateDealFinancials, estimateCapRate, type DealFinancialSummary } from './financials'
import { toDealSlug } from './slug'
import {
  BEST_USE_LABELS,
  FEATURE_TAG_LABELS,
  PROPERTY_TYPE_LABELS,
  labelsFor,
} from './taxonomy'
import { getPublicLocationLabel, isExactAddressPublic, type DealVisibilityInput, type PublicDeal } from './visibility'

export type BuyerHeroTone = 'blue' | 'gold' | 'green' | 'slate'

export type BuyerHeroVisual = {
  icon: string
  label: string
  tone: BuyerHeroTone
}

export type BuyerPropertyDetails = {
  propertyType: string | null
  propertyTypeLabel: string | null
  units: number | null
  beds: number | null
  baths: number | null
  sqft: number | null
  lotSize: string | null
  yearBuilt: number | null
  construction: string | null
  occupancy: string | null
}

export type BuyerFinancials = {
  askingPrice: number | null
  arv: number | null
  estimatedRehab: number | null
  estimatedClosingCosts: number | null
  marketRent: number | null
  currentRent: number | null
  estCapRate: number | null
  potentialProfitOverride: number | null
  potentialROIOverride: number | null
  closedPrice: number | null
}

export type BuyerMapLocation = {
  latitude: number
  longitude: number
  source: 'exact' | 'county-fallback'
}

export type BuyerDealComp = {
  id?: string | null
  label: string
  note: string | null
  value: string
}

export type BuyerPublicDeal = {
  id: string
  title: string
  slug: string
  bestUse: string[]
  bestUseLabels: string[]
  dealStatus: string
  statusLabel: string
  locationLabel: string
  county: string | null
  mapLocation: BuyerMapLocation
  propertyDetails: BuyerPropertyDetails
  financials: BuyerFinancials
  calculatedFinancials: DealFinancialSummary
  capRate: number | null
  summary: string
  rehabScope: string
  conditionSummary: string | null
  saleComps: BuyerDealComp[]
  rentalComps: BuyerDealComp[]
  disclaimer: string
  featureTags: string[]
  featureTagLabels: string[]
  coverPhoto: PublicMediaReference | null
  photos: PublicMediaReference[]
  videoTourUrl: string | null
  heroVisual: BuyerHeroVisual
  publishedAt: string
  closedAt: string | null
  exactAddress: string | null
}

const statusLabels: Record<string, string> = {
  available: 'Direct Deal',
  coming_soon: 'Coming Soon',
  sold: 'Sold',
  under_contract: 'Under Contract',
}

export const getDealStatusLabel = (dealStatus: string): string =>
  statusLabels[dealStatus] ?? dealStatus

export const isDealOpenForInterest = (deal: BuyerPublicDeal): boolean =>
  deal.dealStatus === 'available' ||
  deal.dealStatus === 'coming_soon' ||
  deal.dealStatus === 'under_contract'

const heroToneByStatus: Record<string, BuyerHeroTone> = {
  available: 'gold',
  coming_soon: 'blue',
  sold: 'green',
  under_contract: 'slate',
}

const heroIconByPropertyType: Record<string, string> = {
  single_family: '🏡',
  condo: '🏢',
  townhouse: '🏘️',
  duplex: '🏘️',
  multifamily: '🏢',
  land: '🌴',
}

const countyFallbackMapLocations: Record<string, Omit<BuyerMapLocation, 'source'>> = {
  broward: { latitude: 26.1901, longitude: -80.3659 },
  'miami-dade': { latitude: 25.7617, longitude: -80.1918 },
  'palm-beach': { latitude: 26.7056, longitude: -80.0364 },
}
const defaultFallbackMapLocation = countyFallbackMapLocations.broward

export const deriveHeroVisual = (
  propertyType: string | null,
  dealStatus: string,
): BuyerHeroVisual => ({
  icon: (propertyType && heroIconByPropertyType[propertyType]) || '🏠',
  label: (propertyType && PROPERTY_TYPE_LABELS[propertyType]) || 'Property',
  tone: heroToneByStatus[dealStatus] ?? 'slate',
})

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback

const asNullableString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null

const asNullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

const asMediaReference = (value: unknown): PublicMediaReference | null => {
  if (value && typeof value === 'object' && 'url' in (value as Record<string, unknown>)) {
    return value as PublicMediaReference
  }

  return null
}

const normalizeCountyKey = (county: string | null | undefined): string | null => {
  if (!county) {
    return null
  }

  const normalized = county.toLowerCase().replace(/[-_]+/g, ' ').replace(/ county/g, '').trim()

  if (normalized.includes('miami')) {
    return 'miami-dade'
  }
  if (normalized.includes('broward')) {
    return 'broward'
  }
  if (normalized.includes('palm beach')) {
    return 'palm-beach'
  }

  return normalized.length > 0 ? normalized : null
}

const asMapLocation = (
  value: unknown,
  county: string | null,
): BuyerMapLocation => {
  const maybeLocation = value && typeof value === 'object' ? value as Record<string, unknown> : null
  const latitude = asNullableNumber(maybeLocation?.latitude)
  const longitude = asNullableNumber(maybeLocation?.longitude)

  if (latitude !== null && longitude !== null) {
    return {
      latitude,
      longitude,
      source: 'exact',
    }
  }

  const countyKey = normalizeCountyKey(county)
  const fallback = (countyKey ? countyFallbackMapLocations[countyKey] : null) ?? defaultFallbackMapLocation

  return {
    ...fallback,
    source: 'county-fallback',
  }
}

const asCompArray = (value: unknown): BuyerDealComp[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return []
    }

    const record = item as Record<string, unknown>
    const label = asNullableString(record.label)
    const rawValue = record.value
    const compValue = typeof rawValue === 'number' && Number.isFinite(rawValue)
      ? new Intl.NumberFormat('en-US', {
          currency: 'USD',
          maximumFractionDigits: 0,
          style: 'currency',
        }).format(rawValue)
      : asNullableString(rawValue)

    if (!label || !compValue) {
      return []
    }

    return [{
      id: asNullableString(record.id),
      label,
      value: compValue,
      note: asNullableString(record.note),
    }]
  })
}

// videoTourUrl is free CMS text rendered into a public <a href>. Only allow http(s) so a
// stray value like "javascript:..." can never become a clickable script URL.
const asExternalHttpUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : null
}

// Map an already-sanitized public deal (Payload doc or fixture fallback) into the
// buyer view-model the components render. All private fields are assumed already
// stripped by sanitizeDealForPublic; this layer only shapes display data.
export const toBuyerView = (deal: PublicDeal): BuyerPublicDeal => {
  const rawPropertyDetails = (deal.propertyDetails ?? {}) as Record<string, unknown>
  const rawFinancials = (deal.financials ?? {}) as Record<string, unknown>
  const rawMapLocation = isExactAddressPublic(deal) ? (deal.mapLocation ?? {}) as Record<string, unknown> : {}

  const propertyType = asNullableString(rawPropertyDetails.propertyType)
  const dealStatus = asString(deal.dealStatus)
  const county = asNullableString(deal.county)

  const financials: BuyerFinancials = {
    askingPrice: asNullableNumber(rawFinancials.askingPrice),
    arv: asNullableNumber(rawFinancials.arv),
    estimatedRehab: asNullableNumber(rawFinancials.estimatedRehab),
    estimatedClosingCosts: asNullableNumber(rawFinancials.estimatedClosingCosts),
    marketRent: asNullableNumber(rawFinancials.marketRent),
    currentRent: asNullableNumber(rawFinancials.currentRent),
    estCapRate: asNullableNumber(rawFinancials.estCapRate),
    potentialProfitOverride: asNullableNumber(rawFinancials.potentialProfitOverride),
    potentialROIOverride: asNullableNumber(rawFinancials.potentialROIOverride),
    closedPrice: asNullableNumber(rawFinancials.closedPrice),
  }

  const bestUse = asStringArray(deal.bestUse)
  const featureTags = asStringArray(deal.featureTags)
  const photos = Array.isArray(deal.photos) ? deal.photos : []
  const coverPhoto = asMediaReference(deal.coverPhoto) ?? photos[0] ?? null
  const slug = toDealSlug(asString(deal.slug, asString(deal.title)))

  return {
    id: asString(deal.id, slug),
    title: asString(deal.title),
    slug,
    bestUse,
    bestUseLabels: labelsFor(bestUse, BEST_USE_LABELS),
    dealStatus,
    statusLabel: getDealStatusLabel(dealStatus),
    locationLabel: getPublicLocationLabel(deal as DealVisibilityInput),
    county,
    mapLocation: asMapLocation(rawMapLocation, county),
    propertyDetails: {
      propertyType,
      propertyTypeLabel: propertyType ? PROPERTY_TYPE_LABELS[propertyType] ?? null : null,
      units: asNullableNumber(rawPropertyDetails.units),
      beds: asNullableNumber(rawPropertyDetails.beds),
      baths: asNullableNumber(rawPropertyDetails.baths),
      sqft: asNullableNumber(rawPropertyDetails.sqft),
      lotSize: asNullableString(rawPropertyDetails.lotSize),
      yearBuilt: asNullableNumber(rawPropertyDetails.yearBuilt),
      construction: asNullableString(rawPropertyDetails.construction),
      occupancy: asNullableString(rawPropertyDetails.occupancy),
    },
    financials,
    calculatedFinancials: calculateDealFinancials({
      arv: financials.arv,
      askingPrice: financials.askingPrice,
      estimatedClosingCosts: financials.estimatedClosingCosts,
      estimatedRehab: financials.estimatedRehab,
    }),
    capRate: estimateCapRate({
      askingPrice: financials.askingPrice,
      estCapRate: financials.estCapRate,
      marketRent: financials.marketRent,
    }),
    summary: asString(deal.summary),
    rehabScope: asString(deal.rehabScope),
    conditionSummary: asNullableString(deal.conditionSummary),
    saleComps: asCompArray(deal.saleComps),
    rentalComps: asCompArray(deal.rentalComps),
    disclaimer: asString(deal.disclaimer),
    featureTags,
    featureTagLabels: labelsFor(featureTags, FEATURE_TAG_LABELS),
    coverPhoto,
    photos,
    videoTourUrl: asExternalHttpUrl(deal.videoTourUrl),
    heroVisual: deriveHeroVisual(propertyType, dealStatus),
    publishedAt: asString(deal.publishedAt),
    closedAt: asNullableString(deal.closedAt),
    exactAddress: asNullableString(deal.exactAddress),
  }
}
