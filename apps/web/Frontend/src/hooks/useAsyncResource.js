import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { createAsyncResource } from './asyncResource.js'

export default function useAsyncResource(load, { enabled = true, scope = null } = {}) {
  const resource = useMemo(() => createAsyncResource(load, { enabled, scope }), [load, enabled, scope])
  const state = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot)

  useEffect(() => {
    if (enabled) void resource.refetch()
    return resource.cancel
  }, [enabled, resource])

  return { ...state, refetch: resource.refetch }
}
