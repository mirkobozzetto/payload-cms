import type { CollectionConfig } from 'payload'
import { anyone } from '../access/anyone'
import { adminOnly } from '../access/adminOnly'
import { adminOrEditor } from '../access/adminOrEditor'
import { autoSlug } from '../hooks/auto-slug'

// Categories for organizing blog posts
// `localized: true` on label allows different category names per language
// Slug is NOT localized — URLs stay consistent across languages
export const Categories: CollectionConfig = {
  slug: 'categories',
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
        // Generate slug from 'label' field if not manually set
        beforeValidate: [autoSlug('label')],
      },
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
