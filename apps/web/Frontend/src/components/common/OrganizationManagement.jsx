import { useState } from 'react'
import { UsersRound } from 'lucide-react'
import PageLayout from './PageLayout.jsx'
import PageHeader from './PageHeader.jsx'
import SystemDialog, { DecisionDialog } from './SystemDialog.jsx'
import { dateTimeLabel, inputClass, primaryButton, secondaryButton } from './system-ui.js'
import { canManageMembers, effectiveUser, organizationScope, positionLabel, positions } from '../../data/organization.js'
import { ThemedSelect } from './ThemedControls.jsx'

export function HandoverInvitations({ snapshot, store, user }) {
  const [decision, setDecision] = useState(null)
  const invitations = snapshot.handovers.filter(h => h.to === user.id && h.status === 'pending')
  return <>{invitations.map(h => <section key={h.id} className="rounded-card border border-soft bg-cardBg p-5"><h2 className="font-bold">Presidential handover invitation · {h.scope}</h2><p className="mt-2 text-sm leading-6 text-textSecondary">You have been nominated as the next {h.scope === 'ACES' ? 'ACES' : `${h.scope} Council`} President. Accepting transfers the presidency to you; the outgoing President becomes a Member. You can then appoint your Vice President, Secretary, and other members.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" className={primaryButton} onClick={() => setDecision({ h, action: 'accept' })}>Review & accept</button><button type="button" className={secondaryButton} onClick={() => setDecision({ h, action: 'decline' })}>Decline nomination</button></div></section>)}
    {decision && <DecisionDialog title={decision.action === 'accept' ? 'Accept the presidency?' : 'Decline this nomination?'} description={decision.action === 'accept' ? 'The presidency transfers when you accept. The outgoing President becomes a Member and loses access to member management. There is exactly one President per organization.' : 'The current President keeps their position. They can nominate another member.'} actionLabel={decision.action === 'accept' ? 'Accept presidency' : 'Decline nomination'} onClose={() => setDecision(null)} onConfirm={() => store.respondHandover(user, decision.h.id, decision.action)} />}
  </>
}

export default function OrganizationManagement({ snapshot, store, user, directory }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [edit, setEdit] = useState(null)
  const [nominate, setNominate] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(1)
  const scope = organizationScope(user)
  const everyone = directory.map(person => effectiveUser(person, snapshot)).filter(person => user.role === 'admin' || person.course === scope && person.role !== 'admin')
  const members = everyone.filter(person => person.role === user.role && organizationScope(person) === scope)
  const filtered = everyone.filter(person => `${person.name} ${person.studentId} ${person.course}`.toLowerCase().includes(query.toLowerCase().trim()) && (filter === 'all' || (filter === 'members' ? members.some(m => m.id === person.id) : person.position === filter)))
  const totalPages = Math.max(1, Math.ceil(filtered.length / 8))
  const currentPage = Math.min(page, totalPages)
  const pending = snapshot.handovers.find(h => h.from === user.id && h.status === 'pending')
  if (!canManageMembers(user)) return <PageLayout><p>Member management is available to the President, Vice President, and Secretary.</p></PageLayout>
  return <PageLayout>
    <PageHeader icon={UsersRound} title={user.role === 'admin' ? 'People & Roles' : 'Council Members'} subtitle={`${scope === 'ACES' ? 'ACES administration' : `${scope} Council`} · Member directory, appointments, and presidential handover.`} />
    <div className="grid gap-3 sm:grid-cols-3">{[['Organization', scope === 'ACES' ? 'ACES' : `${scope} Council`], ['Your position', positionLabel(user)], ['Current members', members.length]].map(([label, value]) => <div key={label} className="rounded-card border border-soft bg-cardBg p-4"><p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">{label}</p><p className="mt-2 text-lg font-bold text-deep">{value}</p></div>)}</div>
    <HandoverInvitations snapshot={snapshot} store={store} user={user} />
    <section className="rounded-card border border-track bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Member directory</h2><p className="mt-1 text-xs leading-5 text-textSecondary">Only the top three positions see this page. The President appoints the Vice President and Secretary; all three can manage lower positions.</p></div>{user.position === 'President' && <button type="button" className={secondaryButton} disabled={Boolean(pending) || members.length < 2} onClick={() => { setError(''); setNominate(true) }}>Nominate next President</button>}</div>
      {pending && <div className="mt-4 rounded-panel bg-cardBg p-3 text-sm"><p>Nomination awaiting acceptance from {everyone.find(p => p.id === pending.to)?.name || 'the selected member'}. The current President remains in office.</p><button type="button" disabled={busy} className={`${secondaryButton} mt-2`} onClick={async () => { setBusy(true); setError(''); try { await store.respondHandover(user, pending.id, 'cancel') } catch (failure) { setError(failure.message) } finally { setBusy(false) } }}>Cancel nomination</button></div>}
      <div className="my-4 grid gap-3 sm:grid-cols-[1fr_minmax(10rem,15rem)]"><input type="search" aria-label="Search people" placeholder="Search name, Student ID, or course…" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} className={inputClass} /><ThemedSelect label="Filter people by position" value={filter} onChange={value => { setFilter(value); setPage(1) }} options={[{ value: 'all', label: 'All people' }, { value: 'members', label: 'Organization members' }, ...positions.map(position => ({ value: position, label: position }))]} /></div>
      <div className="overflow-x-auto rounded-panel border border-track" role="region" aria-label="People and positions" tabIndex={0}><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-dark text-white"><tr>{['Name', 'Student ID', 'Position / status', 'Course / Section', 'Manage'].map(label => <th scope="col" key={label} className="px-4 py-4 text-xs uppercase">{label}</th>)}</tr></thead><tbody>{filtered.slice((currentPage - 1) * 8, currentPage * 8).map((person, index) => <tr key={person.id} className={index % 2 ? 'bg-cardBg' : 'bg-white'}><td className="px-4 py-4 font-semibold">{person.name}</td><td className="px-4 py-4">{person.studentId}</td><td className="px-4 py-4"><span className="inline-flex rounded-full bg-selectBg px-3 py-2 text-xs font-semibold">{positionLabel(person)}</span></td><td className="px-4 py-4">{person.course} {person.yearLevel}{person.section}</td><td className="px-4 py-4"><button type="button" className={secondaryButton} disabled={person.id === user.id || person.position === 'President' || (user.position !== 'President' && ['Vice President', 'Secretary'].includes(person.position))} onClick={() => { setError(''); setEdit(person) }}>Assign position</button></td></tr>)}</tbody></table>{!filtered.length && <p className="p-8 text-center text-sm">No people match these filters.</p>}</div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-textSecondary"><span>{filtered.length} people · Page {currentPage} of {totalPages}</span><div className="flex gap-2"><button type="button" className={secondaryButton} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><button type="button" className={secondaryButton} disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</button></div></div>
    </section>
    {success && <p role="status" className="rounded-panel bg-cardBg p-3 text-sm text-dark">{success}</p>}{error && <p role="alert">{error}</p>}
    <section className="rounded-card bg-white p-5"><h2 className="font-bold">Recent position changes</h2>{!snapshot.organizationLog.some(log => log.text.endsWith(`· ${scope}`)) && <p className="mt-2 text-sm text-textSecondary">No position changes recorded yet.</p>}<ul className="mt-3 space-y-3">{snapshot.organizationLog.filter(log => log.text.endsWith(`· ${scope}`)).slice(0, 8).map(log => <li key={log.id} className="border-l-2 border-soft pl-3 text-sm">{log.text}<p className="mt-1 text-xs text-textSecondary">{log.actor} · {dateTimeLabel(log.at)}</p></li>)}</ul></section>
    {(edit || nominate) && <SystemDialog title={edit ? `Assign position · ${edit.name}` : 'Nominate your successor'} busy={busy} onClose={() => { setEdit(null); setNominate(false); setError('') }}><form className="space-y-4" onSubmit={async event => {
      event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget))
      setBusy(true); setError('')
      try { if (edit) { await store.assignPosition(user, edit, values.position); setSuccess('Position updated. The member’s profile and navigation reflect their new position.') } else { await store.nominatePresident(user, values.successor); setSuccess('Nomination created. Your successor must accept from My Activity before the presidency transfers.') }; setEdit(null); setNominate(false); setError('') } catch (failure) { setError(failure.message) } finally { setBusy(false) }
    }}>
      <p className="text-sm leading-6 text-textSecondary">{edit ? `This assigns membership in ${scope === 'ACES' ? 'ACES administration' : `${scope} Council`}. The account gains the corresponding role. Returning a member to Student removes their organization access. President changes require a handover.` : 'You keep the presidency until your successor accepts. After acceptance, you become a Member. No administrator approval step is required.'}</p>
      {edit ? <ThemedSelect label="New position" name="position" defaultValue="Member" options={[...positions.filter(p => p !== 'President' && (user.position === 'President' || !['Vice President', 'Secretary'].includes(p))).map(p => ({ value: p, label: scope === 'ACES' ? `ACES ${p}` : p })), ...(edit.role === user.role ? [{ value: 'Student', label: 'Return to Student · remove organization role' }] : [])]} /> : <ThemedSelect label="Next President" name="successor" options={members.filter(person => person.id !== user.id).map(person => ({ value: person.id, label: `${person.name} · ${person.position}` }))} />}
      {error && <p role="alert" className="text-sm">{error}</p>}<button type="submit" disabled={busy} className={primaryButton}>{busy ? 'Saving…' : edit ? 'Save position' : 'Send nomination'}</button>
    </form></SystemDialog>}
  </PageLayout>
}
