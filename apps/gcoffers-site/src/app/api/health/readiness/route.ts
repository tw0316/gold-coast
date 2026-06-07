import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({
    ok: true,
    service: 'gcoffers-site',
    checks: {
      app: 'ok',
      database: 'not_checked_in_slice_2',
    },
  })
}
