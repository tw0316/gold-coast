import type { CollectionConfig } from 'payload'

import { adminOrEditor, adminOrEditorFieldAccess, isAdminOrEditor } from '../access/roles'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    defaultColumns: ['filename', 'alt', 'accessPolicy', 'mediaStatus', 'updatedAt'],
    group: 'Content',
    useAsTitle: 'alt',
  },
  access: {
    create: adminOrEditor,
    delete: adminOrEditor,
    read: adminOrEditor,
    update: adminOrEditor,
  },
  upload: {
    disableLocalStorage: true,
    filesRequiredOnCreate: true,
    handlers: [
      (req) => {
        if (!isAdminOrEditor(req.user)) {
          return new Response('Not found', {
            status: 404,
          })
        }

        return undefined
      },
    ],
    imageSizes: [
      {
        name: 'card',
        height: 640,
        width: 960,
      },
      {
        name: 'hero',
        height: 960,
        width: 1440,
      },
    ],
    mimeTypes: ['image/*'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'caption',
      type: 'textarea',
    },
    {
      name: 'accessPolicy',
      type: 'select',
      admin: {
        description:
          'Private by default. Public media routes must require this value plus a published page/public deal reference check.',
      },
      defaultValue: 'private',
      index: true,
      options: [
        {
          label: 'Private',
          value: 'private',
        },
        {
          label: 'Public after page/deal reference check',
          value: 'public_after_reference_check',
        },
      ],
      required: true,
    },
    {
      name: 'mediaStatus',
      type: 'select',
      admin: {
        description: 'Draft/hidden/archived media is never public, even if referenced by a public page or deal.',
      },
      defaultValue: 'draft',
      index: true,
      options: [
        {
          label: 'Draft',
          value: 'draft',
        },
        {
          label: 'Ready',
          value: 'ready',
        },
        {
          label: 'Hidden',
          value: 'hidden',
        },
        {
          label: 'Archived',
          value: 'archived',
        },
      ],
      required: true,
    },
    {
      name: 'containsExactAddressOrPrivateDetails',
      type: 'checkbox',
      admin: {
        description:
          'If true, public media helpers deny delivery regardless of page/deal visibility.',
      },
      defaultValue: false,
    },
    {
      name: 'referencedBy',
      type: 'relationship',
      admin: {
        description:
          'Editorial traceability only. Public serving still validates the current page/deal visibility at request time.',
      },
      hasMany: true,
      relationTo: ['pages', 'deals', 'faqs', 'site-settings'],
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      access: {
        read: adminOrEditorFieldAccess,
        update: adminOrEditorFieldAccess,
      },
    },
  ],
}
