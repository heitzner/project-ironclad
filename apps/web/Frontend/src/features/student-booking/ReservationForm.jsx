import { useId } from 'react'
import avatar from './assets/5174f.png'
import BookingIcon from './BookingIcon'
import { durationLabel, timeRange } from './booking.logic'

export default function ReservationForm({ requester, view, purpose, slots, slotId, error, busy, formRef, onChange, onSubmit }) {
  const id = useId()
  const unavailable = Boolean(view.room.blocked) || !slots.length
  const explanation = view.room.blocked?.reason || 'No future free window in this shift. Try another date, shift, or venue.'
  return <form className="booking-reservation" ref={formRef} onSubmit={onSubmit} noValidate aria-busy={busy}>
    <h4>Reservation configuration</h4>
    <div className="booking-requester"><img src={requester.avatarUrl || avatar} width="28" height="28" alt="" /><div><strong>{requester.name}</strong><p>Student ID: {requester.studentId} · {requester.program}</p></div></div>
    <label className="booking-purpose-label" htmlFor={`${id}-purpose`}>Activity Purpose / Organization</label>
    <div className="booking-purpose"><input id={`${id}-purpose`} name="purpose" value={purpose} placeholder="e.g. Academic study group" required disabled={busy} aria-invalid={error?.field === 'purpose' || undefined} aria-describedby={error?.field === 'purpose' ? `${id}-error` : undefined} onChange={event => onChange({ purpose: event.target.value })} /><BookingIcon name="4d40e" /></div>
    <fieldset className="booking-duration" disabled={busy || unavailable} aria-invalid={error?.field === 'slot' || undefined} aria-describedby={error?.field === 'slot' ? `${id}-error` : unavailable ? `${id}-unavailable` : undefined}>
      <legend>Requested Duration</legend>
      <div className="booking-slot-options">{slots.map(slot => <label key={slot.id} className={slotId === slot.id ? 'is-selected' : ''}><input type="radio" name={`${id}-duration`} value={slot.id} checked={slotId === slot.id} required onChange={() => onChange({ slotId: slot.id })} /><span>{slot.preset ? timeRange(slot.start, slot.end) : 'Full Window'}<small>{slot.preset ? `(${durationLabel(slot.start, slot.end)})` : `${timeRange(slot.start, slot.end)} (${durationLabel(slot.start, slot.end)})`}</small></span></label>)}</div>
    </fieldset>
    {unavailable && <p className="booking-unavailable" id={`${id}-unavailable`}>{explanation}</p>}
    {error && <p className="booking-error" role="alert" id={`${id}-error`}>{error.message}</p>}
    <div className="booking-approval"><BookingIcon name="0126c" /><p>Requires final approval from the MIS Administrator before the venue reservation is officially locked.</p></div>
    <button className="booking-primary booking-submit" type="submit" disabled={busy || unavailable} aria-describedby={unavailable ? `${id}-unavailable` : undefined}><BookingIcon name="876e2" />{busy ? 'Sending request…' : 'Lock Venue'}</button>
    <p className="booking-demo-note" role="status">{busy ? 'Sending your demo request. Please wait.' : 'Demo request only · nothing is saved to the university system.'}</p>
  </form>
}
