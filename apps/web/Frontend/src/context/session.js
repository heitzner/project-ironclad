import { ApiError } from '../services/api.js'
import { signedOutSession } from './auth.context.js'

// No role-derived permissions: only explicit true capabilities from the session.
export function normalizeSession(value) {
  if (value === null || value?.user === null) return signedOutSession
  if (!value?.user || typeof value.user.id !== 'string' || !value.user.id.trim()) {
    throw new ApiError('The current user could not be loaded. Please retry.', { code: 'INVALID_RESPONSE' })
  }
  const capabilities = Object.fromEntries(
    Object.entries(value.capabilities ?? {}).filter(([, allowed]) => allowed === true),
  )
  return { user: value.user, capabilities }
}
