import { useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { AdminMutationContext, createAdminMutation, createMutationRegistry } from './adminMutation.model.js'

export default function useAdminMutation({ key, callback, onRefresh, onCheckStatus }) {
  const shared = useContext(AdminMutationContext)
  const [local] = useState(createMutationRegistry)
  const registry = shared ?? local
  const action = useMemo(() => createAdminMutation({ registry, key, callback, onRefresh, onCheckStatus }), [registry, key, callback, onRefresh, onCheckStatus])
  const state = useSyncExternalStore(action.subscribe, action.getSnapshot, action.getSnapshot)
  useEffect(() => action.cancel, [action])
  return { ...state, run: action.run, check: action.check, acknowledge: action.acknowledge, blocked: state.pending || state.checking || state.uncertain || state.denied || Boolean(state.outcome) }
}
