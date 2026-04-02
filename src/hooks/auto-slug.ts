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
