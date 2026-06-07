import type { CollectionConfig } from 'payload'

import { exactAddressPublicOrStaffFieldAccess } from '../access/deals'
import { adminOrEditor, adminOrEditorFieldAccess, publicReadOrStaff } from '../access/roles'
import {
  DEAL_STATUSES,
  WEBSITE_VISIBILITIES,
  publicDealVisibilityWhere,
} from '../lib/deals/visibility'

const dueDiligenceDisclaimer =
  'Deal information is provided for preliminary review only. Buyers are responsible for independent due diligence, inspections, title review, financing, and verifying all numbers before making an offer.'

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
      name: 'dealType',
      type: 'select',
      defaultValue: 'wholesale',
      options: [
        {
          label: 'Wholesale',
          value: 'wholesale',
        },
        {
          label: 'Fix and flip',
          value: 'fix_and_flip',
        },
        {
          label: 'Rental',
          value: 'rental',
        },
        {
          label: 'Land',
          value: 'land',
        },
        {
          label: 'Other',
          value: 'other',
        },
      ],
      required: true,
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
        description: 'Neighborhood/area label safe for public display.',
      },
    },
    {
      name: 'neighborhood',
      type: 'text',
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
          name: 'beds',
          type: 'number',
          min: 0,
        },
        {
          name: 'baths',
          type: 'number',
          min: 0,
        },
        {
          name: 'sqft',
          type: 'number',
          min: 0,
        },
        {
          name: 'lotSize',
          type: 'text',
        },
        {
          name: 'yearBuilt',
          type: 'number',
          min: 1800,
        },
        {
          name: 'construction',
          type: 'text',
        },
        {
          name: 'occupancy',
          type: 'select',
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
      name: 'photos',
      type: 'upload',
      hasMany: true,
      relationTo: 'media',
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
