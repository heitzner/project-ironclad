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
  const session = await apiClient.request('api/auth/sign-in', { method: 'POST', json: fields })
  savePortalToken(session.token, fields.remember === true)
  return session
}

export const registerPortal = fields => apiClient.request('api/auth/register', { method: 'POST', json: fields })
export const resetPortalPassword = fields => apiClient.request('api/auth/password-reset', { method: 'POST', json: fields })
export const loadPortalSession = ({ signal } = {}) => request('api/auth/session', { signal })
export const loadPortalState = ({ signal } = {}) => request('api/portal/state', { signal })
export const requestPortalVerification = fields => request('api/auth/verifications', { method: 'POST', json: fields })
export const verifyPortalEmail = fields => request('api/auth/verifications/confirm', { method: 'POST', json: fields })
export const changePortalPassword = fields => request('api/auth/password', { method: 'POST', json: fields })

export async function signOutPortal() {
  try { return await request('api/auth/sign-out', { method: 'POST' }) }
  finally { savePortalToken('') }
}

export const portalMutation = (path, method, json) => request(path, { method, json })

export async function downloadPortalArchive({ id, format = 'pdf', filters = {} } = {}) {
  const base = String(import.meta.env?.VITE_API_URL || '').trim().replace(/\/+$/, '')
  if (!base) throw new Error('The service connection is not configured yet.')
  const query = new URLSearchParams({ ...filters, format })
  const path = id ? `api/archive/${encodeURIComponent(id)}/export` : 'api/archive/export'
  const response = await fetch(`${base}/${path}?${query}`, { headers: { Authorization: `Bearer ${getPortalToken()}` } })
  if (!response.ok) {
    let payload
    try { payload = await response.json() } catch { payload = null }
    throw new Error(payload?.error?.message || 'The archive export could not be downloaded.')
  }
  const disposition = response.headers.get('content-disposition') || ''
  const fileName = /filename="?([^";]+)"?/i.exec(disposition)?.[1] || `ironclad-archive.${format}`
  return { blob: await response.blob(), fileName }
}
