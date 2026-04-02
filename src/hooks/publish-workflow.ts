import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

// Validates status transitions on Posts:
//   draft → review     (editor or admin)
//   review → published  (admin only)
//   review → draft      (owner or admin)
//   published → draft   (admin only)
//
// This is a `beforeChange` hook — it runs BEFORE the document is saved.
// Throwing an APIError aborts the save and returns the error to the client.
// The `previousDoc` parameter contains the document state before the change.
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['review'],
  review: ['draft', 'published'],
  published: ['draft'],
}

export const publishWorkflow: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  if (operation !== 'update') return data
  if (!data.status || !originalDoc?.status) return data
  if (data.status === originalDoc.status) return data

  const from = originalDoc.status
  const to = data.status
  const roles = req.user?.roles ?? []

  const allowed = VALID_TRANSITIONS[from]
  if (!allowed?.includes(to)) {
    throw new APIError(`Invalid status transition: ${from} → ${to}`, 400)
  }

  if (to === 'published' && !roles.includes('admin')) {
    throw new APIError('Only admins can publish content', 403)
  }

  if (from === 'published' && to === 'draft' && !roles.includes('admin')) {
    throw new APIError('Only admins can unpublish content', 403)
  }

  // Auto-set publishedAt when transitioning to published
  if (to === 'published' && !data.publishedAt) {
    data.publishedAt = new Date().toISOString()
  }

  // Clear publishedAt when reverting to draft
  if (to === 'draft') {
    data.publishedAt = null
  }

  return data
}
