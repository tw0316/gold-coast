import type { Metadata } from 'next'

import { BuyerDealsIndexPage } from '@/components/buyer/BuyerDealsIndexPage'
import { listBuyerActiveDeals } from '@/lib/buyer/publicDeals'

export const metadata: Metadata = {
  title: 'Off-Market South Florida Deals | Gold Coast Home Buyers',
  description:
    'Curated off-market single-family and small multifamily opportunities in South Florida, underwritten by Gold Coast Home Buyers.',
  alternates: {
    canonical: '/deals/',
  },
}

// Render at request time against live Payload data so the active-deals list never bakes
// build-time fallback content (the production image is built in CI without DB access).
export const dynamic = 'force-dynamic'

export default async function DealsPage() {
  const activeDeals = await listBuyerActiveDeals()
  return <BuyerDealsIndexPage activeDeals={activeDeals} />
}
