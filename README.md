# Payload CMS Sandbox

A standalone Payload CMS project built with Next.js 16, PostgreSQL, and the Lexical rich text editor. Designed as a playground to explore Payload CMS capabilities — content management, page building, custom collections, hooks, access control, and more.

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
# Clone the repository
git clone https://github.com/mirkobozzetto/payload-cms.git
cd payload-cms

# Copy environment variables
cp .env.example .env

# Start the database
docker compose up -d

# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin) to create your first admin user.

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://payload:payload@localhost:5434/payload` |
| `PAYLOAD_SECRET` | Secret key for Payload auth | — |

### Available Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm generate:types` | Regenerate TypeScript types |
| `pnpm generate:importmap` | Regenerate admin import map |

## Project Structure

```
src/
├── app/
│   ├── (frontend)/          # Frontend routes
│   └── (payload)/           # Payload admin panel routes
├── collections/             # Collection configurations
│   ├── Users.ts
│   └── Media.ts
└── payload.config.ts        # Main Payload configuration
```

## Collections

- **Users** — authentication-enabled collection with admin panel access
- **Media** — file uploads with image optimization via Sharp

## API

Payload automatically generates REST and GraphQL APIs:

- **REST**: `http://localhost:3000/api/<collection>`
- **GraphQL**: `http://localhost:3000/api/graphql`
- **GraphQL Playground**: `http://localhost:3000/api/graphql-playground`

## Docker

The `docker-compose.yml` provides a PostgreSQL 16 instance for local development:

```bash
# Start database
docker compose up -d

# Stop database
docker compose down

# Reset database (removes all data)
docker compose down -v
```

## License

MIT
