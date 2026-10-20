import { StudentContext } from './student.context.js'
import { useEffect, useMemo } from 'react'

// Reuses the shared auth/scope owner; this provider supplies only Student feature adapters.
export default function StudentProvider({ children, value }) {
  const scoped = useMemo(() => ({ service: value?.service, actions: new Map() }), [value?.service])
  const { actions } = scoped
  useEffect(() => {
    actions.forEach(action => action.activate())
    return () => { actions.forEach(action => action.dispose()) }
  }, [actions])
  return <StudentContext.Provider value={{ ...value, actions }}>{children}</StudentContext.Provider>
}
