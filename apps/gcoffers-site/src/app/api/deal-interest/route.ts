import { formPipelineOptionsResponse, handleDealInterestRoute } from '@/lib/forms/routeHandlers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function OPTIONS() {
  return formPipelineOptionsResponse()
}

export function POST(request: Request) {
  return handleDealInterestRoute(request)
}
