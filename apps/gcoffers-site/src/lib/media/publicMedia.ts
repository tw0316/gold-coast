import type { DealVisibilityInput } from '../deals/visibility'

export const MEDIA_ACCESS_POLICIES = ['private', 'public_after_reference_check'] as const
export const MEDIA_STATUSES = ['draft', 'ready', 'hidden', 'archived'] as const

export type MediaAccessPolicy = (typeof MEDIA_ACCESS_POLICIES)[number]
export type MediaStatus = (typeof MEDIA_STATUSES)[number]

export type MediaVisibilityInput = {
  id?: number | string | null
  accessPolicy?: string | null
  alt?: string | null
  caption?: string | null
  containsExactAddressOrPrivateDetails?: boolean | null
  mediaStatus?: string | null
  thumbnailURL?: string | null
  url?: string | null
}

export type PageVisibilityInput = {
  status?: string | null
}

export type PublicMediaReferenceContext = {
  deal?: DealVisibilityInput | null
  page?: PageVisibilityInput | null
}

export type PublicMediaDeliveryDecision = {
  allowed: boolean
  reason:
    | 'public_deal_reference'
    | 'published_page_reference'
    | 'private_by_default'
    | 'media_not_ready_for_public_reference'
    | 'no_public_reference'
}

export type PublicMediaReference = {
  id: number | string
  alt?: string | null
  caption?: string | null
  thumbnailURL?: string | null
  url: string
}

const isPublicMediaId = (value: unknown): value is number | string =>
  (typeof value === 'number' && Number.isFinite(value)) ||
  (typeof value === 'string' && value.trim().length > 0)

const getMediaId = (media: MediaVisibilityInput): number | string | null => {
  if (isPublicMediaId(media.id)) {
    return media.id
  }

  return null
}

export const isMediaPrivateByDefault = (media: MediaVisibilityInput = {}): boolean =>
  (media.accessPolicy ?? 'private') === 'private'

export const isMediaEligibleForPublicReference = (media: MediaVisibilityInput): boolean =>
  media.accessPolicy === 'public_after_reference_check' &&
  media.mediaStatus === 'ready' &&
  media.containsExactAddressOrPrivateDetails !== true

const publicDealReferenceStatuses = new Set(['coming_soon', 'available', 'under_contract', 'sold'])

const isPublicDealReference = (deal: DealVisibilityInput): boolean =>
  deal.websiteVisibility === 'public' && publicDealReferenceStatuses.has(deal.dealStatus ?? '')

export const canServeMediaForPublicDeal = (
  media: MediaVisibilityInput,
  deal: DealVisibilityInput,
): boolean => isMediaEligibleForPublicReference(media) && isPublicDealReference(deal)

export const canServeMediaForPublicPage = (
  media: MediaVisibilityInput,
  page: PageVisibilityInput,
): boolean => isMediaEligibleForPublicReference(media) && page.status === 'published'

export const resolvePublicMediaDelivery = (
  media: MediaVisibilityInput,
  context: PublicMediaReferenceContext,
): PublicMediaDeliveryDecision => {
  if (isMediaPrivateByDefault(media)) {
    return {
      allowed: false,
      reason: 'private_by_default',
    }
  }

  if (!isMediaEligibleForPublicReference(media)) {
    return {
      allowed: false,
      reason: 'media_not_ready_for_public_reference',
    }
  }

  if (context.deal && canServeMediaForPublicDeal(media, context.deal)) {
    return {
      allowed: true,
      reason: 'public_deal_reference',
    }
  }

  if (context.page && canServeMediaForPublicPage(media, context.page)) {
    return {
      allowed: true,
      reason: 'published_page_reference',
    }
  }

  return {
    allowed: false,
    reason: 'no_public_reference',
  }
}

export const buildAppMediatedPublicMediaPath = (mediaId: string): string =>
  `/api/media/public/${encodeURIComponent(mediaId)}`

export const buildAppMediatedPublicMediaThumbnailPath = (mediaId: string): string =>
  `${buildAppMediatedPublicMediaPath(mediaId)}/thumbnail`

export const sanitizeMediaForPublic = (
  media: MediaVisibilityInput,
  context: PublicMediaReferenceContext,
): PublicMediaReference | null => {
  const id = getMediaId(media)

  if (!id || !resolvePublicMediaDelivery(media, context).allowed) {
    return null
  }

  return {
    id,
    ...(typeof media.alt === 'string' ? { alt: media.alt } : {}),
    ...(typeof media.caption === 'string' ? { caption: media.caption } : {}),
    ...(typeof media.thumbnailURL === 'string'
      ? { thumbnailURL: buildAppMediatedPublicMediaThumbnailPath(String(id)) }
      : {}),
    url: buildAppMediatedPublicMediaPath(String(id)),
  }
}

export const sanitizeMediaReferenceForPublic = (
  media: MediaVisibilityInput | number | string | null | undefined,
  context: PublicMediaReferenceContext,
): PublicMediaReference | null => {
  if (isPublicMediaId(media)) {
    return null
  }

  if (media === null || media === undefined) {
    return null
  }

  return sanitizeMediaForPublic(media, context)
}
