import type { Metadata } from 'next'
import { headers } from 'next/headers'

import { SellerHomePage } from '@/components/seller/SellerHomePage'
import { getSurfaceForHost } from '@/lib/routing/hosts'
import { getSellerHomePageSeed } from '@/lib/seller/content'

const sellerHomePage = getSellerHomePageSeed()

export const metadata: Metadata = {
  title: sellerHomePage.seo.title,
  description: sellerHomePage.seo.description,
  alternates: {
    canonical: sellerHomePage.seo.canonicalPath,
  },
  openGraph: {
    title: 'Sell Your House Fast | Gold Coast Home Buyers',
    description: sellerHomePage.seo.description,
    type: 'website',
    url: '/',
    images: ['/assets/og-image.jpg'],
  },
}

export default async function HomePage() {
  const headerList = await headers()
  const routeSurface = getSurfaceForHost(headerList.get('host'))

  return <SellerHomePage routeSurface={routeSurface} />
}
