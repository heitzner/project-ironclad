import AdminDialog from './AdminDialog.jsx'
import { isAdmin } from './admin.logic.js'
import useAdminMutation from './useAdminMutation.js'
import AdminMutationFeedback from './AdminMutationFeedback.jsx'

export default function CompleteEventDialog({ event, user, onComplete, onClose, onRefresh, onCheckStatus }) {
  const mutation = useAdminMutation({ key: `complete-event:${event.id}`, callback: onComplete, onRefresh, onCheckStatus })
  const pending = mutation.pending || mutation.checking
  async function confirm() {
    if (mutation.blocked || !isAdmin(user) || !onComplete || event.status === 'completed') return
    await mutation.run([event.id, { version: event.version }], result => result?.id === event.id && result?.status === 'completed')
  }
  return <AdminDialog title="Mark event as complete?" description={`Confirm that “${event.title}” has finished. Its completed status will be saved by the event service.`} busy={pending} onClose={onClose}>
    <AdminMutationFeedback mutation={mutation} onRefresh={onRefresh} onCheckStatus={onCheckStatus} />
    <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" className="admin-secondary" disabled={pending} onClick={onClose}>{mutation.outcome ? 'Done' : 'Cancel'}</button><button type="button" className="admin-button" disabled={mutation.blocked || !isAdmin(user) || !onComplete || event.status === 'completed'} onClick={confirm}>{pending ? 'Saving…' : 'Confirm completion'}</button></div>
  </AdminDialog>
}
