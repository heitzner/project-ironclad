import { ApiError } from '../services/api.js'

export function normalizeError(error) {
  return error instanceof Error ? error : new ApiError('The request failed. Please retry.')
}

// A latest-request-wins store shared by the read hooks and tested without a browser.
export function createAsyncResource(load, { enabled = true } = {}) {
  let snapshot = { data: null, loading: enabled, error: null, status: enabled ? 'loading' : 'idle' }
  let revision = 0
  let controller
  const listeners = new Set()
  const publish = (next) => {
    snapshot = next
    listeners.forEach((listener) => listener())
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    cancel: () => {
      revision += 1
      controller?.abort()
    },
    refetch: async () => {
      if (!enabled) return null
      const current = ++revision
      controller?.abort()
      controller = new AbortController()
      publish({ data: snapshot.data, loading: true, error: null, status: 'loading' })
      try {
        const data = await load({ signal: controller.signal })
        if (current !== revision) return null
        publish({ data, loading: false, error: null, status: 'success' })
        return data
      } catch (cause) {
        if (current !== revision) return null
        const error = normalizeError(cause)
        publish({ data: snapshot.data, loading: false, error, status: error.unavailable ? 'unavailable' : 'error' })
        return null
      }
    },
  }
}
