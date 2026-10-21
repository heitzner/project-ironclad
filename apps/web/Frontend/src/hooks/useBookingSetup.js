import { useCallback, useEffect, useState } from 'react'
import { getBookingSetup } from '../services/booking.js'

export function useBookingSetup() {
  const [version, setVersion] = useState(0)
  const [state, setState] = useState({ data: null, error: null, settledVersion: -1 })
  const refetch = useCallback(() => setVersion((current) => current + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    getBookingSetup({ signal: controller.signal })
      .then((data) => setState({ data, error: null, settledVersion: version }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState((current) => ({ data: current.data, error, settledVersion: version }))
      })
    return () => controller.abort()
  }, [version])

  return { data: state.data, error: state.error, loading: state.settledVersion !== version, refetch }
}
