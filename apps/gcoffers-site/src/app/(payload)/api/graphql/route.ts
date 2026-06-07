import config from '@payload-config'
import { GRAPHQL_POST, REST_OPTIONS } from '@payloadcms/next/routes'

const payloadGraphQLPost = GRAPHQL_POST(config)
const payloadGraphQLOptions = REST_OPTIONS(config)

const hasPayloadAuthCookie = (request: Request): boolean =>
  /(?:^|;\s*)payload-token=/.test(request.headers.get('cookie') ?? '')

const defaultPayloadGraphQLBlockedResponse = (): Response =>
  Response.json(
    {
      error: 'Default Payload GraphQL API requires authentication.',
    },
    { status: 404 },
  )

export const POST = async (request: Request): Promise<Response> => {
  if (!hasPayloadAuthCookie(request)) {
    return defaultPayloadGraphQLBlockedResponse()
  }

  return payloadGraphQLPost(request)
}

export const OPTIONS = payloadGraphQLOptions
