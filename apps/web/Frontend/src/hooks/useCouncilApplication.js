import { useCallback } from 'react'
import { councilService } from '../services/council.service.js'
import useAuth from './useAuth.js'
import useAsyncResource from './useAsyncResource.js'

export default function useCouncilApplication({ service = councilService } = {}) {
  const auth = useAuth()
  // The host adapter resolves the applicant from its authenticated session.
  const load = useCallback(({ signal }) => service.getApplicationForm({}, { signal }), [service])
  const resource = useAsyncResource(load, { enabled: auth.status === 'authenticated', scope: auth.user })
  return auth.status === 'authenticated' ? resource : { data: null, loading: auth.loading, error: auth.error, status: auth.status, refetch: auth.refetch }
}
