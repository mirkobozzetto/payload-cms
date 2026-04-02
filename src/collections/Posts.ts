import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'
import { adminOrEditor } from '../access/adminOrEditor'
import { publishedOnly } from '../access/publishedOnly'
import { autoSlug } from '../hooks/auto-slug'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit-log'
import { publishWorkflow } from '../hooks/publish-workflow'
import { publishNotification } from '../hooks/publish-notification'

// Posts: blog articles with rich text, relationships, versioning, and drafts
// `versions.drafts` enables the draft/published workflow — documents start as
// drafts and must be explicitly published. `autosave` saves changes automatically.
// `schedulePublish` allows scheduling a future publish date.
export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'status', 'publishedAt', 'updatedAt'],
  },
  access: {
    // Public and authenticated users only see published posts
    // Admin/editor see all (handled by publishedOnly returning true for auth users)
    read: publishedOnly,
    create: adminOrEditor,
    update: adminOrEditor,
    delete: adminOnly,
  },
  // Versions track the full history of each document with visual diffs in admin
  versions: {
    drafts: {
      autosave: true,
      schedulePublish: true,
    },
    maxPerDoc: 25,
  },
  hooks: {
    beforeChange: [publishWorkflow],
    afterChange: [auditAfterChange, publishNotification],
    afterDelete: [auditAfterDelete],
  },
  fields: [
    {
      name: 'title',
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
        beforeValidate: [autoSlug('title')],
      },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      localized: true,
      admin: {
        description: 'Short summary displayed in post listings',
      },
    },
    {
      name: 'content',
      type: 'richText',
      localized: true,
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      // Relationship fields link documents across collections
      // `relationTo` specifies the target collection slug
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      admin: {
        position: 'sidebar',
      },
    },
    {
      // `hasMany: true` allows selecting multiple tags
      // Stored as an array of IDs in the database
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Review', value: 'review' },
        { label: 'Published', value: 'published' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
}
