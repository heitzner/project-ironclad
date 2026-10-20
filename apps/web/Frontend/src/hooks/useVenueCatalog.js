import { useCallback, useEffect, useState } from 'react'
import { getVenues } from '../services/booking.js'

export function useVenueCatalog({ date, period, floor, q }) {
  const [version, setVersion] = useState(0)
  const requestKey = `${date}\u0000${period}\u0000${floor}\u0000${q}\u0000${version}`
  const [state, setState] = useState({ data: null, error: null, settledKey: null })
  const refetch = useCallback(() => setVersion((current) => current + 1), [])

  useEffect(() => {
    if (!date) return undefined
    const controller = new AbortController()
    getVenues({ date, period, floor, q, signal: controller.signal })
      .then((data) => setState({ data, error: null, settledKey: requestKey }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState((current) => ({ data: current.data, error, settledKey: requestKey }))
      })
    return () => controller.abort()
  }, [date, period, floor, q, version, requestKey])

  const currentData = state.settledKey === requestKey ? state.data : null
  const currentError = state.settledKey === requestKey ? state.error : null
  return { data: currentData, error: currentError, loading: Boolean(date) && state.settledKey !== requestKey, refetch }
}
