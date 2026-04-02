import type { Access } from 'payload'

// Allows access to users with 'admin' or 'editor' role
// Used for content management operations (create, update on Posts/Pages)
export const adminOrEditor: Access = ({ req: { user } }) => {
  if (!user) return false
  return user.roles?.includes('admin') || user.roles?.includes('editor') || false
}
