import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import AdminShell from '../../components/admin/AdminShell.jsx'
import AdminState from '../../components/admin/AdminState.jsx'
import AdminTable from '../../components/admin/AdminTable.jsx'
import RoleDialog from '../../components/admin/RoleDialog.jsx'

export default function AdminRoles({ members, roles, loading, error, onRetry, onSaveRole, ...shell }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [selection, setSelection] = useState(null)
  const [notice, setNotice] = useState('')
  const filtered = members?.filter(member => (!filter || member.councilRoleId === filter) && `${member.name ?? ''} ${member.studentId ?? ''} ${member.section ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))
  return <AdminShell {...shell} section="roles" title="User Management">
    <section className="flex flex-wrap items-center gap-3 rounded-panel bg-white p-4" aria-label="Member search and role filters">
      <label className="min-w-0 flex-1"><span className="sr-only">Search members</span><input className="admin-field" type="search" placeholder="Search name, student ID, or section…" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label><span className="sr-only">Filter by council role</span><select className="admin-field" value={filter} onChange={event => setFilter(event.target.value)}><option value="">All council roles</option>{roles?.filter(role => role.scope === 'council').map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
      <button type="button" className="admin-button" onClick={() => setSelection({})}><ShieldCheck aria-hidden="true" className="h-4 w-4" />Set council role</button>
    </section>
    {notice && <p role="status" className="rounded-control bg-cardBg p-3 text-xs text-deep">{notice}</p>}
    <AdminTable label="Council members" columns={['Student name', 'Student ID', 'Student status', 'Course / section', 'Council role']} emptyState={loading || error || !members || !filtered.length ? <AdminState loading={loading} error={error} connected={Boolean(members)} empty={!filtered?.length} onRetry={onRetry} label="council members" /> : undefined}>
      {loading || error || !members || !filtered.length ? null : filtered.map(member => <tr key={member.id} className="even:bg-cardBg"><td className="admin-cell font-semibold">{member.name}</td><td className="admin-cell">{member.studentId}</td><td className="admin-cell"><span className="rounded-control bg-selectBg px-3 py-2 capitalize">{member.status || 'Not provided'}</span></td><td className="admin-cell">{member.section || 'Not provided'}</td><td className="admin-cell"><button type="button" className="admin-secondary" onClick={() => setSelection(member)}>{roles?.find(role => role.id === member.councilRoleId)?.name || 'Set role'}</button></td></tr>)}
    </AdminTable>
    {selection && <RoleDialog member={selection.id ? selection : undefined} members={members} roles={roles} user={shell.user} preview={shell.preview} onSaveRole={onSaveRole ? async (...args) => { await onSaveRole(...args); setNotice('The council role was updated.'); } : undefined} onClose={() => setSelection(null)} />}
  </AdminShell>
}
