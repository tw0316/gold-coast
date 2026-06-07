import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BuyerDealDetailPage } from '@/components/buyer/BuyerDealDetailPage'
import { getBuyerPublicDealBySlug, getBuyerPublicDealSlugs } from '@/lib/deals/publicBuyerDeals'

type DealDetailPageProps = {
  params: Promise<{
    slug: string
  }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return getBuyerPublicDealSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: DealDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const deal = getBuyerPublicDealBySlug(slug)

  if (!deal) {
    return {
      title: 'Deal Not Found | Gold Coast Buyer Deals',
    }
  }

  return {
    title: `${deal.title} | Gold Coast Buyer Deals`,
    description: deal.summary,
    alternates: {
      canonical: `/deals/${deal.slug}/`,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function DealDetailPage({ params }: DealDetailPageProps) {
  const { slug } = await params
  const deal = getBuyerPublicDealBySlug(slug)

  if (!deal) {
    notFound()
  }

  return <BuyerDealDetailPage deal={deal} />
}
