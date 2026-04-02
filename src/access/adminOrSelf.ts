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
