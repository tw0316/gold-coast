import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Get Your Offer | Gold Coast Home Buyers',
  robots: {
    index: false,
    follow: true,
  },
}

export default function RetiredGetYourOfferPage() {
  redirect('/#offer')
}
