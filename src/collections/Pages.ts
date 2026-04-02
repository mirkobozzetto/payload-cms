import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'
import { adminOrEditor } from '../access/adminOrEditor'
import { publishedOnly } from '../access/publishedOnly'
import { autoSlug } from '../hooks/auto-slug'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit-log'
import { Hero } from '../blocks/Hero'
import { Content } from '../blocks/Content'
import { HowItWorks } from '../blocks/HowItWorks'
import { TargetAudience } from '../blocks/TargetAudience'
import { FAQ } from '../blocks/FAQ'
import { Testimonials } from '../blocks/Testimonials'
import { CTA } from '../blocks/CTA'
import { ImageGallery } from '../blocks/ImageGallery'

// Pages: modular page builder using the `blocks` field type
// Each page is composed of reusable blocks that the editor can add,
// remove, and reorder in the admin panel — similar to WordPress Gutenberg
// or a drag-and-drop page builder
//
// The Nested Docs plugin adds a `parent` field and `breadcrumbs` array
// for URL hierarchy (e.g., /legal/cgv, /legal/cgu)
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'status', 'updatedAt'],
  },
  access: {
    read: publishedOnly,
    create: adminOrEditor,
    update: adminOrEditor,
    delete: adminOnly,
  },
  versions: {
    drafts: {
      autosave: true,
    },
    maxPerDoc: 25,
  },
  hooks: {
    afterChange: [auditAfterChange],
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
      // The `blocks` field type is the core of the page builder
      // It stores an array of objects, each with a `blockType` discriminator
      // and the fields defined in the corresponding Block schema
      // The admin UI renders each block with its own form section
      name: 'layout',
      type: 'blocks',
      required: true,
      localized: true,
      blocks: [Hero, Content, HowItWorks, TargetAudience, FAQ, Testimonials, CTA, ImageGallery],
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
