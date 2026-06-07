import type { Metadata } from 'next'

import { SellerAboutPage } from '@/components/seller/SellerAboutPage'

export const metadata: Metadata = {
  title: 'About Gold Coast Home Buyers | South Florida Real Estate Buyers',
  description:
    'Gold Coast Home Buyers is a South Florida real estate buyer serving Miami-Dade, Broward, and Palm Beach homeowners and investors.',
  alternates: {
    canonical: '/about/',
  },
}

export default function AboutPage() {
  return <SellerAboutPage />
}
