# Payload CMS Sandbox — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully-featured Payload CMS sandbox with blog, page builder, plugins, hooks, RBAC, and trilingual localization (FR/EN/NL) — designed as a reusable reference and compatible with the jardinmusical project's public content layer.

**Architecture:** Incremental feature-by-feature approach. Each task produces a testable result in the admin panel. Collections handle public content only (blog, pages, forms). Access control via role-based system (admin/editor/user). All content fields localized FR/EN/NL with FR as default and fallback.

**Tech Stack:** Payload 3.x, Next.js 16, PostgreSQL 16 (Docker), Lexical editor, Drizzle ORM, TypeScript, pnpm. Plugins: SEO, Nested Docs, Form Builder, Search.

**Spec:** `docs/superpowers/specs/2026-04-02-payload-sandbox-features-design.md`

**Important conventions:**

- Code must include explanatory comments (this is a learning sandbox)
- Comments explain Payload concepts and "why", not obvious "what"
- After each task that modifies collections or config: run `pnpm generate:types` then `pnpm generate:importmap`
- Validate with `tsc --noEmit` after each task

---

## File Structure

```
src/
├── access/
│   ├── anyone.ts              — Public access (read for everyone)
│   ├── authenticated.ts       — Logged-in users only
│   ├── adminOnly.ts           — Admin role check
│   ├── adminOrEditor.ts       — Admin or editor role check
│   ├── adminOrSelf.ts         — Admin or document owner
│   └── publishedOnly.ts       — Query constraint: only published docs
├── blocks/
│   ├── Hero.ts                — Hero banner block
│   ├── Content.ts             — Free-form rich text block
│   ├── HowItWorks.ts          — Numbered steps block
│   ├── TargetAudience.ts      — Profile grid block
│   ├── FAQ.ts                 — Accordion Q&A block
│   ├── Testimonials.ts        — Testimonial carousel block
│   ├── CTA.ts                 — Call-to-action banner block
│   └── ImageGallery.ts        — Image grid with captions block
├── collections/
│   ├── Users.ts               — Extended with roles (admin/editor/user)
│   ├── Media.ts               — Unchanged
│   ├── Posts.ts                — Blog articles with versions/drafts/SEO
│   ├── Categories.ts          — Taxonomy for posts
│   ├── Tags.ts                — Cross-cutting tags
│   ├── Pages.ts               — Modular pages with blocks + nested docs
│   └── AuditLogs.ts           — Change tracking collection
├── hooks/
│   ├── auto-slug.ts           — beforeValidate: generate slug from title/label
│   ├── audit-log.ts           — afterChange/afterDelete: write to AuditLogs
│   ├── publish-workflow.ts    — beforeChange: validate status transitions
│   └── publish-notification.ts — afterChange: log/notify on publish
├── payload.config.ts          — Main config with localization, plugins, all collections
└── payload-types.ts           — Auto-generated types
```

---

## Task 1: Access Control Functions

**Files:**

- Create: `src/access/anyone.ts`
- Create: `src/access/authenticated.ts`
- Create: `src/access/adminOnly.ts`
- Create: `src/access/adminOrEditor.ts`
- Create: `src/access/adminOrSelf.ts`
- Create: `src/access/publishedOnly.ts`

- [ ] **Step 1: Create the access directory**

```bash
mkdir -p src/access
```

- [ ] **Step 2: Create `src/access/anyone.ts`**

```typescript
import type { Access } from 'payload'

// Allows unrestricted access — used for public read operations
// Payload calls this function for every request to determine if the operation is allowed
// Returning `true` grants access unconditionally
export const anyone: Access = () => true
```

- [ ] **Step 3: Create `src/access/authenticated.ts`**

```typescript
import type { Access } from 'payload'

// Allows access only to authenticated users (any role)
// `req.user` is populated by Payload when a valid JWT is present
export const authenticated: Access = ({ req: { user } }) => Boolean(user)
```

- [ ] **Step 4: Create `src/access/adminOnly.ts`**

```typescript
import type { Access } from 'payload'

// Restricts access to users with the 'admin' role
// `roles` is stored in the JWT via `saveToJWT: true` on the Users collection
// This avoids a database lookup on every request
export const adminOnly: Access = ({ req: { user } }) => {
  if (!user) return false
  const roles = user.roles as string[] | undefined
  return roles?.includes('admin') ?? false
}
```

- [ ] **Step 5: Create `src/access/adminOrEditor.ts`**

```typescript
import type { Access } from 'payload'

// Allows access to users with 'admin' or 'editor' role
// Used for content management operations (create, update on Posts/Pages)
export const adminOrEditor: Access = ({ req: { user } }) => {
  if (!user) return false
  const roles = user.roles as string[] | undefined
  return roles?.includes('admin') || roles?.includes('editor') || false
}
```

- [ ] **Step 6: Create `src/access/adminOrSelf.ts`**

```typescript
import type { Access } from 'payload'

// Admin can access all documents; other users can only access their own
// When returning a query constraint object (instead of boolean),
// Payload automatically filters the results — this is more efficient
// than fetching all docs and filtering in JS
export const adminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  const roles = user.roles as string[] | undefined
  if (roles?.includes('admin')) return true
  return { id: { equals: user.id } }
}
```

- [ ] **Step 7: Create `src/access/publishedOnly.ts`**

```typescript
import type { Access } from 'payload'

// Authenticated users see all documents; public visitors only see published ones
// Returns a query constraint that Payload applies at the database level
// This pattern is idiomatic for content with draft/published workflow
export const publishedOnly: Access = ({ req: { user } }) => {
  if (user) return true
  return { status: { equals: 'published' } }
}
```

- [ ] **Step 8: Commit**

```bash
git add src/access/
git commit -m "feat: add access control utility functions (RBAC)"
```

---

## Task 2: Auto-Slug Hook

**Files:**

- Create: `src/hooks/auto-slug.ts`

- [ ] **Step 1: Create the hooks directory**

```bash
mkdir -p src/hooks
```

- [ ] **Step 2: Create `src/hooks/auto-slug.ts`**

```typescript
import type { FieldHook } from 'payload'

// Converts a string to a URL-safe slug
// Handles accented characters (common in FR/NL), spaces, and special chars
const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// beforeValidate hook for slug fields
// Generates a slug from a source field (default: 'title') if the slug is empty
// Allows manual override — if user provides a slug, it's kept as-is
// The `siblingData` object contains all fields at the same level as the slug field
export const autoSlug =
  (sourceField: string = 'title'): FieldHook =>
  ({ value, siblingData }) => {
    if (value) return value
    const source = siblingData?.[sourceField]
    if (typeof source === 'string' && source.length > 0) {
      return slugify(source)
    }
    return value
  }
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/
git commit -m "feat: add auto-slug hook with slugify utility"
```

---

## Task 3: Fondations — Localization + Users RBAC

**Files:**

- Modify: `src/payload.config.ts`
- Modify: `src/collections/Users.ts`

- [ ] **Step 1: Update `src/collections/Users.ts` with roles**

Replace the entire file content:

```typescript
import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'
import { adminOrSelf } from '../access/adminOrSelf'

// Users collection with authentication and role-based access control
// `auth: true` enables Payload's built-in auth (login, JWT, sessions)
// Roles are stored in the JWT via `saveToJWT: true` to avoid DB lookups
export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'roles', 'createdAt'],
  },
  auth: true,
  access: {
    // Admin sees all users; others see only themselves
    read: adminOrSelf,
    // Only admin can create new users (registration is separate)
    create: adminOnly,
    // Admin can update anyone; users can update themselves
    update: adminOrSelf,
    // Only admin can delete users
    delete: adminOnly,
  },
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'User', value: 'user' },
      ],
      defaultValue: ['user'],
      required: true,
      // saveToJWT embeds roles in the auth token
      // so access control functions can check roles without a DB query
      saveToJWT: true,
      access: {
        // Only admins can change roles — prevents privilege escalation
        update: ({ req: { user } }) => {
          const roles = user?.roles as string[] | undefined
          return roles?.includes('admin') ?? false
        },
      },
    },
  ],
}
```

- [ ] **Step 2: Update `src/payload.config.ts` with localization**

Replace the entire file content:

```typescript
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  // Localization: same setup as jardinmusical (FR default, EN, NL)
  // Field-level localization: each field with `localized: true` stores
  // separate values per locale. Non-localized fields share a single value.
  // `fallback: true` means if a translation is missing, Payload returns
  // the defaultLocale (FR) value instead of null
  localization: {
    locales: [
      { label: 'Français', code: 'fr' },
      { label: 'English', code: 'en' },
      { label: 'Nederlands', code: 'nl' },
    ],
    defaultLocale: 'fr',
    fallback: true,
  },
  sharp,
  plugins: [],
})
```

- [ ] **Step 3: Generate types and validate**

```bash
pnpm generate:types
pnpm generate:importmap
tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/collections/Users.ts src/payload.config.ts src/payload-types.ts
git commit -m "feat: add localization (FR/EN/NL) and RBAC roles on Users"
```

---

## Task 4: Categories + Tags Collections

**Files:**

- Create: `src/collections/Categories.ts`
- Create: `src/collections/Tags.ts`
- Modify: `src/payload.config.ts`

- [ ] **Step 1: Create `src/collections/Categories.ts`**

```typescript
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
```

- [ ] **Step 2: Create `src/collections/Tags.ts`**

```typescript
import type { CollectionConfig } from 'payload'
import { anyone } from '../access/anyone'
import { adminOnly } from '../access/adminOnly'
import { adminOrEditor } from '../access/adminOrEditor'
import { autoSlug } from '../hooks/auto-slug'

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
```

- [ ] **Step 3: Register in `src/payload.config.ts`**

Add the imports after the existing collection imports:

```typescript
import { Categories } from './collections/Categories'
import { Tags } from './collections/Tags'
```

Update the collections array:

```typescript
collections: [Users, Media, Categories, Tags],
```

- [ ] **Step 4: Generate types and validate**

```bash
pnpm generate:types
pnpm generate:importmap
tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/collections/Categories.ts src/collections/Tags.ts src/payload.config.ts src/payload-types.ts
git commit -m "feat: add Categories and Tags collections with auto-slug"
```

---

## Task 5: Posts Collection + SEO Plugin

**Files:**

- Create: `src/collections/Posts.ts`
- Modify: `src/payload.config.ts`
- Modify: `package.json` (plugin install)

- [ ] **Step 1: Install the SEO plugin**

```bash
pnpm add @payloadcms/plugin-seo
```

- [ ] **Step 2: Create `src/collections/Posts.ts`**

```typescript
import type { CollectionConfig } from 'payload'
import { anyone } from '../access/anyone'
import { adminOnly } from '../access/adminOnly'
import { adminOrEditor } from '../access/adminOrEditor'
import { publishedOnly } from '../access/publishedOnly'
import { autoSlug } from '../hooks/auto-slug'

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
```

- [ ] **Step 3: Add SEO plugin and Posts to `src/payload.config.ts`**

Add imports:

```typescript
import { seoPlugin } from '@payloadcms/plugin-seo'
import { Posts } from './collections/Posts'
```

Update collections array:

```typescript
collections: [Users, Media, Categories, Tags, Posts],
```

Update plugins array:

```typescript
plugins: [
  // SEO plugin injects a `meta` field group (title, description, image)
  // on each specified collection. These fields are automatically localized
  // when the collection uses localization.
  // `generateTitle` and `generateDescription` provide default values
  // from the document's own fields, overridable by the editor
  seoPlugin({
    collections: ['posts'],
    uploadsCollection: 'media',
    generateTitle: ({ doc }) => `${doc.title} — Payload CMS`,
    generateDescription: ({ doc }) => doc.excerpt || '',
  }),
],
```

- [ ] **Step 4: Generate types and validate**

```bash
pnpm generate:types
pnpm generate:importmap
tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/collections/Posts.ts src/payload.config.ts src/payload-types.ts package.json pnpm-lock.yaml
git commit -m "feat: add Posts collection with versions/drafts and SEO plugin"
```

---

## Task 6: Page Builder Blocks

**Files:**

- Create: `src/blocks/Hero.ts`
- Create: `src/blocks/Content.ts`
- Create: `src/blocks/HowItWorks.ts`
- Create: `src/blocks/TargetAudience.ts`
- Create: `src/blocks/FAQ.ts`
- Create: `src/blocks/Testimonials.ts`
- Create: `src/blocks/CTA.ts`
- Create: `src/blocks/ImageGallery.ts`

- [ ] **Step 1: Create the blocks directory**

```bash
mkdir -p src/blocks
```

- [ ] **Step 2: Create `src/blocks/Hero.ts`**

```typescript
import type { Block } from 'payload'

// Hero block: full-width banner with heading, subheading, background image, and CTA
// Blocks are reusable schema units that can be combined in the Pages `layout` field
// Each block gets its own admin UI panel with add/remove/reorder controls
export const Hero: Block = {
  slug: 'hero',
  labels: {
    singular: 'Hero',
    plural: 'Heroes',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'subheading',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'backgroundImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'ctaLabel',
      type: 'text',
      localized: true,
    },
    {
      name: 'ctaLink',
      type: 'text',
    },
  ],
}
```

- [ ] **Step 3: Create `src/blocks/Content.ts`**

```typescript
import type { Block } from 'payload'

// Content block: free-form rich text using Lexical editor
// Used for body text, legal pages, or any unstructured content
export const Content: Block = {
  slug: 'content',
  labels: {
    singular: 'Content',
    plural: 'Contents',
  },
  fields: [
    {
      name: 'richText',
      type: 'richText',
      required: true,
      localized: true,
    },
  ],
}
```

- [ ] **Step 4: Create `src/blocks/HowItWorks.ts`**

```typescript
import type { Block } from 'payload'

// HowItWorks block: numbered process steps with icon, title, description
// Maps to the jardinmusical landing page "how it works" section
// The `array` field type stores an ordered list of sub-objects
export const HowItWorks: Block = {
  slug: 'howItWorks',
  labels: {
    singular: 'How It Works',
    plural: 'How It Works',
  },
  fields: [
    {
      name: 'steps',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'icon',
          type: 'text',
          admin: {
            description: 'Icon name or emoji for this step',
          },
        },
        {
          name: 'title',
          type: 'text',
          required: true,
          localized: true,
        },
        {
          name: 'description',
          type: 'textarea',
          required: true,
          localized: true,
        },
      ],
    },
  ],
}
```

- [ ] **Step 5: Create `src/blocks/TargetAudience.ts`**

```typescript
import type { Block } from 'payload'

// TargetAudience block: grid of audience profiles with image and description
// Maps to the jardinmusical "target audience" landing section
export const TargetAudience: Block = {
  slug: 'targetAudience',
  labels: {
    singular: 'Target Audience',
    plural: 'Target Audiences',
  },
  fields: [
    {
      name: 'profiles',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          localized: true,
        },
        {
          name: 'description',
          type: 'textarea',
          required: true,
          localized: true,
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
  ],
}
```

- [ ] **Step 6: Create `src/blocks/FAQ.ts`**

```typescript
import type { Block } from 'payload'

// FAQ block: accordion-style question/answer pairs
// Answer uses richText for formatting flexibility (links, lists, bold, etc.)
export const FAQ: Block = {
  slug: 'faq',
  labels: {
    singular: 'FAQ',
    plural: 'FAQs',
  },
  fields: [
    {
      name: 'items',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'question',
          type: 'text',
          required: true,
          localized: true,
        },
        {
          name: 'answer',
          type: 'richText',
          required: true,
          localized: true,
        },
      ],
    },
  ],
}
```

- [ ] **Step 7: Create `src/blocks/Testimonials.ts`**

```typescript
import type { Block } from 'payload'

// Testimonials block: list of quotes from users/clients
// `name` is not localized (proper nouns stay the same)
// `role` and `quote` are localized for translation
export const Testimonials: Block = {
  slug: 'testimonials',
  labels: {
    singular: 'Testimonials',
    plural: 'Testimonials',
  },
  fields: [
    {
      name: 'testimonials',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'role',
          type: 'text',
          localized: true,
        },
        {
          name: 'quote',
          type: 'textarea',
          required: true,
          localized: true,
        },
        {
          name: 'photo',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
  ],
}
```

- [ ] **Step 8: Create `src/blocks/CTA.ts`**

```typescript
import type { Block } from 'payload'

// CTA (Call-to-Action) block: attention-grabbing banner with button
// Used for conversion sections — subscribe, contact, sign up, etc.
export const CTA: Block = {
  slug: 'cta',
  labels: {
    singular: 'Call to Action',
    plural: 'Calls to Action',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'buttonLabel',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'buttonLink',
      type: 'text',
      required: true,
    },
  ],
}
```

- [ ] **Step 9: Create `src/blocks/ImageGallery.ts`**

```typescript
import type { Block } from 'payload'

// ImageGallery block: grid of images with optional localized captions
export const ImageGallery: Block = {
  slug: 'imageGallery',
  labels: {
    singular: 'Image Gallery',
    plural: 'Image Galleries',
  },
  fields: [
    {
      name: 'images',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'caption',
          type: 'text',
          localized: true,
        },
      ],
    },
  ],
}
```

- [ ] **Step 10: Commit**

```bash
git add src/blocks/
git commit -m "feat: add 8 page builder blocks (Hero, Content, HowItWorks, FAQ, etc.)"
```

---

## Task 7: Pages Collection + Nested Docs Plugin

**Files:**

- Create: `src/collections/Pages.ts`
- Modify: `src/payload.config.ts`
- Modify: `package.json` (plugin install)

- [ ] **Step 1: Install the Nested Docs plugin**

```bash
pnpm add @payloadcms/plugin-nested-docs
```

- [ ] **Step 2: Create `src/collections/Pages.ts`**

```typescript
import type { CollectionConfig } from 'payload'
import { anyone } from '../access/anyone'
import { adminOnly } from '../access/adminOnly'
import { adminOrEditor } from '../access/adminOrEditor'
import { publishedOnly } from '../access/publishedOnly'
import { autoSlug } from '../hooks/auto-slug'
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
```

- [ ] **Step 3: Update `src/payload.config.ts`**

Add imports:

```typescript
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { Pages } from './collections/Pages'
```

Update collections array:

```typescript
collections: [Users, Media, Categories, Tags, Posts, Pages],
```

Add SEO for Pages and add Nested Docs plugin — update the plugins array:

```typescript
plugins: [
  seoPlugin({
    collections: ['posts', 'pages'],
    uploadsCollection: 'media',
    generateTitle: ({ doc }) => `${doc.title} — Payload CMS`,
    generateDescription: ({ doc }) => doc.excerpt || '',
  }),
  // Nested Docs adds a `parent` relationship field and a `breadcrumbs` array
  // to the specified collections. This enables hierarchical URL structures
  // like /legal/cgv. The breadcrumbs are auto-generated from the parent chain.
  nestedDocsPlugin({
    collections: ['pages'],
    generateLabel: (_, doc) => doc.title as string,
    generateURL: (docs) =>
      docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
],
```

- [ ] **Step 4: Generate types and validate**

```bash
pnpm generate:types
pnpm generate:importmap
tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/collections/Pages.ts src/payload.config.ts src/payload-types.ts package.json pnpm-lock.yaml
git commit -m "feat: add Pages collection with blocks page builder and Nested Docs plugin"
```

---

## Task 8: Form Builder + Search Plugins

**Files:**

- Modify: `src/payload.config.ts`
- Modify: `package.json` (plugins install)

- [ ] **Step 1: Install both plugins**

```bash
pnpm add @payloadcms/plugin-form-builder @payloadcms/plugin-search
```

- [ ] **Step 2: Update `src/payload.config.ts`**

Add imports:

```typescript
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { searchPlugin } from '@payloadcms/plugin-search'
```

Add both plugins to the plugins array (after the existing ones):

```typescript
// Form Builder creates two collections: 'forms' (schemas) and 'form-submissions'
// Admins define form fields (text, email, textarea, select, checkbox) in the admin panel
// The frontend renders these dynamically and submits to the Payload API
// No hardcoded forms — editors can create contact, newsletter, feedback forms on their own
formBuilderPlugin({
  fields: {
    text: true,
    email: true,
    textarea: true,
    select: true,
    checkbox: true,
  },
}),
// Search plugin creates a 'search-results' collection with flattened,
// index-optimized copies of documents from the specified collections
// It syncs automatically on create/update/delete via hooks
// The frontend queries 'search-results' instead of individual collections
// for fast, unified search across content types
searchPlugin({
  collections: ['posts', 'pages'],
  defaultPriorities: {
    posts: 10,
    pages: 20,
  },
}),
```

- [ ] **Step 3: Generate types and validate**

```bash
pnpm generate:types
pnpm generate:importmap
tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/payload.config.ts src/payload-types.ts package.json pnpm-lock.yaml
git commit -m "feat: add Form Builder and Search plugins"
```

---

## Task 9: AuditLogs Collection + Audit Hook

**Files:**

- Create: `src/collections/AuditLogs.ts`
- Create: `src/hooks/audit-log.ts`
- Modify: `src/payload.config.ts`
- Modify: `src/collections/Posts.ts`
- Modify: `src/collections/Pages.ts`
- Modify: `src/collections/Categories.ts`
- Modify: `src/collections/Tags.ts`

- [ ] **Step 1: Create `src/collections/AuditLogs.ts`**

```typescript
import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'

// AuditLogs: immutable record of all content changes
// Written to by the audit-log hook on Posts, Pages, Categories, Tags
// Read-only — no one creates or edits audit logs manually
// Admin can view for debugging and accountability
export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  admin: {
    useAsTitle: 'collection',
    defaultColumns: ['collection', 'action', 'user', 'createdAt'],
  },
  access: {
    read: adminOnly,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'collection',
      type: 'text',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'documentId',
      type: 'text',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create', value: 'create' },
        { label: 'Update', value: 'update' },
        { label: 'Delete', value: 'delete' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
    },
    {
      // JSON fields store arbitrary data
      // Used here to capture document snapshots for diff comparison
      name: 'before',
      type: 'json',
      admin: { readOnly: true },
    },
    {
      name: 'after',
      type: 'json',
      admin: { readOnly: true },
    },
  ],
}
```

- [ ] **Step 2: Create `src/hooks/audit-log.ts`**

```typescript
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

// afterChange hook that writes an audit log entry for every create/update
// IMPORTANT: `req` is passed to the nested `create` call to ensure
// the audit log write happens in the SAME database transaction as the
// original operation. Without `req`, a crash between the two operations
// could leave the audit log inconsistent.
//
// `context.skipAudit` prevents infinite loops — without it, writing
// an audit log would trigger another audit log write, and so on
export const auditAfterChange: CollectionAfterChangeHook = async ({
  collection,
  doc,
  previousDoc,
  operation,
  req,
  context,
}) => {
  if (context.skipAudit) return doc

  await req.payload.create({
    collection: 'audit-logs',
    data: {
      collection: collection.slug,
      documentId: doc.id,
      action: operation === 'create' ? 'create' : 'update',
      user: req.user?.id || null,
      before: operation === 'update' ? previousDoc : null,
      after: doc,
    },
    req,
    context: { skipAudit: true },
  })

  return doc
}

// afterDelete hook — similar to afterChange but for delete operations
export const auditAfterDelete: CollectionAfterDeleteHook = async ({
  collection,
  doc,
  req,
  context,
}) => {
  if (context.skipAudit) return doc

  await req.payload.create({
    collection: 'audit-logs',
    data: {
      collection: collection.slug,
      documentId: doc.id,
      action: 'delete',
      user: req.user?.id || null,
      before: doc,
      after: null,
    },
    req,
    context: { skipAudit: true },
  })

  return doc
}
```

- [ ] **Step 3: Add audit hooks to Posts**

In `src/collections/Posts.ts`, add import:

```typescript
import { auditAfterChange, auditAfterDelete } from '../hooks/audit-log'
```

Add hooks property to the collection config (after `versions`):

```typescript
hooks: {
  afterChange: [auditAfterChange],
  afterDelete: [auditAfterDelete],
},
```

- [ ] **Step 4: Add audit hooks to Pages**

In `src/collections/Pages.ts`, add import:

```typescript
import { auditAfterChange, auditAfterDelete } from '../hooks/audit-log'
```

Add hooks property (after `versions`):

```typescript
hooks: {
  afterChange: [auditAfterChange],
  afterDelete: [auditAfterDelete],
},
```

- [ ] **Step 5: Add audit hooks to Categories**

In `src/collections/Categories.ts`, add import:

```typescript
import { auditAfterChange, auditAfterDelete } from '../hooks/audit-log'
```

Add hooks property (after `access`):

```typescript
hooks: {
  afterChange: [auditAfterChange],
  afterDelete: [auditAfterDelete],
},
```

- [ ] **Step 6: Add audit hooks to Tags**

In `src/collections/Tags.ts`, add import:

```typescript
import { auditAfterChange, auditAfterDelete } from '../hooks/audit-log'
```

Add hooks property (after `access`):

```typescript
hooks: {
  afterChange: [auditAfterChange],
  afterDelete: [auditAfterDelete],
},
```

- [ ] **Step 7: Register AuditLogs in `src/payload.config.ts`**

Add import:

```typescript
import { AuditLogs } from './collections/AuditLogs'
```

Update collections array:

```typescript
collections: [Users, Media, Categories, Tags, Posts, Pages, AuditLogs],
```

- [ ] **Step 8: Generate types and validate**

```bash
pnpm generate:types
pnpm generate:importmap
tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add src/collections/AuditLogs.ts src/hooks/audit-log.ts src/collections/Posts.ts src/collections/Pages.ts src/collections/Categories.ts src/collections/Tags.ts src/payload.config.ts src/payload-types.ts
git commit -m "feat: add AuditLogs collection and audit hook on all content collections"
```

---

## Task 10: Publish Workflow + Notification Hooks

**Files:**

- Create: `src/hooks/publish-workflow.ts`
- Create: `src/hooks/publish-notification.ts`
- Modify: `src/collections/Posts.ts`

- [ ] **Step 1: Create `src/hooks/publish-workflow.ts`**

```typescript
import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

// Validates status transitions on Posts:
//   draft → review     (editor or admin)
//   review → published  (admin only)
//   review → draft      (owner or admin)
//   published → draft   (admin only)
//
// This is a `beforeChange` hook — it runs BEFORE the document is saved.
// Throwing an APIError aborts the save and returns the error to the client.
// The `previousDoc` parameter contains the document state before the change.
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['review'],
  review: ['draft', 'published'],
  published: ['draft'],
}

export const publishWorkflow: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  if (operation !== 'update') return data
  if (!data.status || !originalDoc?.status) return data
  if (data.status === originalDoc.status) return data

  const from = originalDoc.status as string
  const to = data.status as string
  const roles = (req.user?.roles as string[] | undefined) ?? []

  const allowed = VALID_TRANSITIONS[from]
  if (!allowed?.includes(to)) {
    throw new APIError(`Invalid status transition: ${from} → ${to}`, 400)
  }

  if (to === 'published' && !roles.includes('admin')) {
    throw new APIError('Only admins can publish content', 403)
  }

  if (from === 'published' && to === 'draft' && !roles.includes('admin')) {
    throw new APIError('Only admins can unpublish content', 403)
  }

  // Auto-set publishedAt when transitioning to published
  if (to === 'published' && !data.publishedAt) {
    data.publishedAt = new Date().toISOString()
  }

  // Clear publishedAt when reverting to draft
  if (to === 'draft') {
    data.publishedAt = null
  }

  return data
}
```

- [ ] **Step 2: Create `src/hooks/publish-notification.ts`**

```typescript
import type { CollectionAfterChangeHook } from 'payload'

// Logs a notification when a post transitions to "published"
// This is a simple console.log for the sandbox — in production,
// replace with email, Slack webhook, or push notification
// The hook compares previousDoc.status with doc.status to detect transitions
export const publishNotification: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  if (operation !== 'update') return doc

  const wasPublished = previousDoc?.status !== 'published' && doc.status === 'published'

  if (wasPublished) {
    const user = req.user?.email || 'unknown'
    console.log(`[PUBLISH] "${doc.title}" published by ${user} at ${new Date().toISOString()}`)
  }

  return doc
}
```

- [ ] **Step 3: Add workflow and notification hooks to Posts**

In `src/collections/Posts.ts`, add imports:

```typescript
import { publishWorkflow } from '../hooks/publish-workflow'
import { publishNotification } from '../hooks/publish-notification'
```

Update the hooks property to include all hooks:

```typescript
hooks: {
  beforeChange: [publishWorkflow],
  afterChange: [auditAfterChange, publishNotification],
  afterDelete: [auditAfterDelete],
},
```

- [ ] **Step 4: Generate types and validate**

```bash
pnpm generate:types
tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/publish-workflow.ts src/hooks/publish-notification.ts src/collections/Posts.ts src/payload-types.ts
git commit -m "feat: add publish workflow validation and notification hooks"
```

---

## Task 11: Final Validation

**Files:**

- Verify: `src/payload.config.ts` (complete state)
- Verify: all collections registered
- Verify: all plugins configured

- [ ] **Step 1: Verify final `src/payload.config.ts` state**

The final config should contain:

- 7 collections: Users, Media, Categories, Tags, Posts, Pages, AuditLogs
- 4 plugins: seoPlugin, nestedDocsPlugin, formBuilderPlugin, searchPlugin
- Localization: fr (default), en, nl with fallback
- All imports present

Read the file and verify all pieces are assembled correctly.

- [ ] **Step 2: Full type generation and validation**

```bash
pnpm generate:types
pnpm generate:importmap
tsc --noEmit
```

- [ ] **Step 3: Verify file structure**

```bash
find src/access src/blocks src/collections src/hooks -type f | sort
```

Expected output:

```
src/access/adminOnly.ts
src/access/adminOrEditor.ts
src/access/adminOrSelf.ts
src/access/anyone.ts
src/access/authenticated.ts
src/access/publishedOnly.ts
src/blocks/CTA.ts
src/blocks/Content.ts
src/blocks/FAQ.ts
src/blocks/Hero.ts
src/blocks/HowItWorks.ts
src/blocks/ImageGallery.ts
src/blocks/TargetAudience.ts
src/blocks/Testimonials.ts
src/collections/AuditLogs.ts
src/collections/Categories.ts
src/collections/Media.ts
src/collections/Pages.ts
src/collections/Posts.ts
src/collections/Tags.ts
src/collections/Users.ts
src/hooks/audit-log.ts
src/hooks/auto-slug.ts
src/hooks/publish-notification.ts
src/hooks/publish-workflow.ts
```

- [ ] **Step 4: Start dev server and verify admin panel**

```bash
make start
```

Open http://localhost:3000/admin and verify:

- Language selector appears (FR/EN/NL)
- All collections visible in sidebar (Users, Media, Categories, Tags, Posts, Pages, Forms, Form Submissions, Search Results, Audit Logs)
- Posts: can create with rich text, select category/tags, SEO meta fields visible
- Pages: block picker shows all 8 blocks (Hero, Content, HowItWorks, etc.)
- Pages: parent field available (Nested Docs)
- Forms: can create a new form with field types
- Audit Logs: visible to admin, shows entries after creating content

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Payload CMS sandbox with all features"
```
