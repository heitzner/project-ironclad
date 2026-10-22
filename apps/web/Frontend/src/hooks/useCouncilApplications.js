import { useCallback } from 'react'
import { councilService } from '../services/council.service.js'
import useAuth from './useAuth.js'
import useAsyncResource from './useAsyncResource.js'

export default function useCouncilApplications({ service = councilService, query = '', program = '', status = '', page = 1 } = {}) {
  const auth = useAuth()
  const allowed = auth.status === 'authenticated' && auth.user?.role === 'council' && auth.capabilities.canReviewApplications === true
  const search = query.trim()
  const load = useCallback(({ signal }) => service.getApplications({ query: search, program, status, page }, { signal }),
    [service, search, program, status, page])
  const resource = useAsyncResource(load, { enabled: allowed, scope: auth.user })
  if (auth.status !== 'authenticated') return { data: null, loading: auth.loading, error: auth.error, status: auth.status, refetch: auth.refetch }
  return allowed ? resource : { data: null, loading: false, error: null, status: 'forbidden', refetch: null }
}
