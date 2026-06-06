import type { CollectionConfig, Where } from 'payload'

import { adminOrEditor, publicReadOrStaff } from '../access/roles'
import { publishedFAQsWhere } from '../lib/payload/publicQueries'

export const FAQs: CollectionConfig = {
  slug: 'faqs',
  admin: {
    defaultColumns: ['question', 'surface', 'status', 'sortOrder'],
    group: 'Content',
    useAsTitle: 'question',
  },
  access: {
    create: adminOrEditor,
    delete: adminOrEditor,
    read: publicReadOrStaff(publishedFAQsWhere as Where),
    update: adminOrEditor,
  },
  fields: [
    {
      name: 'question',
      type: 'text',
      required: true,
    },
    {
      name: 'answer',
      type: 'textarea',
      required: true,
    },
    {
      name: 'surface',
      type: 'select',
      defaultValue: 'buyer',
      index: true,
      options: [
        {
          label: 'Seller site',
          value: 'seller',
        },
        {
          label: 'Buyer/deals site',
          value: 'buyer',
        },
        {
          label: 'Shared',
          value: 'shared',
        },
      ],
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      index: true,
      options: [
        {
          label: 'Draft',
          value: 'draft',
        },
        {
          label: 'Published',
          value: 'published',
        },
        {
          label: 'Archived',
          value: 'archived',
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
      name: 'relatedPage',
      type: 'relationship',
      relationTo: 'pages',
    },
  ],
}
