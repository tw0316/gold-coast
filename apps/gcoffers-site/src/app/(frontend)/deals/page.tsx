import type { Metadata } from 'next'

import { BuyerDealsIndexPage } from '@/components/buyer/BuyerDealsIndexPage'

export const metadata: Metadata = {
  title: 'Off-Market South Florida Deals | Gold Coast Home Buyers',
  description:
    'Curated off-market single-family and small multifamily opportunities in South Florida, underwritten by Gold Coast Home Buyers.',
  alternates: {
    canonical: '/deals/',
  },
}

export default function DealsPage() {
  return <BuyerDealsIndexPage />
}
