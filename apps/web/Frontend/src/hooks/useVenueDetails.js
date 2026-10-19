import { useCallback, useEffect, useState } from 'react'
import { getVenueDetails } from '../services/booking.js'

export function useVenueDetails({ roomCode, date, period }) {
  const [version, setVersion] = useState(0)
  const requestKey = `${roomCode}\u0000${date}\u0000${period}\u0000${version}`
  const [state, setState] = useState({ data: null, error: null, settledKey: null })
  const refetch = useCallback(() => setVersion((current) => current + 1), [])

  useEffect(() => {
    if (!roomCode || !date) return undefined
    const controller = new AbortController()
    getVenueDetails({ roomCode, date, period, signal: controller.signal })
      .then((data) => setState({ data, error: null, settledKey: requestKey }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, error, settledKey: requestKey })
      })
    return () => controller.abort()
  }, [roomCode, date, period, version, requestKey])

  const matches = state.settledKey === requestKey
  return {
    data: matches ? state.data : null,
    error: matches ? state.error : null,
    loading: Boolean(roomCode && date) && !matches,
    refetch,
  }
}
