# Payload CMS Sandbox

Payload CMS sandbox with blog, page builder, plugins, hooks, RBAC, and trilingual localization (FR/EN/NL). Designed as a playground to explore Payload CMS capabilities and as a compatible content layer for the jardinmusical project.

## Stack

- **Payload CMS** 3.x — headless CMS framework
- **Next.js** 16 — React framework (Turbopack)
- **PostgreSQL** 16 — database (via Docker)
- **Drizzle ORM** — database adapter (built into `@payloadcms/db-postgres`)
- **Lexical** — rich text editor
- **TypeScript** — strict typing with generated types
- **pnpm** — package manager

## Getting Started

### Prerequisites

- Node.js 22 LTS
- pnpm
- Docker

### Setup

```bash
git clone https://github.com/mirkobozzetto/payload-cms.git
cd payload-cms
make setup
make start
```

Open [http://localhost:3000/admin](http://localhost:3000/admin) to create your first admin user.

### Environment Variables

| Variable         | Description                  | Default                                               |
| ---------------- | ---------------------------- | ----------------------------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string | `postgresql://payload:payload@localhost:5434/payload` |
| `PAYLOAD_SECRET` | Secret key for Payload auth  | —                                                     |

### Available Commands

| Command          | Description                                |
| ---------------- | ------------------------------------------ |
| `make start`     | Start database + dev server                |
| `make stop`      | Stop everything                            |
| `make dev`       | Start dev server only                      |
| `make build`     | Build for production                       |
| `make format`    | Format code (Prettier)                     |
| `make lint`      | Lint and fix (ESLint)                      |
| `make typecheck` | Run TypeScript type checker                |
| `make check`     | Run all checks (format + lint + typecheck) |
| `make logs`      | Show database logs                         |
| `make setup`     | First-time setup                           |
| `make help`      | Show all commands                          |

## Project Structure

```
src/
├── access/                  # Access control functions (RBAC)
│   ├── anyone.ts            # Public access
│   ├── authenticated.ts     # Logged-in users
│   ├── adminOnly.ts         # Admin role
│   ├── adminOrEditor.ts     # Admin or editor role
│   ├── adminOrSelf.ts       # Admin or document owner
│   └── publishedOnly.ts     # Published content only
├── blocks/                  # Page builder blocks
│   ├── Hero.ts
│   ├── Content.ts
│   ├── HowItWorks.ts
│   ├── TargetAudience.ts
│   ├── FAQ.ts
│   ├── Testimonials.ts
│   ├── CTA.ts
│   └── ImageGallery.ts
├── collections/             # Collection configurations
│   ├── Users.ts             # Auth + RBAC (admin/editor/user)
│   ├── Media.ts             # File uploads
│   ├── Posts.ts             # Blog articles
│   ├── Categories.ts        # Post taxonomy
│   ├── Tags.ts              # Cross-cutting tags
│   ├── Pages.ts             # Modular pages with blocks
│   └── AuditLogs.ts         # Change tracking
├── hooks/                   # Hook functions
│   ├── auto-slug.ts         # Auto-generate slugs
│   ├── audit-log.ts         # Track all changes
│   ├── publish-workflow.ts  # Status transition validation
│   └── publish-notification.ts # Publish event logging
├── app/
│   ├── (frontend)/          # Frontend routes
│   └── (payload)/           # Payload admin panel routes
└── payload.config.ts        # Main config
```

## Collections

| Collection     | Description                                                      |
| -------------- | ---------------------------------------------------------------- |
| **Users**      | Authentication + RBAC (admin, editor, user)                      |
| **Media**      | File uploads with image optimization via Sharp                   |
| **Posts**      | Blog articles with versions, drafts, autosave, scheduled publish |
| **Categories** | Taxonomy for posts                                               |
| **Tags**       | Cross-cutting labels                                             |
| **Pages**      | Modular pages with 8 block types (page builder)                  |
| **Audit Logs** | Immutable record of all content changes                          |

## Plugins

| Plugin           | Description                                       |
| ---------------- | ------------------------------------------------- |
| **SEO**          | Meta title, description, image on Posts and Pages |
| **Nested Docs**  | Parent/child hierarchy on Pages                   |
| **Form Builder** | Create forms from the admin panel                 |
| **Search**       | Optimized search index across Posts and Pages     |

## Localization

- **Content**: FR (default), EN, NL — field-level localization with fallback to FR
- **Admin UI**: Interface translated in FR, EN, NL via `@payloadcms/translations`

## Access Control (RBAC)

| Role       | Permissions                            |
| ---------- | -------------------------------------- |
| **admin**  | Full access to everything              |
| **editor** | Create/edit content, submit for review |
| **user**   | Read published content, submit forms   |

## Publish Workflow

Posts follow a `draft → review → published` workflow:

- Editors can create drafts and submit for review
- Only admins can publish or unpublish
- All changes are tracked in Audit Logs

## API

Payload auto-generates REST and GraphQL APIs:

- **REST**: `http://localhost:3000/api/<collection>`
- **GraphQL**: `http://localhost:3000/api/graphql`
- **GraphQL Playground**: `http://localhost:3000/api/graphql-playground`

## Docker

```bash
docker compose up -d      # Start database
docker compose down        # Stop database
docker compose down -v     # Reset database (removes all data)
```

## Code Quality

Pre-commit hook runs automatically:

- **Prettier** — code formatting
- **ESLint** — linting with auto-fix
- **TypeScript** — type checking (`tsc --noEmit`)

## License

MIT
