import type { Access } from 'payload'

// Allows access to users with 'admin' or 'editor' role
// Used for content management operations (create, update on Posts/Pages)
export const adminOrEditor: Access = ({ req: { user } }) => {
  if (!user) return false
  const roles = user.roles as string[] | undefined
  return roles?.includes('admin') || roles?.includes('editor') || false
}
