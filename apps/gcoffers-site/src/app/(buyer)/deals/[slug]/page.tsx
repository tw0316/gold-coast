import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BuyerDealDetailPage } from '@/components/buyer/BuyerDealDetailPage'
import { getBuyerPublicDealBySlug, getBuyerPublicDealSlugs } from '@/lib/buyer/publicDeals'

type DealDetailPageProps = {
  params: Promise<{
    slug: string
  }>
}

// Known public deals are prerendered; newly published deals render on-demand and are
// cached until the Deals revalidation tag is busted. Non-public slugs still 404 because
// getBuyerPublicDealBySlug enforces the public visibility query.
export const dynamicParams = true

export async function generateStaticParams() {
  const slugs = await getBuyerPublicDealSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: DealDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const deal = await getBuyerPublicDealBySlug(slug)

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
  const deal = await getBuyerPublicDealBySlug(slug)

  if (!deal) {
    notFound()
  }

  return <BuyerDealDetailPage deal={deal} />
}
