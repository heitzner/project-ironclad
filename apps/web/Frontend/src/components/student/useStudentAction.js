import { useSyncExternalStore } from 'react'
import { createStudentAction } from './studentAction.js'
import { useStudent } from './student.context.js'

export default function useStudentAction(key) {
  const { actions } = useStudent()
  if (!actions.has(key)) actions.set(key, createStudentAction())
  const action = actions.get(key)
  const state = useSyncExternalStore(action.subscribe, action.getSnapshot, action.getSnapshot)
  return { ...state, run: action.run }
}
