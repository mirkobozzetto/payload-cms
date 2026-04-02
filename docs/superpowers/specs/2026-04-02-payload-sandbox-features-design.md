# Payload CMS Sandbox — Feature Design

## Context

Standalone Payload CMS sandbox (`payload-cms/`) designed as an exploration playground.
The CMS manages **public-facing content only** — compatible with the jardinmusical project
where transactional data (bookings, credits, organizations) stays on Prisma/Better Auth.

Payload serves: landing pages, blog, legal pages, FAQ, testimonials, forms.
Payload does NOT serve: product catalog, user accounts, bookings, payments.

### Current State

- Payload 3.x + Next.js 16 + PostgreSQL 16 (Docker) + Lexical editor
- Two collections: Users (auth), Media (uploads)
- No plugins, no hooks, no localization
- Code must be documented with explanatory comments (reusable reference)

---

## 1. Collections

### Posts

Blog/article collection with rich text content, relationships, and versioning.

| Field         | Type                      | Localized | Notes                                      |
| ------------- | ------------------------- | --------- | ------------------------------------------ |
| title         | text                      | yes       | required                                   |
| slug          | text                      | no        | unique, indexed, auto-generated from title |
| excerpt       | textarea                  | yes       | short summary                              |
| content       | richText (Lexical)        | yes       | main body                                  |
| featuredImage | upload (Media)            | no        | hero image                                 |
| author        | relationship (Users)      | no        |                                            |
| category      | relationship (Categories) | no        |                                            |
| tags          | relationship (Tags)       | no        | hasMany                                    |
| status        | select                    | no        | draft / review / published                 |
| publishedAt   | date                      | no        | set on publish                             |

- Versions enabled with drafts, autosave, schedulePublish
- SEO plugin adds meta group (title, description, image)
- `useAsTitle: 'title'`

### Categories

| Field | Type | Localized | Notes                  |
| ----- | ---- | --------- | ---------------------- |
| label | text | yes       | required               |
| slug  | text | no        | unique, auto-generated |

### Tags

| Field | Type | Localized | Notes                  |
| ----- | ---- | --------- | ---------------------- |
| label | text | yes       | required               |
| slug  | text | no        | unique, auto-generated |

### Pages

Modular page builder using the blocks field.

| Field       | Type                 | Localized | Notes                           |
| ----------- | -------------------- | --------- | ------------------------------- |
| title       | text                 | yes       | required                        |
| slug        | text                 | no        | unique, indexed, auto-generated |
| layout      | blocks               | yes       | array of blocks (see Section 2) |
| parent      | relationship (Pages) | no        | added by Nested Docs plugin     |
| status      | select               | no        | draft / review / published      |
| publishedAt | date                 | no        |                                 |

- Versions enabled with drafts, autosave
- SEO plugin adds meta group
- Nested Docs plugin adds parent/breadcrumbs
- `useAsTitle: 'title'`

### AuditLogs

| Field      | Type                 | Localized | Notes                         |
| ---------- | -------------------- | --------- | ----------------------------- |
| collection | text                 | no        | which collection was modified |
| documentId | text                 | no        | ID of the modified document   |
| action     | select               | no        | create / update / delete      |
| user       | relationship (Users) | no        | who performed the action      |
| before     | json                 | no        | document state before change  |
| after      | json                 | no        | document state after change   |

- No versions, no drafts
- Read-only for admins, hidden from others
- `timestamps: true` provides createdAt

### Users (existing, extended)

Add roles field to existing Users collection.

| Field | Type             | Notes                                                 |
| ----- | ---------------- | ----------------------------------------------------- |
| roles | select (hasMany) | admin / editor / user, default: user, saveToJWT: true |

### Media (existing, unchanged)

No modifications needed.

---

## 2. Page Builder Blocks

Each block is a self-contained schema used in the Pages `layout` field.

### Hero

| Field           | Type           | Localized |
| --------------- | -------------- | --------- |
| heading         | text           | yes       |
| subheading      | textarea       | yes       |
| backgroundImage | upload (Media) | no        |
| ctaLabel        | text           | yes       |
| ctaLink         | text           | no        |

### Content

| Field    | Type               | Localized |
| -------- | ------------------ | --------- |
| richText | richText (Lexical) | yes       |

### HowItWorks

| Field             | Type     | Localized |
| ----------------- | -------- | --------- |
| steps             | array    | yes       |
| steps.icon        | text     | no        |
| steps.title       | text     | yes       |
| steps.description | textarea | yes       |

### TargetAudience

| Field                | Type           | Localized |
| -------------------- | -------------- | --------- |
| profiles             | array          | yes       |
| profiles.title       | text           | yes       |
| profiles.description | textarea       | yes       |
| profiles.image       | upload (Media) | no        |

### FAQ

| Field          | Type               | Localized |
| -------------- | ------------------ | --------- |
| items          | array              | yes       |
| items.question | text               | yes       |
| items.answer   | richText (Lexical) | yes       |

### Testimonials

| Field              | Type           | Localized |
| ------------------ | -------------- | --------- |
| testimonials       | array          | —         |
| testimonials.name  | text           | no        |
| testimonials.role  | text           | yes       |
| testimonials.quote | textarea       | yes       |
| testimonials.photo | upload (Media) | no        |

### CTA

| Field       | Type     | Localized |
| ----------- | -------- | --------- |
| heading     | text     | yes       |
| description | textarea | yes       |
| buttonLabel | text     | yes       |
| buttonLink  | text     | no        |

### ImageGallery

| Field          | Type           | Localized |
| -------------- | -------------- | --------- |
| images         | array          | —         |
| images.image   | upload (Media) | no        |
| images.caption | text           | yes       |

---

## 3. Plugins

### SEO (`@payloadcms/plugin-seo`)

- Enabled on: Posts, Pages
- Adds: meta.title, meta.description, meta.image (all localized)
- generateTitle and generateDescription helpers from document fields

### Nested Docs (`@payloadcms/plugin-nested-docs`)

- Enabled on: Pages
- Adds: parent field, breadcrumbs array
- Enables URL hierarchy: `/legal/cgv`, `/legal/cgu`, `/blog/category/post`

### Form Builder (`@payloadcms/plugin-form-builder`)

- Creates: Forms collection (admin-editable form schemas) + FormSubmissions collection
- Field types: text, email, textarea, select, checkbox
- Redirect on submit configurable per form

### Search (`@payloadcms/plugin-search`)

- Indexes: Posts, Pages
- Creates: SearchResults collection with flattened, search-optimized records
- Syncs automatically on document create/update/delete

---

## 4. Hooks

### Auto-slug (beforeValidate)

- Applied to: Posts, Pages, Categories, Tags
- Generates slug from title (or label) using a shared slugify utility
- Only generates if slug is empty (allows manual override)
- Not localized (slug is language-independent)

### Audit Log (afterChange + afterDelete)

- Applied to: Posts, Pages, Categories, Tags
- On every create/update/delete, writes a record to AuditLogs
- Captures: collection, documentId, action, user, before state, after state
- Uses `req` for transaction safety
- Uses `context.skipAudit` flag to prevent infinite loops (AuditLogs excluded)

### Publish Workflow (beforeChange)

- Applied to: Posts
- Validates status transitions:
  - draft → review (editor or admin)
  - review → published (admin only)
  - published → draft (admin only)
  - review → draft (editor who owns it, or admin)
- Sets `publishedAt` automatically when transitioning to published
- Clears `publishedAt` when transitioning back to draft

### Publish Notification (afterChange)

- Applied to: Posts
- When status changes to `published`: logs the event (console)
- Extensible to email/webhook notifications later

---

## 5. Access Control (RBAC)

### Roles

| Role   | Description                                              |
| ------ | -------------------------------------------------------- |
| admin  | Full access to everything                                |
| editor | Create/edit content, submit for review, manage own media |
| user   | Read published content, submit forms                     |

### Collection-Level Access

| Collection      | admin    | editor             | user (authenticated) | public         |
| --------------- | -------- | ------------------ | -------------------- | -------------- |
| Posts           | CRUD all | create, update own | read published       | read published |
| Pages           | CRUD all | create, update     | read published       | read published |
| Categories      | CRUD all | create, read       | read                 | read           |
| Tags            | CRUD all | create, read       | read                 | read           |
| Forms           | CRUD all | read               | submit               | submit         |
| FormSubmissions | read all | —                  | —                    | create         |
| AuditLogs       | read     | —                  | —                    | —              |
| Users           | CRUD all | read, update self  | update self          | —              |
| Media           | CRUD all | CRUD own           | read                 | read           |
| SearchResults   | read     | read               | read                 | read           |

### Field-Level Access

- `Users.roles`: only admin can update
- `Posts.status` (transition to `published`): only admin
- `AuditLogs.*`: read-only for all (no create/update via admin panel)

---

## 6. Localization

### Configuration

```typescript
localization: {
  locales: [
    { label: 'Français', code: 'fr' },
    { label: 'English', code: 'en' },
    { label: 'Nederlands', code: 'nl' },
  ],
  defaultLocale: 'fr',
  fallback: true,
}
```

### Strategy

- Field-level localization (`localized: true` per field)
- Structural fields (slug, status, relationships, dates) are NOT localized
- Content fields (title, content, labels, block text) ARE localized
- API access: `?locale=nl` returns Dutch content, falls back to FR if missing
- Admin panel: language selector per document

### Alignment with jardinmusical

- Same 3 languages: fr, en, nl
- Same default: fr
- Same fallback strategy: missing translation → fr
- jardinmusical consumes Payload API with `?locale={currentLocale}` from next-intl

---

## 7. Implementation Order (Incremental)

1. **Fondations** — Localization config (FR/EN/NL) + RBAC (roles on Users)
2. **Blog** — Posts + Categories + Tags + auto-slug hook + SEO plugin
3. **Pages** — Pages collection + all blocks + Nested Docs plugin
4. **Recherche & Formulaires** — Search plugin + Form Builder plugin
5. **Logique avancée** — AuditLogs collection + audit hook + publish workflow + notifications
6. **Documentation** — Explanatory comments throughout, reusable as reference

Each step is independently testable via the admin panel.

---

## 8. File Structure (Target)

```
src/
├── access/
│   ├── anyone.ts
│   ├── authenticated.ts
│   ├── adminOnly.ts
│   ├── adminOrEditor.ts
│   ├── adminOrSelf.ts
│   └── publishedOnly.ts
├── blocks/
│   ├── Hero.ts
│   ├── Content.ts
│   ├── HowItWorks.ts
│   ├── TargetAudience.ts
│   ├── FAQ.ts
│   ├── Testimonials.ts
│   ├── CTA.ts
│   └── ImageGallery.ts
├── collections/
│   ├── Users.ts
│   ├── Media.ts
│   ├── Posts.ts
│   ├── Categories.ts
│   ├── Tags.ts
│   ├── Pages.ts
│   └── AuditLogs.ts
├── hooks/
│   ├── auto-slug.ts
│   ├── audit-log.ts
│   ├── publish-workflow.ts
│   └── publish-notification.ts
├── app/
│   ├── (frontend)/
│   └── (payload)/
├── payload.config.ts
└── payload-types.ts
```

---

## Out of Scope

- Globals (Header, Footer, SiteSettings) — explicitly excluded
- Transactional data (bookings, credits, organizations, products) — stays on Prisma
- User authentication for jardinmusical — stays on Better Auth
- Stripe/payment integration
- Multi-tenant plugin
- Redirects plugin
- Live Preview (can be added later)
- Custom admin components (dashboards, widgets)
