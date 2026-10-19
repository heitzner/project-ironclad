import { useCallback } from 'react'
import { unavailableOperation } from '../services/api.js'
import useAsyncResource from '../hooks/useAsyncResource.js'
import { AuthContext, signedOutSession } from './auth.context.js'
import { normalizeSession } from './session.js'

// A host may supply its real session directly or an authenticated session loader.
export default function AuthProvider({ children, session, loadSession, sessionKey = null }) {
  const load = useCallback(async ({ signal }) => {
    if (!loadSession) throw unavailableOperation()
    return normalizeSession(await loadSession({ signal, sessionKey }))
  }, [loadSession, sessionKey])
  const resource = useAsyncResource(load, { enabled: session === undefined })

  let value
  if (session !== undefined) {
    try {
      const current = normalizeSession(session)
      value = { ...current, loading: false, error: null, status: current.user ? 'authenticated' : 'signed-out', refetch: null }
    } catch (error) {
      value = { ...signedOutSession, loading: false, error, status: 'error', refetch: null }
    }
  } else {
    value = {
      ...(resource.data ?? signedOutSession), ...resource,
      status: resource.status === 'success' ? (resource.data.user ? 'authenticated' : 'signed-out') : resource.status,
    }
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
