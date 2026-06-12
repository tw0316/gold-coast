import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
} from 'payload'

import { exactAddressPublicOrStaffFieldAccess } from '../access/deals'
import { adminOrEditor, adminOrEditorFieldAccess, publicReadOrStaff } from '../access/roles'
import {
  DEAL_STATUSES,
  WEBSITE_VISIBILITIES,
  publicDealVisibilityWhere,
} from '../lib/deals/visibility'
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
const revalidatePublicDealSurfaces = async (slug?: unknown): Promise<void> => {
  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/')
    revalidatePath('/deals')
    if (typeof slug === 'string' && slug.length > 0) {
      revalidatePath(`/deals/${slug}`)
    }
  } catch {
    // next/cache is unavailable outside the Next server runtime (e.g. codegen). Safe to ignore.
  }
}

const revalidateAfterChange: CollectionAfterChangeHook = async ({ doc }) => {
  await revalidatePublicDealSurfaces((doc as { slug?: unknown }).slug)
}

const revalidateAfterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  await revalidatePublicDealSurfaces((doc as { slug?: unknown }).slug)
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
    afterChange: [revalidateAfterChange],
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
        description: 'Primary image shown on the deal card and detail hero. Falls back to the first gallery photo.',
      },
      relationTo: 'media',
    },
    {
      name: 'photos',
      type: 'upload',
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
