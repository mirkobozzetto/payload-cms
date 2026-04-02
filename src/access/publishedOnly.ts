import type { Access } from 'payload'

// Authenticated users see all documents; public visitors only see published ones
// Returns a query constraint that Payload applies at the database level
// This pattern is idiomatic for content with draft/published workflow
export const publishedOnly: Access = ({ req: { user } }) => {
  if (user) return true
  return { status: { equals: 'published' } }
}
