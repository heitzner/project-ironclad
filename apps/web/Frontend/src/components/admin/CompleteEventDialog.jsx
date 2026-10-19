import { useState } from 'react'
import AdminDialog from './AdminDialog.jsx'
import { isAdmin } from './admin.logic.js'

export default function CompleteEventDialog({ event, user, onComplete, onClose }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function confirm() {
    if (pending || !isAdmin(user) || !onComplete || event.status === 'completed') return
    setPending(true)
    setError('')
    try { await onComplete(event.id, { version: event.version }); onClose() }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to complete the event. Please try again.') }
    finally { setPending(false) }
  }
  return <AdminDialog title="Mark event as complete?" description={`Confirm that “${event.title}” has finished. Its completed status will be saved by the event service.`} busy={pending} onClose={onClose}>
    {error && <p role="alert" className="mb-4 text-sm">{error}</p>}
    <div className="flex justify-end gap-2"><button type="button" className="admin-secondary" disabled={pending} onClick={onClose}>Cancel</button><button type="button" className="admin-button" disabled={pending || !isAdmin(user) || !onComplete} onClick={confirm}>{pending ? 'Saving…' : 'Confirm completion'}</button></div>
  </AdminDialog>
}
