import { useState } from 'react'
import AdminDialog from './AdminDialog.jsx'
import { isAdmin, validateRoleChange } from './admin.logic.js'
import useAdminMutation from './useAdminMutation.js'
import AdminMutationFeedback from './AdminMutationFeedback.jsx'

export default function RoleDialog({ member, members, roles = [], user, preview, onSaveRole, onClose, onRefresh, onCheckStatus }) {
  const [memberId, setMemberId] = useState(member?.id ?? '')
  const [roleId, setRoleId] = useState(member?.councilRoleId ?? '')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const target = member ?? members?.find(item => String(item.id) === String(memberId))
  const mutation = useAdminMutation({ key: `role:${target?.id ?? 'selection'}:${target?.version ?? ''}`, callback: onSaveRole, onRefresh, onCheckStatus })
  const pending = mutation.pending || mutation.checking
  const availableRoles = roles.filter(role => role.scope === 'council')
  const canSave = !preview && isAdmin(user) && Boolean(onSaveRole)
  async function submit(event) {
    event.preventDefault()
    const issue = validateRoleChange(user, target, roleId, availableRoles)
    if (issue) { setError(issue); return }
    if (!confirmed) { setError('Confirm the role change before continuing.'); return }
    if (!canSave || mutation.blocked) return
    setError('')
    await mutation.run([target.id, { councilRoleId: roleId || null, version: target.version }], result => result?.id === target.id && Object.hasOwn(result, 'councilRoleId') && result.councilRoleId === (roleId || null))
  }
  return <AdminDialog title="Set council member role" description="Only verified administrator accounts can change council assignments. Administrator privileges cannot be assigned here." onClose={onClose} busy={pending}>
    <form onSubmit={submit} className="grid gap-4">
      <fieldset disabled={mutation.blocked} className="grid min-w-0 gap-4"><label className="admin-label">Council member<select className="admin-field" value={memberId} required disabled={Boolean(member)} onChange={event => { setMemberId(event.target.value); setRoleId(''); setConfirmed(false) }}><option value="">{members?.length ? 'Select an account' : 'No members connected'}</option>{(member ? [member] : members ?? []).map(item => <option key={item.id} value={item.id}>{item.name} · {item.studentId}</option>)}</select></label>
      <label className="admin-label">Council role<select className="admin-field" value={roleId} onChange={event => { setRoleId(event.target.value); setConfirmed(false) }}><option value="">Remove council assignment</option>{availableRoles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
      <p className="rounded-control bg-pageBg p-3 text-xs leading-6">{target ? `${target.name}: ${roleId ? `assign ${availableRoles.find(role => role.id === roleId)?.name ?? 'selected role'}` : 'remove the council assignment'}.` : 'Select a member to review the change.'}</p>
      <label className="flex min-h-11 items-center gap-2 text-xs leading-6"><input type="checkbox" className="h-4 w-4 shrink-0 accent-primary" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} required />I confirm this role change for the selected member.</label></fieldset>
      {!canSave && <p className="rounded-control bg-pageBg p-3 text-xs leading-5 text-textSecondary">Role changes require live member data, available council roles, and the role management service.</p>}
      {error && <p role="alert" className="text-sm">{error}</p>}
      <AdminMutationFeedback mutation={mutation} onRefresh={onRefresh} onCheckStatus={onCheckStatus} />
      <div className="flex flex-wrap justify-end gap-2"><button type="button" className="admin-secondary" disabled={pending} onClick={onClose}>{mutation.outcome ? 'Done' : 'Cancel'}</button><button type="submit" className="admin-button" disabled={mutation.blocked || !canSave || !target || !confirmed}>{pending ? 'Saving…' : 'Confirm role change'}</button></div>
    </form>
  </AdminDialog>
}
