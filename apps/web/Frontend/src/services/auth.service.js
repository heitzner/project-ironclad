import { ApiError, unavailableOperation } from './api.js'
import { normalizeSession } from '../context/session.js'
import { requestPortalVerification, verifyPortalEmail } from './portal.js'

// Optional host adapters; the shared portal owns sign-in/session refresh and reset UI.
export function createAuthService({ signIn, requestReset } = {}) {
  return Object.freeze({
    signIn: async credentials => {
      if (!signIn) throw unavailableOperation()
      const session = normalizeSession(await signIn(credentials))
      if (!session.user) throw new ApiError('Sign-in has not been confirmed.', { code: 'INVALID_RESPONSE' })
      return session
    },
    requestReset: async details => {
      if (!requestReset) throw unavailableOperation()
      const result = await requestReset(details)
      if (result?.confirmed !== true || typeof result.message !== 'string' || !result.message.trim()) throw new ApiError('The reset request has not been confirmed.', { code: 'INVALID_RESPONSE' })
      return result
    },
  })
}
export const authService = createAuthService()

export async function requestVerificationCode(email, purpose) {
  return requestPortalVerification({ email, purpose })
}

export async function confirmVerificationCode(challengeId, email, code, purpose) {
  return verifyPortalEmail({ challengeId, email, code, purpose })
}
