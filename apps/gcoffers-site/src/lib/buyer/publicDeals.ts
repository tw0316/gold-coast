import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import { toBuyerView, type BuyerPublicDeal } from '../deals/dealView'
import type { PublicDeal } from '../deals/visibility'
import {
  getPublicDealBySlug,
  listPublicActiveDeals,
  listPublicSoldProofDeals,
} from '../payload/publicQueries'
import {
  getBuyerFallbackActiveDeals,
  getBuyerFallbackDealBySlug,
  getBuyerFallbackDealSlugs,
  getBuyerFallbackSoldProofDeals,
} from './fixtures'

export type BuyerHomeDealData = {
  activeDeals: BuyerPublicDeal[]
  soldProofDeals: BuyerPublicDeal[]
  source: 'payload' | 'fixture-fallback' | 'empty-after-error'
}

// Freshness model: deal pages read Payload at render time. The buyer home is dynamic
// (host header), and the /deals index + detail routes are revalidated on demand by the
// Deals collection afterChange/afterDelete hooks (revalidatePath), so admin edits appear
// within seconds without a redeploy.
const canUseBuyerFixtureFallback = (): boolean =>
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.GCOFFERS_USE_BUYER_FIXTURES === 'true'

let payloadClientPromise: Promise<Payload> | null = null

const getPublicPayloadClient = async (): Promise<Payload> => {
  payloadClientPromise ??= getPayload({ config })
  return payloadClientPromise
}

const withFixtureFallback = <T>(fallback: T): T => (canUseBuyerFixtureFallback() ? fallback : ([] as T))

export const listBuyerActiveDeals = async (): Promise<BuyerPublicDeal[]> => {
  try {
    const payload = await getPublicPayloadClient()
    const result = await listPublicActiveDeals(payload, { limit: 24 })
    return (result.docs as PublicDeal[]).map(toBuyerView)
  } catch {
    return withFixtureFallback(getBuyerFallbackActiveDeals().map(toBuyerView))
  }
}

export const listBuyerSoldProofDeals = async (): Promise<BuyerPublicDeal[]> => {
  try {
    const payload = await getPublicPayloadClient()
    const result = await listPublicSoldProofDeals(payload, { limit: 6 })
    return (result.docs as PublicDeal[]).map(toBuyerView)
  } catch {
    return withFixtureFallback(getBuyerFallbackSoldProofDeals().map(toBuyerView))
  }
}

export const getBuyerPublicDealBySlug = async (slug: string): Promise<BuyerPublicDeal | null> => {
  try {
    const payload = await getPublicPayloadClient()
    const deal = (await getPublicDealBySlug(payload, slug)) as PublicDeal | null
    return deal ? toBuyerView(deal) : null
  } catch {
    if (!canUseBuyerFixtureFallback()) {
      return null
    }
    const fallback = getBuyerFallbackDealBySlug(slug)
    return fallback ? toBuyerView(fallback) : null
  }
}

export const getBuyerPublicDealSlugs = async (): Promise<string[]> => {
  try {
    const payload = await getPublicPayloadClient()
    const [active, sold] = await Promise.all([
      listPublicActiveDeals(payload, { limit: 100 }),
      listPublicSoldProofDeals(payload, { limit: 100 }),
    ])
    return [...active.docs, ...sold.docs]
      .map((deal) => String((deal as PublicDeal).slug ?? ''))
      .filter((slug) => slug.length > 0)
  } catch {
    return canUseBuyerFixtureFallback() ? getBuyerFallbackDealSlugs() : []
  }
}

export const getBuyerHomeDealData = async (): Promise<BuyerHomeDealData> => {
  try {
    const payload = await getPublicPayloadClient()
    const [activeDeals, soldProofDeals] = await Promise.all([
      listPublicActiveDeals(payload, { limit: 24 }),
      listPublicSoldProofDeals(payload, { limit: 6 }),
    ])

    return {
      activeDeals: (activeDeals.docs as PublicDeal[]).map(toBuyerView),
      soldProofDeals: (soldProofDeals.docs as PublicDeal[]).map(toBuyerView),
      source: 'payload',
    }
  } catch {
    if (canUseBuyerFixtureFallback()) {
      return {
        activeDeals: getBuyerFallbackActiveDeals().map(toBuyerView),
        soldProofDeals: getBuyerFallbackSoldProofDeals().map(toBuyerView),
        source: 'fixture-fallback',
      }
    }

    return {
      activeDeals: [],
      soldProofDeals: [],
      source: 'empty-after-error',
    }
  }
}
