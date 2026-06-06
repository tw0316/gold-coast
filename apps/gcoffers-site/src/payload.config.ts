import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { BuyerSignups } from './collections/BuyerSignups'
import { DealInterest } from './collections/DealInterest'
import { Deals } from './collections/Deals'
import { FAQs } from './collections/FAQs'
import { Markets } from './collections/Markets'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { SiteSettings } from './collections/SiteSettings'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const localDevelopmentDatabaseURI = 'postgres://127.0.0.1:5432/gcoffers_site_dev'
const localDevelopmentPayloadSecret = '[REDACTED_LOCAL_PAYLOAD_SECRET]'

const safeFallbackLifecycleEvents = new Set([
  'build',
  'dev',
  'payload:importmap',
  'payload:types',
  'typecheck',
  'verify:schema-access',
  'verify:scaffold',
])

const isUnsetOrPlaceholder = (value: string | undefined): boolean =>
  value === undefined || value.trim() === '' || /^\[REDACTED_[A-Z0-9_]+\]$/.test(value.trim())

const canUseLocalConfigFallback = (): boolean => {
  if (process.env.npm_lifecycle_event === 'start') {
    return false
  }

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return true
  }

  // `next build` imports the Payload config with NODE_ENV=production. Allow local
  // scaffold builds/codegen/typechecks to complete without real secrets, but do
  // not allow the same fallback for `npm run start` or production runtimes.
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return true
  }

  return safeFallbackLifecycleEvents.has(process.env.npm_lifecycle_event ?? '')
}

const requireConfigEnv = (key: 'DATABASE_URI' | 'PAYLOAD_SECRET', fallbackValue: string): string => {
  const value = process.env[key]

  if (value !== undefined && !isUnsetOrPlaceholder(value)) {
    return value
  }

  if (canUseLocalConfigFallback()) {
    return fallbackValue
  }

  throw new Error(
    `${key} must be set for production/start/runtime. Local dev, test, scaffold build, and Payload codegen may use the explicit local fallback only outside runtime.`,
  )
}

const databaseURI = requireConfigEnv('DATABASE_URI', localDevelopmentDatabaseURI)
const payloadSecret = requireConfigEnv('PAYLOAD_SECRET', localDevelopmentPayloadSecret)

const serverURL =
  process.env.PAYLOAD_PUBLIC_SERVER_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
      importMapFile: path.resolve(dirname, 'app/(payload)/admin/importMap.ts'),
    },
    meta: {
      titleSuffix: ' - Gold Coast Offers CMS',
    },
  },
  collections: [Users, Media, Markets, Pages, FAQs, Deals, SiteSettings, BuyerSignups, DealInterest],
  db: postgresAdapter({
    pool: {
      connectionString: databaseURI,
    },
  }),
  secret: payloadSecret,
  serverURL,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
