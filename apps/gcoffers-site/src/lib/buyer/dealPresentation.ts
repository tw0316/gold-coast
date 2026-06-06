import type { PublicMediaReference } from '../media/publicMedia'
import type { PublicDeal } from '../deals/visibility'
import { calculateDealFinancials } from '../deals/financials'

type UnknownRecord = Record<string, unknown>

type DealStat = {
  label: string
  value: string
}

const isRecord = (value: unknown): value is UnknownRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const getString = (source: UnknownRecord, key: string): string | null => {
  const value = source[key]
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

const getNumber = (source: UnknownRecord, key: string): number | null => {
  const value = source[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const getGroup = (source: UnknownRecord, key: string): UnknownRecord => {
  const value = source[key]
  return isRecord(value) ? value : {}
}

export const getDealSlug = (deal: PublicDeal): string => getString(deal, 'slug') ?? ''

export const getDealTitle = (deal: PublicDeal): string => getString(deal, 'title') ?? 'Off-market deal'

export const getDealSummary = (deal: PublicDeal): string | null => getString(deal, 'summary')

export const getDealRehabScope = (deal: PublicDeal): string | null => getString(deal, 'rehabScope')

export const getDealDisclaimer = (deal: PublicDeal): string =>
  getString(deal, 'disclaimer') ??
  'Deal information is provided for preliminary review only. Buyers are responsible for independent due diligence.'

export const getDealStatus = (deal: PublicDeal): string => getString(deal, 'dealStatus') ?? 'available'

export const formatDealStatusLabel = (status: string): string =>
  status
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')

export const getDealStatusClassName = (status: string): string => status.replaceAll('_', '-')

export const formatDealTypeLabel = (deal: PublicDeal): string =>
  formatDealStatusLabel(getString(deal, 'dealType') ?? 'wholesale')

export const getDealLocationLabel = (deal: PublicDeal): string => {
  const exactAddress = getString(deal, 'exactAddress')
  if (exactAddress) {
    return exactAddress
  }

  const neighborhoodOrArea = getString(deal, 'neighborhood') ?? getString(deal, 'area')
  const parts = [neighborhoodOrArea, getString(deal, 'city'), getString(deal, 'county'), getString(deal, 'zip')]

  return parts.filter((part): part is string => Boolean(part)).join(', ') || 'South Florida'
}

export const isExactAddressDisclosed = (deal: PublicDeal): boolean => getString(deal, 'exactAddress') !== null

const formatNumber = (value: number): string => new Intl.NumberFormat('en-US').format(value)

export const formatCurrency = (value: number | null): string =>
  typeof value === 'number'
    ? new Intl.NumberFormat('en-US', {
        currency: 'USD',
        maximumFractionDigits: 0,
        style: 'currency',
      }).format(value)
    : 'Request details'

export const formatPercent = (value: number | null): string => (typeof value === 'number' ? `${value.toFixed(1)}%` : '—')

export const getDealPropertyDetails = (deal: PublicDeal): UnknownRecord => getGroup(deal, 'propertyDetails')

export const getDealFinancialInputs = (deal: PublicDeal) => {
  const financials = getGroup(deal, 'financials')

  return {
    arv: getNumber(financials, 'arv'),
    askingPrice: getNumber(financials, 'askingPrice'),
    closedPrice: getNumber(financials, 'closedPrice'),
    estimatedClosingCosts: getNumber(financials, 'estimatedClosingCosts'),
    estimatedRehab: getNumber(financials, 'estimatedRehab'),
    potentialProfitOverride: getNumber(financials, 'potentialProfitOverride'),
    potentialROIOverride: getNumber(financials, 'potentialROIOverride'),
  }
}

export const getDealFinancialSummary = (deal: PublicDeal) => {
  const inputs = getDealFinancialInputs(deal)
  const calculated = calculateDealFinancials({
    arv: inputs.arv,
    askingPrice: inputs.askingPrice,
    estimatedClosingCosts: inputs.estimatedClosingCosts,
    estimatedRehab: inputs.estimatedRehab,
  })

  return {
    ...inputs,
    potentialProfit: inputs.potentialProfitOverride ?? calculated.potentialProfit,
    potentialROI: inputs.potentialROIOverride ?? calculated.potentialROI,
    totalInvestment: calculated.totalInvestment,
  }
}

export const getDealSpecs = (deal: PublicDeal): DealStat[] => {
  const details = getDealPropertyDetails(deal)
  const stats: DealStat[] = []
  const beds = getNumber(details, 'beds')
  const baths = getNumber(details, 'baths')
  const sqft = getNumber(details, 'sqft')
  const lotSize = getString(details, 'lotSize')
  const yearBuilt = getNumber(details, 'yearBuilt')
  const occupancy = getString(details, 'occupancy')
  const construction = getString(details, 'construction')

  if (beds !== null) {
    stats.push({ label: 'Beds', value: String(beds) })
  }

  if (baths !== null) {
    stats.push({ label: 'Baths', value: String(baths) })
  }

  if (sqft !== null) {
    stats.push({ label: 'Sqft', value: formatNumber(sqft) })
  }

  if (lotSize) {
    stats.push({ label: 'Lot', value: lotSize })
  }

  if (yearBuilt !== null) {
    stats.push({ label: 'Year built', value: String(yearBuilt) })
  }

  if (construction) {
    stats.push({ label: 'Construction', value: construction })
  }

  if (occupancy) {
    stats.push({ label: 'Occupancy', value: formatDealStatusLabel(occupancy) })
  }

  return stats
}

export const getDealSpecSummary = (deal: PublicDeal): string => {
  const specs = getDealSpecs(deal)
    .filter((stat) => ['Beds', 'Baths', 'Sqft', 'Lot'].includes(stat.label))
    .map((stat) => `${stat.value} ${stat.label.toLowerCase()}`)

  return specs.length > 0 ? specs.join(' · ') : 'Property details available on request'
}

export const getPublicDealPhotos = (deal: PublicDeal): PublicMediaReference[] =>
  Array.isArray(deal.photos)
    ? deal.photos.filter(
        (photo): photo is PublicMediaReference =>
          isRecord(photo) &&
          typeof photo.url === 'string' &&
          photo.url.startsWith('/api/media/public/') &&
          (typeof photo.id === 'string' || typeof photo.id === 'number'),
      )
    : []

export const getPrimaryPublicDealPhoto = (deal: PublicDeal): PublicMediaReference | null =>
  getPublicDealPhotos(deal)[0] ?? null

export const getClosedDateLabel = (deal: PublicDeal): string | null => {
  const closedAt = getString(deal, 'closedAt')
  if (!closedAt) {
    return null
  }

  const date = new Date(closedAt)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(date)
}
