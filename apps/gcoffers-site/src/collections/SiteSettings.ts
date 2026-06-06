import type { CollectionConfig } from 'payload'

import { adminOrEditor, adminOrEditorFieldAccess, publicReadOrStaff } from '../access/roles'
import { publicSiteSettingsWhere } from '../lib/payload/publicQueries'

export const SiteSettings: CollectionConfig = {
  slug: 'site-settings',
  admin: {
    defaultColumns: ['label', 'surface', 'updatedAt'],
    group: 'Settings',
    useAsTitle: 'label',
  },
  access: {
    create: adminOrEditor,
    delete: adminOrEditor,
    read: publicReadOrStaff(publicSiteSettingsWhere),
    update: adminOrEditor,
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      defaultValue: 'Default site settings',
      required: true,
    },
    {
      name: 'surface',
      type: 'select',
      defaultValue: 'shared',
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
          label: 'Shared/default',
          value: 'shared',
        },
      ],
      required: true,
    },
    {
      name: 'isPublic',
      type: 'checkbox',
      admin: {
        description: 'Only public settings are returned to unauthenticated frontend reads.',
      },
      defaultValue: true,
      index: true,
    },
    {
      name: 'navigation',
      type: 'array',
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'href',
          type: 'text',
          required: true,
        },
        {
          name: 'surface',
          type: 'select',
          defaultValue: 'shared',
          options: [
            {
              label: 'Seller',
              value: 'seller',
            },
            {
              label: 'Buyer/deals',
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
          name: 'sortOrder',
          type: 'number',
          defaultValue: 0,
        },
      ],
    },
    {
      name: 'footerDisclaimer',
      type: 'textarea',
    },
    {
      name: 'publicContactLabel',
      type: 'text',
      admin: {
        description: 'Display-only contact label. Do not store credentials or private alert destinations here.',
      },
    },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'href',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'seoDefaults',
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
          name: 'openGraphImage',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'alerting',
      type: 'group',
      access: {
        read: adminOrEditorFieldAccess,
        update: adminOrEditorFieldAccess,
      },
      admin: {
        description:
          'Operational destinations are configured through AWS Secrets Manager/env vars in later slices; no secrets belong in Payload content.',
      },
      fields: [
        {
          name: 'dealInterestAlertsEnabled',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'routingNote',
          type: 'textarea',
          admin: {
            description: 'Non-secret routing note only. Do not enter webhook URLs, credentials, email addresses, or phone numbers.',
          },
        },
      ],
    },
  ],
}
