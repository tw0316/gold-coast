import { buyerDealFixtures, type BuyerDealFixture } from '../../fixtures/buyerDeals'
import { calculateDealFinancials, type DealFinancialSummary } from './financials'
import {
  getPublicLocationLabel,
  isPublicActiveDeal,
  isPublicDealVisible,
  isPublicSoldProofDeal,
  sanitizeDealForPublic,
} from './visibility'

export type BuyerPublicDeal = {
  calculatedFinancials: DealFinancialSummary
  county?: string | null
  dealStatus: string
  dealType: BuyerDealFixture['dealType']
  disclaimer: string
  financials: BuyerDealFixture['financials']
  heroVisual: BuyerDealFixture['heroVisual']
  id: string
  locationLabel: string
  propertyDetails: BuyerDealFixture['propertyDetails']
  publishedAt: string
  rehabScope: string
  slug: string
  statusLabel: string
  summary: string
  title: string
  closedAt?: string
  exactAddress?: string | null
}

const statusLabels: Record<string, string> = {
  available: 'Available',
  coming_soon: 'Coming Soon',
  sold: 'Sold',
  under_contract: 'Under Contract',
}

export const getDealStatusLabel = (dealStatus: string): string => statusLabels[dealStatus] ?? dealStatus

export const getDealTypeLabel = (dealType: BuyerDealFixture['dealType']): string => {
  if (dealType === 'double_close') {
    return 'Double Close'
  }

  return 'Assignment of Contract'
}

const toPublicDeal = (deal: BuyerDealFixture): BuyerPublicDeal | null => {
  const sanitized = sanitizeDealForPublic(deal)

  if (!sanitized) {
    return null
  }

  const calculatedFinancials = calculateDealFinancials({
    askingPrice: deal.financials.askingPrice,
    arv: deal.financials.arv,
    estimatedClosingCosts: deal.financials.estimatedClosingCosts,
    estimatedRehab: deal.financials.estimatedRehab,
  })

  const publicDeal: BuyerPublicDeal = {
    id: String(sanitized.id ?? deal.id),
    title: String(sanitized.title ?? deal.title),
    slug: String(sanitized.slug ?? deal.slug),
    dealType: deal.dealType,
    dealStatus: String(sanitized.dealStatus ?? deal.dealStatus),
    statusLabel: getDealStatusLabel(String(sanitized.dealStatus ?? deal.dealStatus)),
    locationLabel: getPublicLocationLabel(deal),
    county: typeof sanitized.county === 'string' ? sanitized.county : deal.county,
    propertyDetails: deal.propertyDetails,
    financials: deal.financials,
    calculatedFinancials,
    summary: String(sanitized.summary ?? deal.summary),
    rehabScope: String(sanitized.rehabScope ?? deal.rehabScope),
    disclaimer: String(sanitized.disclaimer ?? deal.disclaimer),
    heroVisual: deal.heroVisual,
    publishedAt: String(sanitized.publishedAt ?? deal.publishedAt),
    closedAt: typeof sanitized.closedAt === 'string' ? sanitized.closedAt : deal.closedAt,
  }

  if (typeof sanitized.exactAddress === 'string') {
    publicDeal.exactAddress = sanitized.exactAddress
  }

  return publicDeal
}

const compareDateDescending = (left?: string, right?: string): number => {
  const leftTime = left ? Date.parse(left) : 0
  const rightTime = right ? Date.parse(right) : 0

  return rightTime - leftTime
}

export const getBuyerPublicActiveDeals = (): BuyerPublicDeal[] =>
  buyerDealFixtures
    .filter(isPublicActiveDeal)
    .map(toPublicDeal)
    .filter((deal): deal is BuyerPublicDeal => deal !== null)
    .sort((left, right) => compareDateDescending(left.publishedAt, right.publishedAt))

export const getBuyerPublicSoldProofDeals = (): BuyerPublicDeal[] =>
  buyerDealFixtures
    .filter(isPublicSoldProofDeal)
    .map(toPublicDeal)
    .filter((deal): deal is BuyerPublicDeal => deal !== null)
    .sort((left, right) => compareDateDescending(left.closedAt, right.closedAt))

export const getBuyerPublicDealBySlug = (slug: string): BuyerPublicDeal | null => {
  const deal = buyerDealFixtures.find((fixture) => fixture.slug === slug)

  if (!deal || !isPublicDealVisible(deal)) {
    return null
  }

  return toPublicDeal(deal)
}

export const getBuyerPublicDealSlugs = (): string[] =>
  buyerDealFixtures.filter(isPublicDealVisible).map((deal) => deal.slug)

export const isDealOpenForInterest = (deal: BuyerPublicDeal): boolean =>
  deal.dealStatus === 'available' || deal.dealStatus === 'coming_soon' || deal.dealStatus === 'under_contract'
