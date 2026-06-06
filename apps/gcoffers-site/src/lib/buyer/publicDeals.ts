import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import type { PublicDeal } from '../deals/visibility'
import {
  getPublicDealBySlug,
  listPublicActiveDeals,
  listPublicSoldProofDeals,
} from '../payload/publicQueries'
import {
  getBuyerFallbackActiveDeals,
  getBuyerFallbackDealBySlug,
  getBuyerFallbackSoldProofDeals,
} from './fixtures'

export type BuyerHomeDealData = {
  activeDeals: PublicDeal[]
  soldProofDeals: PublicDeal[]
  source: 'payload' | 'fixture-fallback' | 'empty-after-error'
}

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

export const listBuyerActiveDeals = async (): Promise<PublicDeal[]> => {
  try {
    const payload = await getPublicPayloadClient()
    const result = await listPublicActiveDeals(payload, { limit: 24 })
    return result.docs as PublicDeal[]
  } catch {
    return withFixtureFallback(getBuyerFallbackActiveDeals())
  }
}

export const listBuyerSoldProofDeals = async (): Promise<PublicDeal[]> => {
  try {
    const payload = await getPublicPayloadClient()
    const result = await listPublicSoldProofDeals(payload, { limit: 6 })
    return result.docs as PublicDeal[]
  } catch {
    return withFixtureFallback(getBuyerFallbackSoldProofDeals())
  }
}

export const getBuyerPublicDealBySlug = async (slug: string): Promise<PublicDeal | null> => {
  try {
    const payload = await getPublicPayloadClient()
    return (await getPublicDealBySlug(payload, slug)) as PublicDeal | null
  } catch {
    return canUseBuyerFixtureFallback() ? getBuyerFallbackDealBySlug(slug) : null
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
      activeDeals: activeDeals.docs as PublicDeal[],
      soldProofDeals: soldProofDeals.docs as PublicDeal[],
      source: 'payload',
    }
  } catch {
    if (canUseBuyerFixtureFallback()) {
      return {
        activeDeals: getBuyerFallbackActiveDeals(),
        soldProofDeals: getBuyerFallbackSoldProofDeals(),
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
