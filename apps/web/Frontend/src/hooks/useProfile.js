import { useCallback } from 'react'
import { studentService } from '../services/student.service.js'
import useAsyncResource from './useAsyncResource.js'

// Signed-in student's profile; only loads once a user is present.
export default function useProfile({ service = studentService, enabled = true } = {}) {
  const load = useCallback(({ signal }) => service.getProfile({ signal }), [service])
  return useAsyncResource(load, { enabled })
}
