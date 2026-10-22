// A scope-owned mutation survives dialog close/navigation and blocks uncertain retries.
export function createStudentAction() {
  let state = { busy: false, error: null, result: null, blocked: false }
  let controller
  let disposed = false
  let revision = 0
  const listeners = new Set()
  const publish = next => { state = next; listeners.forEach(listener => listener()) }
  return {
    getSnapshot: () => state,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    activate: () => { disposed = false },
    dispose: () => { disposed = true; revision += 1; controller?.abort() },
    run: async (operation, input) => {
      if (disposed || state.busy || state.blocked || state.result) return null
      controller = new AbortController()
      const current = ++revision
      const snapshot = structuredClone(input)
      publish({ busy: true, error: null, result: null, blocked: false })
      try {
        const result = await operation(snapshot, { signal: controller.signal })
        if (disposed || current !== revision) return null
        // Service adapters validate matching, explicit confirmation before this point.
        publish({ busy: false, error: null, result, blocked: true })
        return result
      } catch (error) {
        if (disposed || current !== revision) return null
        const retryable = error?.unavailable || [400, 422].includes(error?.status)
        publish({ busy: false, error: error?.message || 'The action could not be confirmed.', result: null, blocked: !retryable })
        return null
      }
    },
  }
}
