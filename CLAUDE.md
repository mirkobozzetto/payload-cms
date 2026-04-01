# Payload CMS Development Rules

You are an expert Payload CMS developer. When working with Payload projects, follow these rules:

## Core Principles

1. **TypeScript-First**: Always use TypeScript with proper types from Payload
2. **Security-Critical**: Follow all security patterns, especially access control
3. **Type Generation**: Run `generate:types` script after schema changes
4. **Transaction Safety**: Always pass `req` to nested operations in hooks
5. **Access Control**: Understand Local API bypasses access control by default
6. **Access Control**: Ensure roles exist when modifiyng collection or globals with access controls

### Code Validation

- To validate typescript correctness after modifying code run `tsc --noEmit`
- Generate import maps after creating or modifying components.

## Project Structure

```
src/
├── app/
│   ├── (frontend)/          # Frontend routes
│   └── (payload)/           # Payload admin routes
├── collections/             # Collection configs
├── globals/                 # Global configs
├── components/              # Custom React components
├── hooks/                   # Hook functions
├── access/                  # Access control functions
└── payload.config.ts        # Main config
```

## Configuration

### Minimal Config Pattern

```typescript
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: 'users',
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
  }),
})
```

## Collections

### Basic Collection

```typescript
import type { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'status', 'createdAt'],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'content', type: 'richText' },
    { name: 'author', type: 'relationship', relationTo: 'users' },
  ],
  timestamps: true,
}
```

### Auth Collection with RBAC

```typescript
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      options: ['admin', 'editor', 'user'],
      defaultValue: ['user'],
      required: true,
      saveToJWT: true,
      access: {
        update: ({ req: { user } }) => user?.roles?.includes('admin'),
      },
    },
  ],
}
```

## Fields

### Common Patterns

```typescript
// Auto-generate slugs
import { slugField } from 'payload'
slugField({ fieldToUse: 'title' })

// Relationship with filtering
{
  name: 'category',
  type: 'relationship',
  relationTo: 'categories',
  filterOptions: { active: { equals: true } },
}

// Conditional field
{
  name: 'featuredImage',
  type: 'upload',
  relationTo: 'media',
  admin: {
    condition: (data) => data.featured === true,
  },
}

// Virtual field
{
  name: 'fullName',
  type: 'text',
  virtual: true,
  hooks: {
    afterRead: [({ siblingData }) => `${siblingData.firstName} ${siblingData.lastName}`],
  },
}
```

## CRITICAL SECURITY PATTERNS

### 1. Local API Access Control (MOST IMPORTANT)

```typescript
// ❌ SECURITY BUG: Access control bypassed
await payload.find({
  collection: 'posts',
  user: someUser,
})

// ✅ SECURE: Enforces user permissions
await payload.find({
  collection: 'posts',
  user: someUser,
  overrideAccess: false,
})

// ✅ Administrative operation (intentional bypass)
await payload.find({
  collection: 'posts',
})
```

**Rule**: When passing `user` to Local API, ALWAYS set `overrideAccess: false`

### 2. Transaction Safety in Hooks

```typescript
// ❌ DATA CORRUPTION RISK: Separate transaction
hooks: {
  afterChange: [
    async ({ doc, req }) => {
      await req.payload.create({
        collection: 'audit-log',
        data: { docId: doc.id },
      })
    },
  ],
}

// ✅ ATOMIC: Same transaction
hooks: {
  afterChange: [
    async ({ doc, req }) => {
      await req.payload.create({
        collection: 'audit-log',
        data: { docId: doc.id },
        req,
      })
    },
  ],
}
```

**Rule**: ALWAYS pass `req` to nested operations in hooks

### 3. Prevent Infinite Hook Loops

```typescript
// ✅ SAFE: Use context flag
hooks: {
  afterChange: [
    async ({ doc, req, context }) => {
      if (context.skipHooks) return

      await req.payload.update({
        collection: 'posts',
        id: doc.id,
        data: { views: doc.views + 1 },
        context: { skipHooks: true },
        req,
      })
    },
  ],
}
```

## Access Control

### Common Access Patterns

```typescript
export const anyone: Access = () => true

export const authenticated: Access = ({ req: { user } }) => Boolean(user)

export const adminOnly: Access = ({ req: { user } }) => {
  return user?.roles?.includes('admin')
}

export const adminOrSelf: Access = ({ req: { user } }) => {
  if (user?.roles?.includes('admin')) return true
  return { id: { equals: user?.id } }
}

export const authenticatedOrPublished: Access = ({ req: { user } }) => {
  if (user) return true
  return { _status: { equals: 'published' } }
}
```

## Queries

### Local API

```typescript
const posts = await payload.find({
  collection: 'posts',
  where: {
    and: [{ status: { equals: 'published' } }, { 'author.name': { contains: 'john' } }],
  },
  depth: 2,
  limit: 10,
  sort: '-createdAt',
  select: { title: true, author: true },
})

const post = await payload.findByID({ collection: 'posts', id: '123', depth: 2 })

const newPost = await payload.create({
  collection: 'posts',
  data: { title: 'New Post', status: 'draft' },
})

await payload.update({ collection: 'posts', id: '123', data: { status: 'published' } })

await payload.delete({ collection: 'posts', id: '123' })
```

### Query Operators

```typescript
{ status: { equals: 'published' } }
{ status: { not_equals: 'draft' } }
{ price: { greater_than: 100 } }
{ title: { contains: 'payload' } }
{ description: { like: 'cms headless' } }
{ category: { in: ['tech', 'news'] } }
{ image: { exists: true } }
```

## Getting Payload Instance

```typescript
import { getPayload } from 'payload'
import config from '@payload-config'

// In API routes or Server Components
const payload = await getPayload({ config })
const { docs } = await payload.find({ collection: 'posts' })
```

## Components

All components are **Server Components by default**. Use `'use client'` directive only when needed.

Components are defined using **file paths** in config, not direct imports.

### Using Hooks (Client Components Only)

```tsx
'use client'
import {
  useAuth,
  useConfig,
  useDocumentInfo,
  useField,
  useForm,
  useFormFields,
  useLocale,
  useTranslation,
  usePayload,
} from '@payloadcms/ui'
```

## Custom Endpoints

```typescript
import type { Endpoint } from 'payload'
import { APIError } from 'payload'

export const protectedEndpoint: Endpoint = {
  path: '/protected',
  method: 'get',
  handler: async (req) => {
    if (!req.user) {
      throw new APIError('Unauthorized', 401)
    }
    const data = await req.payload.find({
      collection: 'posts',
      where: { author: { equals: req.user.id } },
    })
    return Response.json(data)
  },
}
```

## Drafts & Versions

```typescript
export const Pages: CollectionConfig = {
  slug: 'pages',
  versions: {
    drafts: {
      autosave: true,
      schedulePublish: true,
      validate: false,
    },
    maxPerDoc: 100,
  },
}
```

## Plugins

```typescript
import { seoPlugin } from '@payloadcms/plugin-seo'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'

export default buildConfig({
  plugins: [
    seoPlugin({ collections: ['posts', 'pages'] }),
    redirectsPlugin({ collections: ['pages'] }),
  ],
})
```

## Best Practices

### Security
1. Always set `overrideAccess: false` when passing `user` to Local API
2. Field-level access only returns boolean (no query constraints)
3. Default to restrictive access, gradually add permissions
4. Use `saveToJWT: true` for roles to avoid database lookups

### Performance
1. Index frequently queried fields
2. Use `select` to limit returned fields
3. Set `maxDepth` on relationships to prevent over-fetching
4. Use query constraints over async operations in access control

### Data Integrity
1. Always pass `req` to nested operations in hooks
2. Use context flags to prevent infinite hook loops
3. Use `beforeValidate` for data formatting
4. Use `beforeChange` for business logic

### Organization
1. Keep collections in separate files
2. Extract access control to `access/` directory
3. Extract hooks to `hooks/` directory

## Common Gotchas

1. **Local API Default**: Access control bypassed unless `overrideAccess: false`
2. **Transaction Safety**: Missing `req` in nested operations breaks atomicity
3. **Hook Loops**: Operations in hooks can trigger the same hooks
4. **Field Access**: Cannot use query constraints, only boolean
5. **Relationship Depth**: Default depth is 2, set to 0 for IDs only
6. **Draft Status**: `_status` field auto-injected when drafts enabled
7. **Type Generation**: Types not updated until `generate:types` runs

## Resources

- Docs: https://payloadcms.com/docs
- LLM Context: https://payloadcms.com/llms-full.txt
- GitHub: https://github.com/payloadcms/payload
- Examples: https://github.com/payloadcms/payload/tree/main/examples
- Templates: https://github.com/payloadcms/payload/tree/main/templates
