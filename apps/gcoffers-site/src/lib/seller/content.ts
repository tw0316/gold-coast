import {
  sellerHomeContent,
  sellerHomePageSeed,
  sellerLegalPages,
  sellerPageSeeds,
  type SellerLegalPageContent,
  type SellerPageSurface,
  type SellerPayloadPageSeed,
} from '@/fixtures/sellerPages'
export { SELLER_LEAD_POST_TARGET, SELLER_LEAD_SOURCE } from './formContract'

export type SellerLegalPageKey = keyof typeof sellerLegalPages

export function listSeededSellerPages(surface?: SellerPageSurface): SellerPayloadPageSeed[] {
  if (!surface) {
    return [...sellerPageSeeds]
  }

  return sellerPageSeeds.filter((page) => page.surface === surface || page.surface === 'shared')
}

export function getSeededSellerPageBySlug(slug: string): SellerPayloadPageSeed | undefined {
  return sellerPageSeeds.find((page) => page.slug === slug)
}

export function getSellerHomePageSeed(): SellerPayloadPageSeed {
  return sellerHomePageSeed
}

export function getSellerHomeContent() {
  return sellerHomeContent
}

export function getSellerLegalPage(key: SellerLegalPageKey): SellerLegalPageContent {
  return sellerLegalPages[key]
}
