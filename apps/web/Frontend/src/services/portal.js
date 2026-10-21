import { apiClient } from './api.js'

const tokenKey = 'ironclad-portal-session-v1'

function storage(kind) {
  try { return kind === 'local' ? window.localStorage : window.sessionStorage } catch { return null }
}

export function getPortalToken() {
  return storage('session')?.getItem(tokenKey) || storage('local')?.getItem(tokenKey) || ''
}

function savePortalToken(token, remember = false) {
  storage('session')?.removeItem(tokenKey)
  storage('local')?.removeItem(tokenKey)
  if (token) storage(remember ? 'local' : 'session')?.setItem(tokenKey, token)
}

function authorizedOptions(options = {}) {
  const token = getPortalToken()
  return token
    ? { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } }
    : options
}

const request = (path, options) => apiClient.request(path, authorizedOptions(options))

export async function signInPortal(fields) {
  const session = await apiClient.request('auth/sign-in', { method: 'POST', json: fields })
  savePortalToken(session.token, fields.remember === true)
  return session
}

export const registerPortal = fields => apiClient.request('auth/register', { method: 'POST', json: fields })
export const resetPortalPassword = fields => apiClient.request('auth/password-reset', { method: 'POST', json: fields })
export const loadPortalSession = ({ signal } = {}) => request('auth/session', { signal })
export const loadPortalState = ({ signal } = {}) => request('portal/state', { signal })
export const requestPortalVerification = fields => request('auth/verifications', { method: 'POST', json: fields })
export const verifyPortalEmail = fields => request('auth/verifications/confirm', { method: 'POST', json: fields })
export const changePortalPassword = fields => request('auth/password', { method: 'POST', json: fields })

export async function signOutPortal() {
  try { return await request('auth/sign-out', { method: 'POST' }) }
  finally { savePortalToken('') }
}

export const portalMutation = (path, method, json) => request(path, { method, json })
