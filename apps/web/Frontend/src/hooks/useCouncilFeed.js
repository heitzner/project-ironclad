import { useCallback } from 'react'
import { councilService } from '../services/council.service.js'
import useAuth from './useAuth.js'
import useAsyncResource from './useAsyncResource.js'

export default function useCouncilFeed({ service = councilService, query = '', category = '', page = 1 } = {}) {
  const auth = useAuth()
  const search = query.trim()
  const load = useCallback(({ signal }) => service.getFeed({ query: search, category, page }, { signal }),
    [service, search, category, page])
  const resource = useAsyncResource(load, { enabled: auth.status === 'authenticated', scope: auth.user })
  return auth.status === 'authenticated' ? resource : { data: null, loading: auth.loading, error: auth.error, status: auth.status, refetch: auth.refetch }
}
