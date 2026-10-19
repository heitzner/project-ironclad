import { apiClient } from './api.js'

// Account endpoints used by the sign-in and reset pages.
export const authService = {
  signIn: (credentials) => apiClient.request('auth/sign-in', { method: 'POST', json: credentials, credentials: 'include' }),
  requestReset: (details) => apiClient.request('auth/reset', { method: 'POST', json: details }),
}
