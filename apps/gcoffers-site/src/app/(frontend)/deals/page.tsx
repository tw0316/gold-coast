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

export default async function DealsPage() {
  const activeDeals = await listBuyerActiveDeals()
  return <BuyerDealsIndexPage activeDeals={activeDeals} />
}
