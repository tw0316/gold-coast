import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({
    ok: true,
    service: 'gcoffers-site',
    checks: {
      app: 'ok',
      publicContent: 'stubbed_in_slice_2',
      database: 'not_checked_in_slice_2',
    },
  })
}
