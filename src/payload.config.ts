import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { fr } from '@payloadcms/translations/languages/fr'
import { en } from '@payloadcms/translations/languages/en'
import { nl } from '@payloadcms/translations/languages/nl'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Tags } from './collections/Tags'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { searchPlugin } from '@payloadcms/plugin-search'
import { Posts } from './collections/Posts'
import { Pages } from './collections/Pages'
import { AuditLogs } from './collections/AuditLogs'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Categories, Tags, Posts, Pages, AuditLogs],
  editor: lexicalEditor(),
  // i18n: traduit l'interface admin (boutons, menus, messages d'erreur)
  // Distinct de `localization` qui gère les traductions du contenu
  // L'utilisateur peut changer la langue dans ses préférences de compte
  i18n: {
    supportedLanguages: { fr, en, nl },
    fallbackLanguage: 'fr',
  },
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
  plugins: [
    // SEO plugin injects a `meta` field group (title, description, image)
    // on each specified collection. These fields are automatically localized
    // when the collection uses localization.
    // `generateTitle` and `generateDescription` provide default values
    // from the document's own fields, overridable by the editor
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
      generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
    }),
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
  ],
})
