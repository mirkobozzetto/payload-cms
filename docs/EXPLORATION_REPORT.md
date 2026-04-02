# Payload CMS Sandbox — Exploration Complet

**Date**: 2 avril 2026  
**Explorateur**: explorer-cms  
**Task**: #3 — Exploration et cartographie du sandbox Payload CMS

---

## 1. COLLECTIONS (7 collections)

### 1.1 Users (auth: true)

- **Authentification**: Payload auth intégré, JWT avec roles
- **Champs**:
  - `roles` (select, hasMany, saveToJWT) → admin | editor | user
- **Accès**:
  - read: adminOrSelf (admin voit tous, users voient que themselves)
  - create: adminOnly
  - update: adminOrSelf
  - delete: adminOnly
- **Sécurité**: Role field protected — seul admin peut changer les rôles

### 1.2 Media (upload: true)

- **Uploads**: Images + fichiers via Sharp (image optimization 0.34.2)
- **Champs**:
  - `alt` (text, required) — accessibility
- **Accès**: read public (anyone)
- **Cas d'usage**: Shared asset library pour tous les blocs, posts, pages

### 1.3 Posts (blog articles)

- **Versioning**: drafts (autosave + schedulePublish), max 25 versions
- **Workflow**: draft → review → published (état-machine validé par publishWorkflow hook)
- **Champs**:
  - title, slug (auto-généré), excerpt (textarea)
  - content (richText, Lexical)
  - featuredImage (upload → media)
  - author (relationship → users)
  - category (relationship → categories)
  - tags (relationship → tags, hasMany)
  - status, publishedAt
  - **Localization**: title, excerpt, content sont localisés (FR/EN/NL)
- **Accès**:
  - read: publishedOnly (public → status=published, auth → tout voir)
  - create/update: adminOrEditor
  - delete: adminOnly
- **Hooks**:
  - beforeChange: publishWorkflow (valide transitions d'état)
  - afterChange: auditAfterChange, publishNotification
  - afterDelete: auditAfterDelete
- **SEO**: Plugin injecte champs meta (title, description, image)

### 1.4 Pages (page builder modulaire)

- **Nested Docs Plugin**: parent/breadcrumbs pour hiérarchie (ex: /legal/cgv)
- **Versioning**: drafts (autosave), max 25 versions
- **Champs**:
  - title, slug (auto-généré)
  - layout (blocks field) → array de blocs (Hero, Content, HowItWorks, etc.)
  - status, publishedAt
  - **Localization**: title, layout blocs sont localisés
- **Accès**: read publishedOnly, create/update adminOrEditor, delete adminOnly
- **Hooks**: audit logging on afterChange/afterDelete
- **Design Pattern**: Page builder Gutenberg-style avec add/remove/reorder UI

### 1.5 Categories

- **Slug auto-generation**: slugify() depuis label
- **Champs**:
  - label (text, localized)
  - slug (unique, indexed)
- **Localization**: label different per locale, slug consistent across languages
- **Accès**: read anyone, create adminOrEditor, update/delete adminOnly
- **Hooks**: audit logging

### 1.6 Tags

- **Identique à Categories** (structure générique)
- **Cas d'usage**: Cross-cutting labels pour posts (hasMany relationship)

### 1.7 AuditLogs (read-only)

- **Immutable**: create/update/delete → false
- **Champs**:
  - collection (text, readOnly)
  - documentId (text, readOnly)
  - action (select: create|update|delete, readOnly)
  - user (relationship → users, readOnly)
  - before, after (json, readOnly) → snapshots for diffs
- **Accès**: read adminOnly, tout le reste blocked
- **Écrit par**: auditAfterChange/auditAfterDelete hooks
- **Pattern**: Transaction-safe (req passed to nested create)

---

## 2. BLOCKS (8 blocs, page builder)

Tous blocs sont localizés sauf indications contraires.

| Block              | Champs                                                  | Cas d'usage                        |
| ------------------ | ------------------------------------------------------- | ---------------------------------- |
| **Hero**           | heading, subheading, backgroundImage, ctaLabel, ctaLink | Full-width banner avec CTA         |
| **Content**        | richText (Lexical)                                      | Body text, contenu unstructuré     |
| **HowItWorks**     | steps array (icon, title, description)                  | Process steps numérotés            |
| **TargetAudience** | profiles array (title, description, image)              | Grille audience                    |
| **FAQ**            | items array (question, answer:richText)                 | Accordion Q&A                      |
| **Testimonials**   | testimonials array (name, role, quote, photo)           | Quotes clients (name non-localisé) |
| **CTA**            | heading, description, buttonLabel, buttonLink           | Action button conversion           |
| **ImageGallery**   | images array (image, caption:text)                      | Grid d'images                      |

**Pattern clé**: `blocks` field type (discriminator blockType) + array structure = Gutenberg-style admin UI

---

## 3. HOOKS (4 hooks système)

### 3.1 auto-slug.ts

- **Type**: FieldHook (beforeValidate)
- **Fonction**: Génère slug URL-safe depuis source field
  - Normalize accents (NFD)
  - Lowercase, trim, kebab-case, strip leading/trailing dashes
  - Permet override manual
- **Utilisé sur**: title → slug (Posts, Pages, Categories, Tags)

### 3.2 audit-log.ts (2 hooks)

- **auditAfterChange**: Écrit AuditLog après create/update
- **auditAfterDelete**: Écrit AuditLog après delete
- **Pattern critique**:
  - Passe `req` au nested create → **même transaction** (atomicité)
  - `context.skipAudit: true` → prévient boucles infinies
- **Sécurité**: Snapshot before/after pour diffs

### 3.3 publish-workflow.ts

- **Type**: CollectionBeforeChangeHook (update only)
- **State machine validée**:
  - draft → review ✓
  - review → draft (owner|admin), published (admin)
  - published → draft (admin)
  - Autres transitions → APIError 400/403
- **Auto-set**: publishedAt on draft→published, clear on →draft
- **Accès**: Admin seul peut publish/unpublish

### 3.4 publish-notification.ts

- **Type**: CollectionAfterChangeHook
- **Déclenché**: previousDoc.status !== 'published' && doc.status === 'published'
- **Sandbox**: console.log (remplacer par email/Slack en prod)

---

## 4. FONCTIONS D'ACCÈS (6 patterns RBAC)

| Function          | Logique                                                     | Cas                        |
| ----------------- | ----------------------------------------------------------- | -------------------------- |
| **anyone**        | `() => true`                                                | Media read, public content |
| **authenticated** | `user ? true : false`                                       | Requires login             |
| **adminOnly**     | `user?.roles?.includes('admin')`                            | Admin-only operations      |
| **adminOrEditor** | `includes('admin') \|\| includes('editor')`                 | Content creation           |
| **adminOrSelf**   | Admin → true; Others → `{ id: { equals: user.id } }`        | Users collection           |
| **publishedOnly** | Auth → true; Public → `{ status: { equals: 'published' } }` | Draft/publish workflow     |

**Pattern clé**: Query constraints (objets) plutôt que booleans pour efficacité DB

---

## 5. CONFIGURATION PAYLOAD (payload.config.ts)

### Core

- **Editor**: Lexical (richText modern)
- **Database**: PostgreSQL 16 via Drizzle ORM
- **Collections**: [Users, Media, Categories, Tags, Posts, Pages, AuditLogs]

### i18n (Admin UI)

- **Languages**: FR (fallback), EN, NL via @payloadcms/translations
- **User preference**: Changeable dans account settings

### Localization (Content)

- **Locales**: fr, en, nl (defaultLocale: fr)
- **Strategy**: Field-level (localized: true per field)
- **Fallback**: true (missing translation → FR value)
- **Pattern**: Slug non-localisé (URLs consistantes)

### Plugins (4 plugins)

#### 1. SEO Plugin

```typescript
{
  collections: ['posts', 'pages'],
  uploadsCollection: 'media',
  generateTitle: ({ doc }) => `${doc.title} — Payload CMS`,
  generateDescription: ({ doc }) => doc.excerpt || ''
}
```

- Auto-injecte champs meta (title, description, image)
- Localized automatically
- Default values overridable

#### 2. Nested Docs Plugin

```typescript
{
  collections: ['pages'],
  generateLabel: (_, doc) => doc.title,
  generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, '')
}
```

- Ajoute `parent` field + `breadcrumbs` array
- Génère hiérarchie URL: /legal/cgv
- Admin: visual tree navigation

#### 3. Form Builder Plugin

```typescript
{
  fields: {
    text: true, email: true, textarea: true, select: true, checkbox: true
  }
}
```

- Crée 2 collections auto: `forms` (schemas) + `form-submissions` (responses)
- Admins design formes dans UI
- Frontend render dynamique
- **Cas d'usage**: Contact, newsletter, feedback sans hardcoding

#### 4. Search Plugin

```typescript
{
  collections: ['posts', 'pages'],
  defaultPriorities: { posts: 10, pages: 20 }
}
```

- Crée `search-results` collection
- Sync auto via hooks (create/update/delete)
- Query unified search au lieu des collections
- Optimisé pour text search

---

## 6. LOCALIZATION SETUP

### Admin Panel (i18n)

- FR, EN, NL buttons en haut-right du panel admin
- User preference saved in account
- Biscuits/messages/menus traduits

### Content (localization)

- **FR par défaut** (fallbackLanguage)
- **Field-level**: Certain fields have separate inputs per locale (title, content, etc.)
- **Shared fields**: slug, id, createdAt (non-localisés)
- **Fallback behavior**: Missing locale → defaultLocale (FR)

**Exemple Posts**:

- title: localized (3 inputs: FR|EN|NL)
- slug: NOT localized (URL unique)
- content: localized
- author: NOT localized (relationship)

---

## 7. SÉCURITÉ & PATTERNS CRITIQUES

### Transaction Safety (TRÈS IMPORTANT)

```typescript
await req.payload.create({
  collection: 'audit-logs',
  data: { ... },
  req,  // ← CRITICAL: Même transaction
  context: { skipAudit: true }  // Prévient boucles
})
```

**Règle**: Toujours passer `req` aux nested operations dans hooks

### Local API Access Control

```typescript
// ✅ CORRECT: Enforces access control when user passed
await payload.find({
  collection: 'posts',
  user: someUser,
  overrideAccess: false,
})

// ❌ BUG: Access control bypassed
await payload.find({
  collection: 'posts',
  user: someUser,
})
```

### Role Security

- Rôles stored in JWT via `saveToJWT: true`
- Pas de DB lookups pour RBAC checks
- Field-level protection: roles field peut seul être modifié par admin

### Draft/Publish Validation

- State machine stricte (VALID_TRANSITIONS)
- APIError si transition invalide
- Only admins can publish/unpublish

---

## 8. PATTERNS RÉUTILISABLES

### ✅ Page Builder (toute site contenu)

**Déployer sur**: Sites marketing, landing pages, documentation sites, directory sites

Composants:

- `blocks` field type + 8 bloc templates
- Add/remove/reorder admin UI gratuit
- Lexical richText
- Media relationships
- Localization built-in

**Adapté pour**: Wix alternative, content site, landing page builder

### ✅ SEO + Seed Scripts (lead generation, directory)

**Déployer sur**: Directories, lead gen sites, service listings

Composants:

- SEO plugin auto-injecte meta + defaults
- Posts + Pages = 2 content types
- Search plugin = optimized text search
- Localized content pour international reach

**Adapté pour**: Local directory, product marketplace, event listings

### ✅ Multilingual Content (international sites)

**Déployer sur**: Tous sites multilingues (FR/EN/NL default)

Composants:

- Localization field-level + fallback
- Admin UI i18n (FR/EN/NL buttons)
- Slug non-localisé = URLs consistantes
- Nested Docs = hiérarchie per-locale compatible

### ✅ Publish Workflow (editorial teams)

**Déployer sur**: Blogs, news sites, internal wiki

Composants:

- Draft/review/published state machine
- Role-based transitions (editors submit, admins publish)
- publishNotification hook (extensible → email/Slack)
- Versions + autosave
- Scheduled publish (schedulePublish)

### ✅ Audit Logging (compliance, accountability)

**Déployer sur**: Regulated industries, internal tools

Composants:

- AuditLogs collection (read-only)
- Snapshots before/after JSON
- User attribution per change
- Transaction-safe (req passed)
- Context flags (skipAudit) prevent loops

### ✅ RBAC Pattern (any app with roles)

**Déployer sur**: SaaS, internal tools, collaborative apps

Composants:

- 3-tier roles (admin/editor/user)
- JWT-embedded roles (no DB lookups)
- Field-level access control
- Query constraints (adminOrSelf pattern)
- Admin-only operations protected

---

## 9. CE QUI MANQUE (pour Other Projects)

### High-Value Additions

**1. Events Collection**

- Cas: Wix sync, booking integration
- Champs: title, startDate, endDate, location, description, image, featured
- Plugins: Calendar view, iCal export
- Access: Published events visible, auth only → all

**2. Artists/Team Collection**

- Cas: Jardinmusical, social proof, portfolio
- Champs: name, bio, role, photo, social links, featured
- Blocks: Team member bio card
- Relationships: posts/pages → author

**3. Press/Media Collection**

- Cas: Credibility, media kit, testimonials
- Champs: title, description, image, link, publishedAt, type (article|quote|award)
- SEO: Built-in meta
- Access: Read public, write admin

**4. Services Collection**

- Cas: Service sites, Wix alternative
- Champs: title, slug, description, image, price, duration, featured
- Nested Docs: Service categories
- Relationships: service → category, posts
- SEO: Structured schema per service

**5. Testimonials Standalone Collection**

- Currently: Only as block inside pages
- Better: Separate collection → reusable relationship on pages/services
- Champs: name, quote, role, rating, image, featured
- Access: Read public, write admin

### Infrastructure

**6. Webhooks**

- POST on create/update/delete
- Sync to Wix, Stripe, email service
- Pattern exists in audit-log hooks

**7. Custom API Endpoints**

- Advanced filtering/aggregation
- File exports (CSV, PDF)
- Batch operations
- GraphQL mutations optimized

**8. Authentication Layer**

- Social login (Google, GitHub via plugin)
- 2FA
- SAML for enterprise
- Pattern: Users collection ready

---

## 10. ARCHITECTURE INSIGHTS

### Design Decisions

1. **Localization first**: All user-facing content field-level localized
2. **Audit trail required**: Every public collection has hooks
3. **State machine validation**: Business logic in hooks (beforeChange)
4. **Asset centralization**: All media → Media collection
5. **Slug consistency**: Non-localized across all locales

### Performance Optimizations

1. **Roles in JWT**: No DB lookup on auth checks
2. **Query constraints**: adminOrSelf pattern = efficient filtering
3. **Indexed fields**: slug, documentId indexed for fast lookups
4. **Max versions**: 25 per doc (prevents runaway history)
5. **Search plugin**: Optimized text search via dedicated collection

### Extensibility Points

1. **Hooks framework**: beforeChange, afterChange, afterDelete per collection
2. **Access control**: Pluggable functions (return boolean or query constraint)
3. **Blocks**: Add new block = 1 file + config
4. **Plugins**: 4 official plugins, extensible
5. **API routes**: Custom endpoints in src/app/(payload)/api/

---

## 11. TECH STACK SUMMARY

| Component       | Tech             | Version                          |
| --------------- | ---------------- | -------------------------------- |
| **CMS**         | Payload          | 3.x (latest)                     |
| **Framework**   | Next.js          | 16.2.2 (Turbopack)               |
| **Database**    | PostgreSQL       | 16                               |
| **ORM**         | Drizzle          | Built into db-postgres           |
| **RichText**    | Lexical          | via @payloadcms/richtext-lexical |
| **Image**       | Sharp            | 0.34.2                           |
| **Auth**        | Payload built-in | JWT + roles                      |
| **Package Mgr** | pnpm             | ^9 or ^10                        |
| **Node**        | ES modules       | 18.20.2+ or 20.9.0+              |

---

## 12. DÉPLOIEMENT QUICK-START

```bash
# Setup
git clone ...
cd payload-cms
make setup
make start

# Dev
make dev

# Production
make build
make start

# Quality
make check  # format + lint + typecheck
```

---

## RÉSUMÉ EXÉCUTIF

Le sandbox Payload CMS est une **foundation solide et réutilisable** pour:

✅ **Tout site contenu** (marketing, blog, documentation)  
✅ **Directories + lead gen** (SEO + multilingual)  
✅ **Sites éditoriaux** (publish workflow, audit logs)  
✅ **International sites** (FR/EN/NL built-in)  
✅ **Wix alternative** (page builder blocks, forms)  
✅ **Admin panels** (RBAC, user management)

**Patterns critiques à préserver**:

- Transaction-safe hooks (req passed)
- Query constraints over booleans (performance)
- State machine validation (business logic)
- Audit trails on mutations (compliance)
- Role JWT embedding (speed)

**Prêt pour**: Intégration jardinmusical (collections: Events, Artists, Testimonials) + Wix sync via webhooks
