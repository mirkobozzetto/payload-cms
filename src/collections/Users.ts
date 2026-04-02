import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'
import { adminOrSelf } from '../access/adminOrSelf'

// Users collection with authentication and role-based access control
// `auth: true` enables Payload's built-in auth (login, JWT, sessions)
// Roles are stored in the JWT via `saveToJWT: true` to avoid DB lookups
export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: { fr: 'Utilisateur', en: 'User', nl: 'Gebruiker' },
    plural: { fr: 'Utilisateurs', en: 'Users', nl: 'Gebruikers' },
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'roles', 'createdAt'],
  },
  auth: true,
  access: {
    // Admin sees all users; others see only themselves
    read: adminOrSelf,
    // Only admin can create new users (registration is separate)
    create: adminOnly,
    // Admin can update anyone; users can update themselves
    update: adminOrSelf,
    // Only admin can delete users
    delete: adminOnly,
  },
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      label: { fr: 'Rôles', en: 'Roles', nl: 'Rollen' },
      options: [
        { label: { fr: 'Administrateur', en: 'Admin', nl: 'Beheerder' }, value: 'admin' },
        { label: { fr: 'Éditeur', en: 'Editor', nl: 'Redacteur' }, value: 'editor' },
        { label: { fr: 'Utilisateur', en: 'User', nl: 'Gebruiker' }, value: 'user' },
      ],
      defaultValue: ['user'],
      required: true,
      // saveToJWT embeds roles in the auth token
      // so access control functions can check roles without a DB query
      saveToJWT: true,
      access: {
        // Only admins can change roles — prevents privilege escalation
        update: ({ req: { user } }) => {
          return user?.roles?.includes('admin') ?? false
        },
      },
    },
  ],
}
