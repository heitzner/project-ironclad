import { useCallback, useEffect, useState } from 'react'
import {
  completeEvent,
  decideBooking,
  getAdminWorkspace,
  saveCouncilRole,
  saveEvent,
} from '../services/admin.js'

const emptyData = Object.freeze({
  session: null,
  rooms: undefined,
  bookings: undefined,
  events: undefined,
  members: undefined,
  roles: undefined,
})

export function useAdminWorkspace(enabled) {
  const [state, setState] = useState({ data: emptyData, loading: enabled, error: null })
  const [reloadToken, setReloadToken] = useState(0)

  const load = useCallback(async () => {
    const data = await getAdminWorkspace()
    setState({ data, loading: false, error: null })
    return data
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    getAdminWorkspace().then(data => {
      if (!cancelled) setState({ data, loading: false, error: null })
    }).catch(error => {
      if (!cancelled) setState({ data: emptyData, loading: false, error: error.message })
    })
    return () => { cancelled = true }
  }, [enabled, reloadToken])

  const refetch = useCallback(() => {
    setState(previous => ({ ...previous, loading: true, error: null }))
    setReloadToken(value => value + 1)
  }, [])

  const mutate = useCallback(async operation => {
    await operation()
    await load()
  }, [load])

  const onDecision = useCallback((bookingId, values) =>
    mutate(() => decideBooking(bookingId, values)), [mutate])
  const onSaveEvent = useCallback(values =>
    mutate(() => saveEvent(values)), [mutate])
  const onCompleteEvent = useCallback((eventId, values) =>
    mutate(() => completeEvent(eventId, values)), [mutate])
  const onSaveRole = useCallback((memberId, values) =>
    mutate(() => saveCouncilRole(memberId, values)), [mutate])

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refetch,
    onDecision,
    onSaveEvent,
    onCompleteEvent,
    onSaveRole,
  }
}
