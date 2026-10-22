import { useEffect, useRef } from 'react'
import BookingIcon from './BookingIcon'
import { formatDate, timeRange } from './booking.logic'

export default function BookingRequestDialog({ request, returnFocusRef, onClose }) {
  const dialogRef = useRef(null)
  const returnRef = useRef(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!request || dialog.open) return
    const previousFocus = returnFocusRef?.current || document.activeElement
    dialog.showModal()
    returnRef.current.focus()
    return () => {
      dialog.close()
      if (previousFocus?.isConnected) previousFocus.focus()
      else dialog.closest('.student-booking')?.querySelector('button:not(:disabled)')?.focus()
    }
  }, [request, returnFocusRef])

  function containTab(event) {
    if (event.key !== 'Tab') return
    const controls = [...dialogRef.current.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
      .filter(control => control.getClientRects().length && !control.closest('[inert]'))
    const first = controls[0]
    const last = controls.at(-1)
    if (!first) return
    if (event.shiftKey ? document.activeElement === first : document.activeElement === last) {
      event.preventDefault()
      const next = event.shiftKey ? last : first
      next.focus()
    }
  }

  return <dialog className="booking-request-dialog" ref={dialogRef} aria-labelledby="booking-request-title" aria-describedby="booking-request-description" onKeyDown={containTab} onCancel={event => { event.preventDefault(); onClose() }}>
    {request && <><div className="booking-confirm-art"><BookingIcon name="ca8b6" /><span><BookingIcon name="aa2df" /></span></div>
      <h2 id="booking-request-title">{request.status === 'approved' ? 'Room Booked' : 'Room Requested'}</h2>
      <p id="booking-request-description">{request.status === 'approved' ? 'Your administrator reservation is approved. The room is reserved for your selected time.' : 'Your reservation request is in the queue. It requires final approval from the MIS Administrator before the venue is officially locked.'}</p>
      <div className="booking-confirm-reference"><strong>REQ ID: {request.id}</strong><span><i /><BookingIcon name="528b4" />Status: {request.status === 'approved' ? 'Approved' : 'Pending MIS Approval'}</span></div>
      <p className="booking-confirm-summary">Room {request.roomId} · {formatDate(request.date, true)}<br />{timeRange(request.start, request.end)}</p>
      <button ref={returnRef} className="booking-primary" type="button" onClick={onClose}>Return to Booking<BookingIcon name="28520" /></button>
      <p className="booking-confirm-note"><BookingIcon name="f26fc" />View your booking and its status in your account menu.</p></>}
  </dialog>
}
