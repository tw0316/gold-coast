import { servePublicMedia } from '@/lib/media/servePublicMedia'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  const { id } = await params
  return servePublicMedia(id, 'full')
}
