import { useState } from 'react'
import AdminDialog from './AdminDialog.jsx'
import { isAdmin, validateEvent } from './admin.logic.js'

// The date inputs explicitly use campus (Manila) time, independent of device zone.
function inputDate(iso) {
  if (!iso || Number.isNaN(Date.parse(iso))) return ''
  return new Date(Date.parse(iso) + 8 * 60 * 60 * 1000).toISOString().slice(0, 16)
}

export default function EventForm({ event, venues, user, preview, onSave, onClose }) {
  const [values, setValues] = useState(() => ({ title: event?.title ?? '', description: event?.description ?? '', venueId: event?.venueId ?? '', startsAt: inputDate(event?.startsAt), endsAt: inputDate(event?.endsAt) }))
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const canSave = !preview && isAdmin(user) && Boolean(onSave)
  function change(event) { setValues(current => ({ ...current, [event.target.name]: event.target.value })) }
  async function submit(formEvent) {
    formEvent.preventDefault()
    const payload = { ...values, title: values.title.trim(), description: values.description.trim(), startsAt: values.startsAt ? `${values.startsAt}:00+08:00` : '', endsAt: values.endsAt ? `${values.endsAt}:00+08:00` : '' }
    const issue = validateEvent(payload)
    if (issue) { setError(issue); return }
    if (!canSave || pending) return
    setPending(true)
    setError('')
    try {
      await onSave({ ...payload, id: event?.id, version: event?.version })
      onClose()
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save the event. Please try again.') }
    finally { setPending(false) }
  }
  return <AdminDialog title={event ? 'Edit event' : 'Create campus event'} description="Enter the event details. All schedules use Philippine time (UTC+8)." onClose={onClose} busy={pending}>
    <form onSubmit={submit} className="grid gap-4">
      <fieldset disabled={pending} className="grid min-w-0 gap-4">
        <label className="admin-label">Event title<input name="title" value={values.title} onChange={change} className="admin-field" required maxLength={120} /></label>
        <label className="admin-label">Description<textarea name="description" value={values.description} onChange={change} className="admin-field min-h-24" required maxLength={2000} /></label>
        <label className="admin-label">Venue<select name="venueId" value={values.venueId} onChange={change} className="admin-field" required><option value="">{venues?.length ? 'Select a venue' : 'No venues connected'}</option>{venues?.map(venue => <option value={venue.id} key={venue.id}>{venue.name}</option>)}</select></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="admin-label">Starts at (Manila)<input type="datetime-local" name="startsAt" value={values.startsAt} onChange={change} className="admin-field" required /></label><label className="admin-label">Ends at (Manila)<input type="datetime-local" name="endsAt" value={values.endsAt} onChange={change} className="admin-field" required /></label></div>
      </fieldset>
      {!canSave && <p className="rounded-control bg-pageBg p-3 text-xs leading-5 text-textSecondary">Preview only. Saving requires a connected event service and a validated administrator account.</p>}
      {error && <p role="alert" className="text-sm text-textPrimary">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" className="admin-secondary" disabled={pending} onClick={onClose}>Cancel</button><button type="submit" className="admin-button" disabled={pending || !canSave}>{pending ? 'Saving…' : 'Save event'}</button></div>
    </form>
  </AdminDialog>
}
