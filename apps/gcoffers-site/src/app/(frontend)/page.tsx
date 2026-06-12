import type { Metadata } from 'next'
import { headers } from 'next/headers'

import { BuyerHomePage } from '@/components/buyer/BuyerHomePage'
import { SellerHomePage } from '@/components/seller/SellerHomePage'
import { buyerHomeContent } from '@/lib/buyer/content'
import { getBuyerHomeDealData } from '@/lib/buyer/publicDeals'
import { getSurfaceForHost } from '@/lib/routing/hosts'
import { getSellerHomePageSeed } from '@/lib/seller/content'

const sellerHomePage = getSellerHomePageSeed()

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers()
  const routeSurface = getSurfaceForHost(headerList.get('host'))

  if (routeSurface === 'buyer') {
    return {
      metadataBase: new URL('https://gcoffers.com'),
      title: buyerHomeContent.seo.title,
      description: buyerHomeContent.seo.description,
      alternates: {
        canonical: 'https://gcoffers.com/',
      },
      openGraph: {
        title: buyerHomeContent.seo.title,
        description: buyerHomeContent.seo.description,
        type: 'website',
        url: 'https://gcoffers.com/',
      },
    }
  }

  return {
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
}

export default async function HomePage() {
  const headerList = await headers()
  const routeSurface = getSurfaceForHost(headerList.get('host'))

  if (routeSurface === 'buyer') {
    const { activeDeals, soldProofDeals } = await getBuyerHomeDealData()
    return (
      <BuyerHomePage routeSurface={routeSurface} activeDeals={activeDeals} soldDeals={soldProofDeals} />
    )
  }

  return <SellerHomePage routeSurface={routeSurface} />
}
