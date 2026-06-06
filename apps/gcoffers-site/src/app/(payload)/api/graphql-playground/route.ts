import config from '@payload-config'
import '@payloadcms/next/css'
import { GRAPHQL_PLAYGROUND_GET } from '@payloadcms/next/routes'

const playgroundGET = GRAPHQL_PLAYGROUND_GET(config)

export const GET =
  process.env.NODE_ENV === 'development' ? playgroundGET : () => new Response(null, { status: 404 })
