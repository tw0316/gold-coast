import type { CollectionConfig } from 'payload'

import { adminOrEditor, adminOrEditorFieldAccess } from '../access/roles'

export const BuyerSignups: CollectionConfig = {
  slug: 'buyer-signups',
  admin: {
    defaultColumns: ['submittedAt', 'source', 's3FirstStatus', 'ghlSyncStatus'],
    group: 'Submissions',
    useAsTitle: 's3ObjectKey',
  },
  access: {
    create: adminOrEditor,
    delete: adminOrEditor,
    read: adminOrEditor,
    update: adminOrEditor,
  },
  fields: [
    {
      name: 's3ObjectKey',
      type: 'text',
      admin: {
        description: 'S3-first source-of-truth object key. Mirror rows are written only after S3 persistence succeeds.',
      },
      index: true,
      required: true,
      unique: true,
    },
    {
      name: 'submittedAt',
      type: 'date',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      access: {
        read: adminOrEditorFieldAccess,
        update: adminOrEditorFieldAccess,
      },
      required: true,
    },
    {
      name: 'emailHash',
      type: 'text',
      admin: {
        description: 'Non-PII hash used for dedupe/S3 keying; raw PII must not appear in logs/evidence.',
      },
      index: true,
    },
    {
      name: 'fullName',
      type: 'text',
      access: {
        read: adminOrEditorFieldAccess,
        update: adminOrEditorFieldAccess,
      },
    },
    {
      name: 'phone',
      type: 'text',
      access: {
        read: adminOrEditorFieldAccess,
        update: adminOrEditorFieldAccess,
      },
    },
    {
      name: 'buyerType',
      type: 'select',
      options: [
        {
          label: 'Cash buyer',
          value: 'cash_buyer',
        },
        {
          label: 'Financed buyer',
          value: 'financed_buyer',
        },
        {
          label: 'Agent / representative',
          value: 'agent',
        },
        {
          label: 'Other',
          value: 'other',
        },
      ],
    },
    {
      name: 'areas',
      type: 'relationship',
      hasMany: true,
      relationTo: 'markets',
    },
    {
      name: 'propertyTypes',
      type: 'select',
      hasMany: true,
      options: [
        {
          label: 'Single family',
          value: 'single_family',
        },
        {
          label: 'Multifamily',
          value: 'multifamily',
        },
        {
          label: 'Condo / townhome',
          value: 'condo_townhome',
        },
        {
          label: 'Land',
          value: 'land',
        },
      ],
    },
    {
      name: 'priceRange',
      type: 'text',
    },
    {
      name: 'purchaseMethod',
      type: 'select',
      options: [
        {
          label: 'Cash',
          value: 'cash',
        },
        {
          label: 'Hard money',
          value: 'hard_money',
        },
        {
          label: 'Conventional / other financing',
          value: 'financing',
        },
        {
          label: 'Undecided',
          value: 'undecided',
        },
      ],
    },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'deals-website',
      options: [
        {
          label: 'Deals website',
          value: 'deals-website',
        },
        {
          label: 'Buyer list',
          value: 'buyer-list',
        },
      ],
      required: true,
    },
    {
      name: 'serviceConsent',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'marketingConsent',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'smsConsent',
      type: 'checkbox',
      admin: {
        description: 'Explicit SMS consent only. Must never be pre-checked on public forms.',
      },
      defaultValue: false,
    },
    {
      name: 'consentTimestamp',
      type: 'date',
    },
    {
      name: 's3FirstStatus',
      type: 'select',
      defaultValue: 's3_persisted',
      options: [
        {
          label: 'S3 persisted',
          value: 's3_persisted',
        },
        {
          label: 'Mirror repair needed',
          value: 'mirror_repair_needed',
        },
      ],
      required: true,
    },
    {
      name: 'ghlSyncStatus',
      type: 'select',
      defaultValue: 'not_attempted',
      options: [
        {
          label: 'Not attempted',
          value: 'not_attempted',
        },
        {
          label: 'Queued',
          value: 'queued',
        },
        {
          label: 'Succeeded',
          value: 'succeeded',
        },
        {
          label: 'Failed',
          value: 'failed',
        },
      ],
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
