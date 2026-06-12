import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

const healthHeaders = {
  'Cache-Control': 'no-store',
}

export async function GET() {
  try {
    const payload = await getPayload({ config })
    await payload.find({
      collection: 'pages',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      page: 1,
    })

    return NextResponse.json(
      {
        ok: true,
        service: 'gcoffers-site',
        checks: {
          app: 'ok',
          database: 'ok',
          publicPagesQuery: 'ok',
        },
      },
      { headers: healthHeaders },
    )
  } catch (error) {
    console.error('gcoffers readiness health check failed', error)
    return NextResponse.json(
      {
        ok: false,
        service: 'gcoffers-site',
        checks: {
          app: 'ok',
          database: 'failed',
          publicPagesQuery: 'failed',
        },
      },
      { status: 503, headers: healthHeaders },
    )
  }
}
