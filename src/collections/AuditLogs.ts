import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'

// AuditLogs: immutable record of all content changes
// Written to by the audit-log hook on Posts, Pages, Categories, Tags
// Read-only — no one creates or edits audit logs manually
// Admin can view for debugging and accountability
export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: {
    singular: { fr: "Entrée d'audit", en: 'Audit Log', nl: 'Auditlog' },
    plural: { fr: "Journal d'audit", en: 'Audit Logs', nl: 'Auditlogboek' },
  },
  admin: {
    useAsTitle: 'collection',
    defaultColumns: ['collection', 'action', 'user', 'createdAt'],
  },
  access: {
    read: adminOnly,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'collection',
      type: 'text',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'documentId',
      type: 'text',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create', value: 'create' },
        { label: 'Update', value: 'update' },
        { label: 'Delete', value: 'delete' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
    },
    {
      // JSON fields store arbitrary data
      // Used here to capture document snapshots for diff comparison
      name: 'before',
      type: 'json',
      admin: { readOnly: true },
    },
    {
      name: 'after',
      type: 'json',
      admin: { readOnly: true },
    },
  ],
}
