import { useCallback } from 'react'
import { studentService } from '../services/student.service.js'
import useAsyncResource from './useAsyncResource.js'

// Archived records plus their filter options and summary counts.
export default function useArchive({ service = studentService, enabled = true, scope = null } = {}) {
  const load = useCallback(({ signal }) => service.getArchive({}, { signal }), [service])
  return useAsyncResource(load, { enabled, scope })
}
