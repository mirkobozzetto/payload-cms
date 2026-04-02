import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Tags } from './collections/Tags'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { Posts } from './collections/Posts'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Categories, Tags, Posts],
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
})
