import { useCallback } from 'react'
import { studentService } from '../services/student.service.js'
import useAsyncResource from './useAsyncResource.js'

// Campus events list for the student directory.
export default function useEvents({ service = studentService, enabled = true, scope = null } = {}) {
  const load = useCallback(({ signal }) => service.getEvents({}, { signal }), [service])
  return useAsyncResource(load, { enabled, scope })
}
