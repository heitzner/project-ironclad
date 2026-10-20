import { createContext, useContext } from 'react'
import { studentService } from '../../services/student.service.js'

export const StudentContext = createContext(null)
const fallbackActions = new Map()
export function useStudent() {
  const value = useContext(StudentContext)
  return { ...value, service: value?.service ?? studentService, actions: value?.actions ?? fallbackActions }
}
