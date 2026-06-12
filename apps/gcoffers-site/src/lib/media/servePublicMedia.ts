import config from '@payload-config'
import { getPayload } from 'payload'

import { isMediaEligibleForPublicReference, type MediaVisibilityInput } from './publicMedia'
import { isMediaPubliclyReferenced } from './publicReference'

export type PublicMediaVariant = 'full' | 'card'

// Opaque 404 for every denial path so we never reveal whether a given media id exists,
// is private, is unreferenced, or is missing from storage.
const notFound = (): Response => new Response('Not found', { status: 404 })

type MediaSize = {
  filename?: string | null
  mimeType?: string | null
}

type StoredMedia = MediaVisibilityInput & {
  filename?: string | null
  mimeType?: string | null
  sizes?: {
    card?: MediaSize
    hero?: MediaSize
  } | null
}

type StoredS3Object = {
  Body?: { transformToByteArray: () => Promise<Uint8Array> }
  ContentLength?: number
}

let s3ClientPromise: Promise<unknown> | null = null

const getS3Client = async () => {
  if (!s3ClientPromise) {
    s3ClientPromise = import('@aws-sdk/client-s3').then(
      ({ S3Client }) => new S3Client({ region: process.env.AWS_REGION }),
    )
  }
  return s3ClientPromise
}

const resolveObjectKey = (
  media: StoredMedia,
  variant: PublicMediaVariant,
): { key: string; contentType: string } | null => {
  const card = media.sizes?.card
  if (variant === 'card' && card?.filename) {
    return { key: card.filename, contentType: card.mimeType ?? media.mimeType ?? 'application/octet-stream' }
  }

  const hero = media.sizes?.hero
  if (hero?.filename) {
    return { key: hero.filename, contentType: hero.mimeType ?? media.mimeType ?? 'application/octet-stream' }
  }

  if (media.filename) {
    return { key: media.filename, contentType: media.mimeType ?? 'application/octet-stream' }
  }

  return null
}

// App-mediated public delivery for media stored in the PRIVATE media bucket. Order of
// checks (all must pass, else 404): valid id -> media exists -> media is public-eligible
// (public_after_reference_check + ready + not flagged private) -> currently referenced by
// a public deal/page/settings -> object exists in S3. The bytes are streamed through the
// app; a direct S3 URL is never exposed.
export const servePublicMedia = async (
  rawId: string,
  variant: PublicMediaVariant,
): Promise<Response> => {
  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) {
    return notFound()
  }

  const bucket = process.env.PAYLOAD_MEDIA_BUCKET
  if (!bucket) {
    return notFound()
  }

  let media: StoredMedia | null = null
  try {
    const payload = await getPayload({ config })
    media = (await payload.findByID({
      collection: 'media',
      id,
      depth: 0,
      overrideAccess: true,
    })) as StoredMedia | null

    if (!media || !isMediaEligibleForPublicReference(media)) {
      return notFound()
    }

    if (!(await isMediaPubliclyReferenced(payload, id))) {
      return notFound()
    }
  } catch {
    return notFound()
  }

  const target = resolveObjectKey(media, variant)
  if (!target) {
    return notFound()
  }

  try {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3')
    const client = (await getS3Client()) as {
      send: (command: unknown) => Promise<StoredS3Object>
    }
    const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: target.key }))
    if (!object.Body) {
      return notFound()
    }

    const bytes = await object.Body.transformToByteArray()
    return new Response(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600, must-revalidate',
        'Content-Length': String(object.ContentLength ?? bytes.byteLength),
        'Content-Type': target.contentType,
      },
    })
  } catch {
    return notFound()
  }
}
