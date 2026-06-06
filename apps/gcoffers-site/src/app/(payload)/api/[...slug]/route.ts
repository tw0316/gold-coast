import config from '@payload-config'
import '@payloadcms/next/css'
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from '@payloadcms/next/routes'

const payloadRestDelete = REST_DELETE(config)
const payloadRestGet = REST_GET(config)
const payloadRestOptions = REST_OPTIONS(config)
const payloadRestPatch = REST_PATCH(config)
const payloadRestPost = REST_POST(config)
const payloadRestPut = REST_PUT(config)

type PayloadRestRouteContext = Parameters<typeof payloadRestGet>[1]

const PUBLIC_DEFAULT_REST_GET_COLLECTIONS = new Set([
  'deals',
  'faqs',
  'markets',
  'media',
  'pages',
  'site-settings',
])

const hasPayloadAuthCookie = (request: Request): boolean =>
  /(?:^|;\s*)payload-token=/.test(request.headers.get('cookie') ?? '')

const defaultPayloadPublicApiBlockedResponse = (): Response =>
  Response.json(
    {
      error: 'Default Payload collection API reads require authentication.',
    },
    { status: 404 },
  )

const isUnauthenticatedPublicCollectionRead = async (
  request: Request,
  context: PayloadRestRouteContext,
): Promise<boolean> => {
  if (hasPayloadAuthCookie(request)) {
    return false
  }

  const { slug } = await context.params
  const collectionSlug = slug?.[0]

  return typeof collectionSlug === 'string' && PUBLIC_DEFAULT_REST_GET_COLLECTIONS.has(collectionSlug)
}

export const GET = async (request: Request, context: PayloadRestRouteContext): Promise<Response> => {
  if (await isUnauthenticatedPublicCollectionRead(request, context)) {
    return defaultPayloadPublicApiBlockedResponse()
  }

  return payloadRestGet(request, context)
}

export const POST = payloadRestPost
export const DELETE = payloadRestDelete
export const PATCH = payloadRestPatch
export const PUT = payloadRestPut
export const OPTIONS = payloadRestOptions
