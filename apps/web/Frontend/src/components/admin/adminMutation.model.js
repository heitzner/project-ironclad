import { createContext } from 'react'

const initial = Object.freeze({ pending: false, checking: false, error: '', uncertain: false, denied: false, outcome: null, refreshError: false, checkMessage: '' })
export const AdminMutationContext = createContext(null)

// Keep uncertain writes blocked across closing/reopening dialogs and section navigation.
export function createMutationRegistry() {
  const states = new Map(), listeners = new Set()
  return {
    get: key => states.get(key) ?? initial,
    set: (key, value) => { states.set(key, value); listeners.forEach(listener => listener()) },
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
  }
}

export function createAdminMutation({ registry = createMutationRegistry(), key, callback, onRefresh, onCheckStatus }) {
  let revision = 0, controller
  const publish = patch => registry.set(key, { ...registry.get(key), ...patch })
  const refresh = async current => {
    if (!onRefresh) return
    try {
      await onRefresh()
      if (current === revision) publish({ refreshError: false })
    } catch {
      if (current === revision) publish({ refreshError: true })
    }
  }
  return {
    getSnapshot: () => registry.get(key),
    subscribe: registry.subscribe,
    acknowledge: () => { if (registry.get(key).outcome) registry.set(key, initial) },
    cancel: () => {
      revision += 1
      controller?.abort()
      const state = registry.get(key)
      if (state.pending || state.checking) publish({ pending: false, checking: false, uncertain: !state.outcome, error: state.outcome ? '' : 'The operation was interrupted. Check its status before submitting again.' })
    },
    run: async (args, validate) => {
      const state = registry.get(key)
      if (state.pending || state.checking || state.uncertain || state.denied || state.outcome || typeof callback !== 'function') return
      const current = ++revision
      controller = new AbortController()
      const submitted = structuredClone(args)
      publish({ ...initial, pending: true, args: submitted, validate })
      try {
        const result = await callback(...submitted, { signal: controller.signal })
        if (revision !== current) return
        if (result?.confirmed !== true || !validate(result)) throw new Error('The save result could not be confirmed. Check its status before trying again.')
        publish({ pending: false, outcome: result, error: '' })
        await refresh(current)
      } catch (failure) {
        if (revision !== current) return
        const certainFailure = [400, 401, 403, 422].includes(failure?.status) || failure?.unavailable === true
        publish({ pending: false, denied: [401, 403].includes(failure?.status), uncertain: !certainFailure, error: failure?.message || 'The operation could not be confirmed. Check its status before trying again.' })
      }
    },
    check: async () => {
      const state = registry.get(key)
      if (state.pending || state.checking) return
      if (state.outcome) { await refresh(revision); return }
      if (!state.uncertain || !onCheckStatus) return
      const current = ++revision
      controller = new AbortController()
      publish({ checking: true })
      try {
        const result = await onCheckStatus({ key, args: state.args }, { signal: controller.signal })
        if (revision !== current) return
        if (result?.key === key && result?.resolution === 'not-applied' && result?.retryAllowed === true) {
          publish({ ...initial, args: state.args, validate: state.validate, checkMessage: 'The status check confirmed that no change was saved. Review your input before trying again.' })
          return
        }
        if (result?.confirmed !== true || !state.validate?.(result)) throw new Error('The requested outcome is still unconfirmed. Do not repeat the operation until its status is resolved.')
        publish({ checking: false, uncertain: false, outcome: result, error: '' })
        await refresh(current)
      } catch (error) {
        if (revision === current) publish({ checking: false, error: error?.message || 'Status could not be checked. Try checking again.' })
      }
    },
  }
}
