import type { CollectionConfig } from 'payload'
import { anyone } from '../access/anyone'
import { adminOnly } from '../access/adminOnly'
import { adminOrEditor } from '../access/adminOrEditor'
import { autoSlug } from '../hooks/auto-slug'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit-log'

// Tags are similar to Categories but used for cross-cutting labels
// A post can have many tags (hasMany relationship defined in Posts)
export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'slug'],
  },
  access: {
    read: anyone,
    create: adminOrEditor,
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: {
    afterChange: [auditAfterChange],
    afterDelete: [auditAfterDelete],
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      hooks: {
        beforeValidate: [autoSlug('label')],
      },
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
