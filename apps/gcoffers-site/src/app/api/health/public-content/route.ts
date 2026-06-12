import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { listEnabledMarkets, listPublishedFAQs, listPublishedPages, listPublicSiteSettings } from '@/lib/payload/publicQueries'

export const dynamic = 'force-dynamic'

const healthHeaders = {
  'Cache-Control': 'no-store',
}

export async function GET() {
  try {
    const payload = await getPayload({ config })
    const [pages, faqs, markets, siteSettings] = await Promise.all([
      listPublishedPages(payload, { limit: 5, surface: 'seller' }),
      listPublishedFAQs(payload, { limit: 5, surface: 'buyer' }),
      listEnabledMarkets(payload, { limit: 5 }),
      listPublicSiteSettings(payload, { limit: 5, surface: 'seller' }),
    ])

    const counts = {
      pages: pages.docs.length,
      faqs: faqs.docs.length,
      markets: markets.docs.length,
      siteSettings: siteSettings.docs.length,
    }
    const hasPublicContent = counts.pages > 0 && counts.siteSettings > 0

    return NextResponse.json(
      {
        ok: hasPublicContent,
        service: 'gcoffers-site',
        checks: {
          app: 'ok',
          database: 'ok',
          publicContent: hasPublicContent ? 'ok' : 'missing_required_public_content',
        },
        counts,
      },
      { status: hasPublicContent ? 200 : 503, headers: healthHeaders },
    )
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: 'gcoffers-site',
        checks: {
          app: 'ok',
          database: 'failed',
          publicContent: 'failed',
        },
      },
      { status: 503, headers: healthHeaders },
    )
  }
}
