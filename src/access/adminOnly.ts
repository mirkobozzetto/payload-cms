import type { Access } from 'payload'

// Restricts access to users with the 'admin' role
// `roles` is stored in the JWT via `saveToJWT: true` on the Users collection
// This avoids a database lookup on every request
export const adminOnly: Access = ({ req: { user } }) => {
  if (!user) return false
  const roles = user.roles as string[] | undefined
  return roles?.includes('admin') ?? false
}
