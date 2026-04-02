import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

// afterChange hook that writes an audit log entry for every create/update
// IMPORTANT: `req` is passed to the nested `create` call to ensure
// the audit log write happens in the SAME database transaction as the
// original operation. Without `req`, a crash between the two operations
// could leave the audit log inconsistent.
//
// `context.skipAudit` prevents infinite loops — without it, writing
// an audit log would trigger another audit log write, and so on
export const auditAfterChange: CollectionAfterChangeHook = async ({
  collection,
  doc,
  previousDoc,
  operation,
  req,
  context,
}) => {
  if (context.skipAudit) return doc

  await req.payload.create({
    collection: 'audit-logs',
    data: {
      collection: collection.slug,
      documentId: doc.id,
      action: operation === 'create' ? 'create' : 'update',
      user: req.user?.id || null,
      before: operation === 'update' ? previousDoc : null,
      after: doc,
    },
    req,
    context: { skipAudit: true },
  })

  return doc
}

// afterDelete hook — similar to afterChange but for delete operations
export const auditAfterDelete: CollectionAfterDeleteHook = async ({
  collection,
  doc,
  req,
  context,
}) => {
  if (context.skipAudit) return doc

  await req.payload.create({
    collection: 'audit-logs',
    data: {
      collection: collection.slug,
      documentId: doc.id,
      action: 'delete',
      user: req.user?.id || null,
      before: doc,
      after: null,
    },
    req,
    context: { skipAudit: true },
  })

  return doc
}
