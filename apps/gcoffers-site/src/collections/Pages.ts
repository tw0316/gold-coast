import type { CollectionConfig, Where } from 'payload'

import { adminOrEditor, publicReadOrStaff } from '../access/roles'
import { publishedPagesWhere } from '../lib/payload/publicQueries'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    defaultColumns: ['title', 'surface', 'status', 'updatedAt'],
    group: 'Content',
    useAsTitle: 'title',
  },
  access: {
    create: adminOrEditor,
    delete: adminOrEditor,
    read: publicReadOrStaff(publishedPagesWhere as Where),
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
      name: 'surface',
      type: 'select',
      defaultValue: 'seller',
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
          label: 'Shared/legal',
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
      name: 'summary',
      type: 'textarea',
    },
    {
      name: 'sections',
      type: 'array',
      admin: {
        description: 'Baseline CMS-managed page sections. Slice 4/5 can map these to final components.',
      },
      fields: [
        {
          name: 'sectionType',
          type: 'select',
          defaultValue: 'rich_text',
          options: [
            {
              label: 'Hero',
              value: 'hero',
            },
            {
              label: 'Rich text',
              value: 'rich_text',
            },
            {
              label: 'Call to action',
              value: 'cta',
            },
            {
              label: 'Two column',
              value: 'two_column',
            },
            {
              label: 'Legal copy',
              value: 'legal',
            },
            {
              label: 'FAQ embed',
              value: 'faq_embed',
            },
            {
              label: 'Deals embed',
              value: 'deals_embed',
            },
          ],
          required: true,
        },
        {
          name: 'eyebrow',
          type: 'text',
        },
        {
          name: 'heading',
          type: 'text',
        },
        {
          name: 'body',
          type: 'textarea',
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
        {
          name: 'ctaLabel',
          type: 'text',
        },
        {
          name: 'ctaHref',
          type: 'text',
        },
        {
          name: 'sortOrder',
          type: 'number',
          defaultValue: 0,
        },
      ],
    },
    {
      name: 'navigation',
      type: 'group',
      fields: [
        {
          name: 'showInNav',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'navLabel',
          type: 'text',
        },
        {
          name: 'sortOrder',
          type: 'number',
          defaultValue: 0,
        },
      ],
    },
    {
      name: 'seo',
      type: 'group',
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'description',
          type: 'textarea',
          maxLength: 180,
        },
        {
          name: 'canonicalPath',
          type: 'text',
        },
        {
          name: 'noIndex',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
    },
  ],
}
