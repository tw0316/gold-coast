import type { Metadata } from 'next'

import { BuyerJoinPage } from '@/components/buyer/BuyerJoinPage'

export const metadata: Metadata = {
  title: 'Join Our Buyers List | Gold Coast Buyer Deals',
  description:
    'Join the Gold Coast Home Buyers buyer list with email required and optional progressive buy-box fields.',
  alternates: {
    canonical: '/join/',
  },
}

export default function JoinPage() {
  return <BuyerJoinPage />
}
