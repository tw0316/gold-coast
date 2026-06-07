import type { CollectionConfig } from 'payload'

import { adminOnly, adminOnlyFieldAccess, adminOrEditor } from '../access/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: adminOrEditor,
    update: adminOnly,
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      access: {
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      defaultValue: 'editor',
      required: true,
      options: [
        {
          label: 'Admin',
          value: 'admin',
        },
        {
          label: 'Editor',
          value: 'editor',
        },
      ],
    },
  ],
}
