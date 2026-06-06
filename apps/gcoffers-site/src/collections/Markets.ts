import type { CollectionConfig, Where } from 'payload'

import { adminOrEditor, publicReadOrStaff } from '../access/roles'
import { enabledMarketsWhere } from '../lib/payload/publicQueries'

export const Markets: CollectionConfig = {
  slug: 'markets',
  admin: {
    defaultColumns: ['name', 'county', 'enabled', 'sortOrder'],
    group: 'Content',
    useAsTitle: 'name',
  },
  access: {
    create: adminOrEditor,
    delete: adminOrEditor,
    read: publicReadOrStaff(enabledMarketsWhere as Where),
    update: adminOrEditor,
  },
  fields: [
    {
      name: 'name',
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
      name: 'county',
      type: 'select',
      options: [
        {
          label: 'Miami-Dade',
          value: 'miami_dade',
        },
        {
          label: 'Broward',
          value: 'broward',
        },
        {
          label: 'Palm Beach',
          value: 'palm_beach',
        },
        {
          label: 'Other / expansion',
          value: 'other',
        },
      ],
      required: true,
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      index: true,
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
      index: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
  ],
}
