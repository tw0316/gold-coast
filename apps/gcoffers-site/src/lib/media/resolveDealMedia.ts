import type { Payload } from 'payload'

import type { MediaVisibilityInput } from './publicMedia'

// Deal queries run at depth 0 (privacy), so coverPhoto/photos come back as bare media ids.
// Public reads cannot populate media through normal access control (Media.read is staff-only),
// so we resolve referenced media here with overrideAccess and an explicit safe-field select
// that omits staff-only fields, then hand the objects to sanitizeDealForPublic, which still
// enforces per-item public eligibility + the public deal context before emitting any URL.

const MEDIA_SAFE_SELECT = {
  alt: true,
  caption: true,
  accessPolicy: true,
  mediaStatus: true,
  containsExactAddressOrPrivateDetails: true,
  sizes: true,
} as const

type DealMediaCarrier = {
  coverPhoto?: unknown
  photos?: unknown
}

const isMediaId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value)

const collectMediaIds = (docs: DealMediaCarrier[]): number[] => {
  const ids = new Set<number>()
  for (const doc of docs) {
    if (isMediaId(doc.coverPhoto)) {
      ids.add(doc.coverPhoto)
    }
    if (Array.isArray(doc.photos)) {
      for (const photo of doc.photos) {
        if (isMediaId(photo)) {
          ids.add(photo)
        }
      }
    }
  }
  return [...ids]
}

const toSafeMedia = (raw: Record<string, unknown>): MediaVisibilityInput => {
  const sizes = raw.sizes as { card?: { filename?: string | null } } | undefined
  const hasCardSize = typeof sizes?.card?.filename === 'string'

  return {
    id: typeof raw.id === 'number' || typeof raw.id === 'string' ? raw.id : null,
    accessPolicy: typeof raw.accessPolicy === 'string' ? raw.accessPolicy : null,
    alt: typeof raw.alt === 'string' ? raw.alt : null,
    caption: typeof raw.caption === 'string' ? raw.caption : null,
    containsExactAddressOrPrivateDetails: raw.containsExactAddressOrPrivateDetails === true,
    mediaStatus: typeof raw.mediaStatus === 'string' ? raw.mediaStatus : null,
    // Presence (not the value) drives whether sanitizeMediaForPublic emits a thumbnail path;
    // the /thumbnail route serves the card size and falls back to the full image otherwise.
    thumbnailURL: hasCardSize ? 'card' : null,
  }
}

// Replace media ids on each deal with safe media objects so downstream sanitization can
// produce app-mediated public references. Unknown ids are dropped.
export const attachPublicDealMedia = async <T extends DealMediaCarrier>(
  payload: Payload,
  docs: T[],
): Promise<T[]> => {
  const ids = collectMediaIds(docs)
  if (ids.length === 0) {
    return docs
  }

  const result = await payload.find({
    collection: 'media',
    depth: 0,
    limit: ids.length,
    overrideAccess: true,
    select: MEDIA_SAFE_SELECT,
    where: { id: { in: ids } },
  })

  const safeById = new Map<number | string, MediaVisibilityInput>()
  for (const raw of result.docs as Record<string, unknown>[]) {
    if (typeof raw.id === 'number' || typeof raw.id === 'string') {
      safeById.set(raw.id, toSafeMedia(raw))
    }
  }

  return docs.map((doc) => {
    const next: DealMediaCarrier = { ...doc }

    if (isMediaId(doc.coverPhoto)) {
      next.coverPhoto = safeById.get(doc.coverPhoto) ?? null
    }

    if (Array.isArray(doc.photos)) {
      next.photos = doc.photos
        .map((photo) => (isMediaId(photo) ? safeById.get(photo) ?? null : photo))
        .filter((photo) => photo !== null)
    }

    return next as T
  })
}
