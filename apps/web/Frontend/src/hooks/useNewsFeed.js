import { useCallback, useEffect, useState } from 'react'
import { getNewsFeed } from '../services/newsFeed.js'

export function useNewsFeed({ q = '', category = '' } = {}) {
  const [requestVersion, setRequestVersion] = useState(0)
  const requestKey = `${q}\u0000${category}\u0000${requestVersion}`
  const [state, setState] = useState({ data: null, error: null, settledKey: null })
  const refetch = useCallback(() => setRequestVersion((version) => version + 1), [])

  useEffect(() => {
    const controller = new AbortController()

    getNewsFeed({ q, category, signal: controller.signal })
      .then((data) => setState({ data, error: null, settledKey: requestKey }))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setState((current) => ({ data: current.data, error, settledKey: requestKey }))
        }
      })

    return () => controller.abort()
  }, [q, category, requestVersion, requestKey])

  return { data: state.data, error: state.error, loading: state.settledKey !== requestKey, refetch }
}
