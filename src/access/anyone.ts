import type { Access } from 'payload'

// Allows unrestricted access — used for public read operations
// Payload calls this function for every request to determine if the operation is allowed
// Returning `true` grants access unconditionally
export const anyone: Access = () => true
