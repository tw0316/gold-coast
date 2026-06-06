import type { Metadata } from 'next'

import { BuyerFaqPage } from '@/components/buyer/BuyerFaqPage'

export const metadata: Metadata = {
  title: 'Buyer FAQ | Gold Coast Buyer Deals',
  description: 'Frequently asked buyer questions about Gold Coast Home Buyers public deal pages and due diligence.',
  alternates: {
    canonical: '/faq/',
  },
}

export default function FAQPage() {
  return <BuyerFaqPage />
}
