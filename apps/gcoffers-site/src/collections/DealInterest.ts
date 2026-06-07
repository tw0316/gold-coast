import type { CollectionConfig } from 'payload'

import { adminOrEditor, adminOrEditorFieldAccess } from '../access/roles'

export const DealInterest: CollectionConfig = {
  slug: 'deal-interest',
  admin: {
    defaultColumns: ['submittedAt', 'dealSlug', 's3FirstStatus', 'ghlSyncStatus', 'alertStatus'],
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
        description:
          'S3-first source-of-truth object key. Mirror rows and alerts are created only after S3 persistence succeeds.',
      },
      index: true,
      required: true,
      unique: true,
    },
    {
      name: 'deal',
      type: 'relationship',
      relationTo: 'deals',
    },
    {
      name: 'dealSlug',
      type: 'text',
      index: true,
      required: true,
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
        description: 'Non-PII hash for idempotency/dedupe and S3 keying.',
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
      name: 'message',
      type: 'textarea',
      access: {
        read: adminOrEditorFieldAccess,
        update: adminOrEditorFieldAccess,
      },
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
      ],
      required: true,
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
      name: 'alertStatus',
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
          label: 'Sent',
          value: 'sent',
        },
        {
          label: 'Failed',
          value: 'failed',
        },
      ],
    },
    {
      name: 'redactedAlertSummary',
      type: 'textarea',
      admin: {
        description: 'No raw email/phone/full contact details. Slack/email alert implementation belongs to later slices.',
      },
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
