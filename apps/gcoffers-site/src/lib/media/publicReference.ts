import type { Payload } from 'payload'

import { publicDealVisibilityWhere } from '../deals/visibility'

// Live reference check for app-mediated public media delivery. A media item is only
// publicly servable if it is CURRENTLY referenced by a public deal, a published page, or
// public site settings. The Media.referencedBy field is editorial-only and intentionally
// NOT trusted here — visibility is re-validated against live content at request time.
//
// Fails closed: any query error resolves to "not referenced" so delivery is denied.
export const isMediaPubliclyReferenced = async (
  payload: Payload,
  mediaId: number,
): Promise<boolean> => {
  try {
    const publicDeal = await payload.find({
      collection: 'deals',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: {
        and: [
          publicDealVisibilityWhere,
          {
            or: [{ coverPhoto: { equals: mediaId } }, { photos: { in: [mediaId] } }],
          },
        ],
      },
    })
    if (publicDeal.docs.length > 0) {
      return true
    }

    const publishedPage = await payload.find({
      collection: 'pages',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: {
        and: [{ status: { equals: 'published' } }, { 'sections.image': { equals: mediaId } }],
      },
    })
    if (publishedPage.docs.length > 0) {
      return true
    }

    const publicSettings = await payload.find({
      collection: 'site-settings',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: {
        and: [
          { isPublic: { equals: true } },
          { 'seoDefaults.openGraphImage': { equals: mediaId } },
        ],
      },
    })
    return publicSettings.docs.length > 0
  } catch {
    return false
  }
}
