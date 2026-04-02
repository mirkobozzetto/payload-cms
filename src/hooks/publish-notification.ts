import type { CollectionAfterChangeHook } from 'payload'

// Logs a notification when a post transitions to "published"
// This is a simple console.log for the sandbox — in production,
// replace with email, Slack webhook, or push notification
// The hook compares previousDoc.status with doc.status to detect transitions
export const publishNotification: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  if (operation !== 'update') return doc

  const wasPublished = previousDoc?.status !== 'published' && doc.status === 'published'

  if (wasPublished) {
    const user = req.user?.email || 'unknown'
    console.log(`[PUBLISH] "${doc.title}" published by ${user} at ${new Date().toISOString()}`)
  }

  return doc
}
