import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
} from 'payload'

import { exactAddressPublicOrStaffFieldAccess } from '../access/deals'
import { adminOrEditor, adminOrEditorFieldAccess, publicReadOrStaff } from '../access/roles'
import {
  DEAL_STATUSES,
  WEBSITE_VISIBILITIES,
  publicDealVisibilityWhere,
} from '../lib/deals/visibility'
import { toDealSlug } from '../lib/deals/slug'
import {
  BEST_USE_OPTIONS,
  FEATURE_TAG_OPTIONS,
  LAND_PROPERTY_TYPE,
  MULTI_UNIT_PROPERTY_TYPES,
  NO_LOT_SIZE_PROPERTY_TYPES,
  PROPERTY_TYPE_OPTIONS,
} from '../lib/deals/taxonomy'

const dueDiligenceDisclaimer =
  'Deal information is provided for preliminary review only. Buyers are responsible for independent due diligence, inspections, title review, financing, and verifying all numbers before making an offer.'

// Conditional admin visibility keyed on the property type. Payload passes the
// enclosing group's data as `siblingData`, so property-detail conditions read
// `siblingData.propertyType` directly.
const propertyTypeOf = (siblingData: unknown): string | undefined =>
  (siblingData as { propertyType?: string } | undefined)?.propertyType

const hideForLand = (_data: unknown, siblingData: unknown): boolean =>
  propertyTypeOf(siblingData) !== LAND_PROPERTY_TYPE

const showLotSize = (_data: unknown, siblingData: unknown): boolean =>
  !NO_LOT_SIZE_PROPERTY_TYPES.includes(propertyTypeOf(siblingData) ?? '')

const showUnits = (_data: unknown, siblingData: unknown): boolean =>
  MULTI_UNIT_PROPERTY_TYPES.includes(propertyTypeOf(siblingData) ?? '')

const showCurrentRent = (data: unknown): boolean =>
  (data as { propertyDetails?: { occupancy?: string } } | undefined)?.propertyDetails?.occupancy ===
  'occupied'

// On-demand revalidation: when staff publish or edit a deal in the admin, refresh
// the public buyer surfaces within seconds without a redeploy. The dynamic import
// keeps Payload CLI codegen (no Next runtime) from failing.
const revalidatePublicDealSurfaces = async (...slugs: unknown[]): Promise<void> => {
  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/')
    revalidatePath('/deals')
    const revalidatedSlugs = new Set<string>()
    for (const slug of slugs) {
      if (typeof slug === 'string' && slug.length > 0 && !revalidatedSlugs.has(slug)) {
        revalidatedSlugs.add(slug)
        revalidatePath(`/deals/${slug}`)
      }
    }
  } catch {
    // next/cache is unavailable outside the Next server runtime (e.g. codegen). Safe to ignore.
  }
}

// Pass both the new and previous slug: slug is editable, so a rename must also drop the
// cached page at the old /deals/<old-slug> path (which now resolves to a 404).
const revalidateAfterChange: CollectionAfterChangeHook = async ({ doc, previousDoc }) => {
  await revalidatePublicDealSurfaces(
    (doc as { slug?: unknown }).slug,
    (previousDoc as { slug?: unknown } | undefined)?.slug,
  )
}

const revalidateAfterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  await revalidatePublicDealSurfaces((doc as { slug?: unknown }).slug)
}

const publicMediaDealStatuses = new Set(['coming_soon', 'available', 'under_contract', 'sold'])

const isPublicDealDoc = (doc: { websiteVisibility?: unknown; dealStatus?: unknown }): boolean =>
  doc.websiteVisibility === 'public' &&
  typeof doc.dealStatus === 'string' &&
  publicMediaDealStatuses.has(doc.dealStatus)

const mediaIdFromReference = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value
  }

  if (value && typeof value === 'object') {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'number' && Number.isInteger(id)) {
      return id
    }
  }

  return null
}

const collectDealMediaIds = (doc: { coverPhoto?: unknown; photos?: unknown }): number[] => {
  const ids = new Set<number>()
  const coverPhotoId = mediaIdFromReference(doc.coverPhoto)
  if (coverPhotoId) {
    ids.add(coverPhotoId)
  }

  if (Array.isArray(doc.photos)) {
    for (const photo of doc.photos) {
      const photoId = mediaIdFromReference(photo)
      if (photoId) {
        ids.add(photoId)
      }
    }
  }

  return [...ids]
}

const syncReferencedMediaPublicState: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (!isPublicDealDoc(doc as { websiteVisibility?: unknown; dealStatus?: unknown })) {
    return
  }

  // Public deal gallery media is buyer-facing by design. Promotion here does not expose
  // raw bucket URLs or direct media reads; it only permits the app-mediated reference check.
  const mediaIds = collectDealMediaIds(doc as { coverPhoto?: unknown; photos?: unknown })
  for (const mediaId of mediaIds) {
    try {
      const media = (await req.payload.findByID({
        collection: 'media',
        id: mediaId,
        depth: 0,
        overrideAccess: true,
      })) as {
        accessPolicy?: string | null
        containsExactAddressOrPrivateDetails?: boolean | null
        mediaStatus?: string | null
      } | null

      if (
        !media ||
        media.containsExactAddressOrPrivateDetails === true ||
        media.mediaStatus === 'hidden' ||
        media.mediaStatus === 'archived'
      ) {
        continue
      }

      if (media.accessPolicy === 'public_after_reference_check' && media.mediaStatus === 'ready') {
        continue
      }

      await req.payload.update({
        collection: 'media',
        id: mediaId,
        data: {
          accessPolicy: 'public_after_reference_check',
          mediaStatus: 'ready',
        },
        depth: 0,
        overrideAccess: true,
      })
    } catch (error) {
      const dealId = (doc as { id?: unknown }).id
      console.error('gcoffers deal media public-state sync failed', {
        dealId,
        mediaId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

const normalizeDealSlugBeforeValidate: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data) {
    return data
  }

  const existing = originalDoc as { slug?: unknown; title?: unknown } | undefined
  const rawSlug =
    typeof data.slug === 'string' && data.slug.trim().length > 0
      ? data.slug
      : typeof data.title === 'string' && data.title.trim().length > 0
        ? data.title
        : typeof existing?.slug === 'string' && existing.slug.trim().length > 0
          ? existing.slug
          : existing?.title

  if (typeof rawSlug !== 'string' || rawSlug.trim().length === 0) {
    return data
  }

  return {
    ...data,
    slug: toDealSlug(rawSlug),
  }
}

export const Deals: CollectionConfig = {
  slug: 'deals',
  admin: {
    defaultColumns: ['title', 'websiteVisibility', 'dealStatus', 'city', 'updatedAt'],
    group: 'Deals',
    useAsTitle: 'title',
  },
  access: {
    create: adminOrEditor,
    delete: adminOrEditor,
    read: publicReadOrStaff(publicDealVisibilityWhere),
    update: adminOrEditor,
  },
  hooks: {
    beforeValidate: [normalizeDealSlugBeforeValidate],
    afterChange: [syncReferencedMediaPublicState, revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      admin: {
        description: 'URL path segment. Spaces/case are normalized automatically, e.g. "Test Deal" becomes "test-deal".',
      },
      index: true,
      required: true,
      unique: true,
    },
    {
      name: 'bestUse',
      type: 'select',
      admin: {
        description:
          'Best investment use for buyers (multi-select). Drives the deal badges and buyer filtering.',
      },
      hasMany: true,
      options: [...BEST_USE_OPTIONS],
    },
    {
      name: 'websiteVisibility',
      type: 'select',
      admin: {
        description:
          'Internal-only deals must remain Hidden. Public deal visibility is websiteVisibility = public plus the approved deal status matrix.',
      },
      defaultValue: 'hidden',
      index: true,
      options: WEBSITE_VISIBILITIES.map((visibility) => ({
        label: visibility === 'hidden' ? 'Hidden / internal only' : visibility.replaceAll('_', ' '),
        value: visibility,
      })),
      required: true,
    },
    {
      name: 'dealStatus',
      type: 'select',
      defaultValue: 'draft',
      index: true,
      options: DEAL_STATUSES.map((status) => ({
        label: status.replaceAll('_', ' '),
        value: status,
      })),
      required: true,
    },
    {
      name: 'market',
      type: 'relationship',
      admin: {
        allowCreate: true,
        allowEdit: true,
        description:
          'Select or create the market. Default South Florida markets are seeded by migration.',
      },
      relationTo: 'markets',
    },
    {
      name: 'area',
      type: 'text',
      admin: {
        description: 'Area / neighborhood label safe for public display (no exact address).',
      },
    },
    {
      name: 'city',
      type: 'text',
    },
    {
      name: 'county',
      type: 'text',
    },
    {
      name: 'zip',
      type: 'text',
    },
    {
      name: 'showExactAddressPublicly',
      type: 'checkbox',
      admin: {
        description: 'Default false. Public detail/API helpers may expose exactAddress only when this is true.',
      },
      defaultValue: false,
    },
    {
      name: 'exactAddress',
      type: 'text',
      access: {
        read: exactAddressPublicOrStaffFieldAccess,
        update: adminOrEditorFieldAccess,
      },
      admin: {
        description:
          'Sensitive. Hidden from public reads unless showExactAddressPublicly is explicitly true.',
      },
    },
    {
      name: 'propertyDetails',
      type: 'group',
      fields: [
        {
          name: 'propertyType',
          type: 'select',
          admin: {
            description: 'What the property is. Controls which detail fields below apply.',
          },
          options: [...PROPERTY_TYPE_OPTIONS],
        },
        {
          name: 'units',
          type: 'number',
          admin: {
            condition: showUnits,
            description: 'Number of units (duplex / multifamily).',
          },
          min: 1,
        },
        {
          name: 'beds',
          type: 'number',
          admin: {
            condition: hideForLand,
          },
          min: 0,
        },
        {
          name: 'baths',
          type: 'number',
          admin: {
            condition: hideForLand,
          },
          min: 0,
        },
        {
          name: 'sqft',
          type: 'number',
          admin: {
            condition: hideForLand,
          },
          min: 0,
        },
        {
          name: 'lotSize',
          type: 'text',
          admin: {
            condition: showLotSize,
          },
        },
        {
          name: 'yearBuilt',
          type: 'number',
          admin: {
            condition: hideForLand,
          },
          min: 1800,
        },
        {
          name: 'construction',
          type: 'text',
          admin: {
            condition: hideForLand,
          },
        },
        {
          name: 'occupancy',
          type: 'select',
          admin: {
            condition: hideForLand,
          },
          options: [
            {
              label: 'Vacant',
              value: 'vacant',
            },
            {
              label: 'Occupied',
              value: 'occupied',
            },
            {
              label: 'Unknown',
              value: 'unknown',
            },
          ],
        },
      ],
    },
    {
      name: 'financials',
      type: 'group',
      admin: {
        description:
          'Public UI should hide calculated values when inputs are missing; helper calculations live in src/lib/deals/financials.ts.',
      },
      fields: [
        {
          name: 'askingPrice',
          type: 'number',
          min: 0,
        },
        {
          name: 'arv',
          type: 'number',
          min: 0,
        },
        {
          name: 'estimatedRehab',
          type: 'number',
          min: 0,
        },
        {
          name: 'estimatedClosingCosts',
          type: 'number',
          min: 0,
        },
        {
          name: 'marketRent',
          type: 'number',
          admin: {
            description: 'Estimated market rent (monthly) for buy-and-hold / BRRRR buyers.',
          },
          min: 0,
        },
        {
          name: 'currentRent',
          type: 'number',
          admin: {
            condition: showCurrentRent,
            description: 'Current in-place rent (monthly) if the property is occupied.',
          },
          min: 0,
        },
        {
          name: 'estCapRate',
          type: 'number',
          admin: {
            description: 'Estimated cap rate (%). Leave blank to let the public UI compute from rent and price.',
          },
          min: 0,
        },
        {
          name: 'potentialProfitOverride',
          type: 'number',
        },
        {
          name: 'potentialROIOverride',
          type: 'number',
        },
        {
          name: 'closedPrice',
          type: 'number',
          min: 0,
        },
      ],
    },
    {
      name: 'summary',
      type: 'textarea',
    },
    {
      name: 'rehabScope',
      type: 'textarea',
    },
    {
      name: 'featureTags',
      type: 'select',
      admin: {
        description: 'Quick highlight chips shown on the deal card and detail page.',
      },
      hasMany: true,
      options: [...FEATURE_TAG_OPTIONS],
    },
    {
      name: 'coverPhoto',
      type: 'upload',
      admin: {
        allowCreate: true,
        description: 'Primary image shown on the deal card and detail hero. Falls back to the first gallery photo.',
      },
      relationTo: 'media',
    },
    {
      name: 'photos',
      type: 'upload',
      admin: {
        allowCreate: true,
      },
      hasMany: true,
      relationTo: 'media',
    },
    {
      name: 'videoTourUrl',
      type: 'text',
      admin: {
        description: 'Walkthrough video or 3D tour URL (YouTube, Matterport, etc.).',
      },
    },
    {
      name: 'disclaimer',
      type: 'textarea',
      defaultValue: dueDiligenceDisclaimer,
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      access: {
        read: adminOrEditorFieldAccess,
        update: adminOrEditorFieldAccess,
      },
      admin: {
        description: 'Internal-only notes. Never include in public helpers or evidence.',
      },
    },
    {
      name: 'closedAt',
      type: 'date',
    },
    {
      name: 'publishedAt',
      type: 'date',
    },
  ],
}
