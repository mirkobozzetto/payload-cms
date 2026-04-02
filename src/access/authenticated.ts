import type { Access } from 'payload'

// Allows access only to authenticated users (any role)
// `req.user` is populated by Payload when a valid JWT is present
export const authenticated: Access = ({ req: { user } }) => Boolean(user)
