import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Megaphone, Plus, Users } from 'lucide-react'
import PageLayout from './PageLayout.jsx'
import PageHeader, { StatusBadge } from './PageHeader.jsx'
import SearchBar from './SearchBar.jsx'
import EventCard from './EventCard.jsx'
import SystemDialog from './SystemDialog.jsx'
import SystemPostForm from './SystemPostForm.jsx'
import SystemRegistration from './SystemRegistration.jsx'
import { usePortal } from './portal.context.js'
import { canManage, postKinds } from '../../data/frontend-system.js'
import { dateTimeLabel, primaryButton, secondaryButton } from './system-ui.js'
import badminton from '../../features/student-booking/assets/d768e.png'
import esports from '../council/assets/5d2d9.png'

const images = { badminton, esports }

export default function SystemFeed({ store, snapshot, user }) {
  const portal = usePortal()
  const [params, setParams] = useSearchParams()
  const kind = params.get('kind') || ''
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer) }, [])
  const posts = snapshot.posts.filter(post => post.status === 'published' && (!kind || post.kind === kind)
    && `${post.title} ${post.description} ${post.organizer} ${post.venue}`.toLowerCase().includes(query.trim().toLowerCase()))
  const changeKind = value => setParams(value ? { kind: value } : {})
  const act = post => { if (!user) portal.openLogin(); else setDialog({ type: 'register', post }) }
  return <PageLayout>
    <PageHeader icon={Megaphone} title="Campus News Feed & Announcements" subtitle="Explore campus initiatives, announcements, events, and council opportunities.">
      <StatusBadge variant="green">{snapshot.posts.filter(p => p.kind === 'event' && Date.parse(p.startsAt) > now).length} Active Events</StatusBadge>
      {canManage(user) && <button type="button" onClick={() => setDialog({ type: 'create' })} className={primaryButton}><Plus size={16} aria-hidden="true" />Create post</button>}
    </PageHeader>
    <SearchBar query={query} onQueryChange={setQuery} category={kind} onCategoryChange={changeKind} categories={Object.entries(postKinds).map(([value, label]) => ({ value, label }))} categoryLabel="Filter news type" allCategoriesLabel="All news" actionLabel="View More Events" onAction={() => changeKind('event')} />
    <p role="status" className="text-xs text-textSecondary">{posts.length} {posts.length === 1 ? 'post' : 'posts'} shown</p>
    {!posts.length ? <div className="rounded-panel bg-white p-8 text-center"><h2 className="font-semibold">No posts match your filters</h2><p className="mt-2 text-sm text-textSecondary">Try another search or show all news.</p><button type="button" onClick={() => { changeKind(''); setQuery('') }} className={`${secondaryButton} mt-4`}>Clear filters</button></div> : <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {posts.map(post => {
        const records = post.kind === 'council' ? snapshot.applications : snapshot.registrations
        const mine = records.find(record => record.postId === post.id && record.userId === user?.id)
        const closed = Date.parse(post.startsAt) <= now
        const eligible = post.kind !== 'council' || !user || (user.role === 'student' && user.course === post.program)
        const event = {
          ...post, imageUrl: images[post.imageKey], imagePosition: post.imageKey === 'badminton' ? '50% 28.4%' : '50% 21.4%', schedule: dateTimeLabel(post.startsAt),
          status: post.kind === 'event' ? 'Open registration' : post.kind === 'council' ? 'Council recruitment' : 'Campus announcement',
          tags: [post.kind === 'event' ? post.registrationKind === 'team' ? 'Team event' : 'Sports' : post.kind === 'council' ? post.program : 'CSD', postKinds[post.kind]],
          registered: post.kind === 'announcement' ? undefined : records.filter(r => r.postId === post.id && r.status !== 'declined').length,
          capacity: post.kind === 'announcement' ? undefined : post.capacity,
          metricLabel: post.kind === 'council' ? 'Applications' : post.registrationKind === 'team' ? 'Registered teams' : 'Participant slots',
          unitLabel: post.kind === 'council' ? 'Submitted' : post.registrationKind === 'team' ? 'Teams' : 'Registered',
          actionLabel: mine ? (post.kind === 'event' ? 'Registered' : 'Application submitted') : closed ? 'Registration closed' : !eligible ? `${post.program} students only` : post.kind === 'council' ? 'Apply for council' : post.registrationKind === 'team' ? 'Register team' : 'Register',
          registrationDisabled: Boolean(mine) || closed || !eligible,
          announcement: post.kind === 'announcement',
        }
        return <div key={post.id} className="flex min-w-0 flex-col rounded-card bg-cardBg">
          <EventCard event={event} onViewVenue={() => setDialog({ type: 'details', post })} onRegister={() => act(post)} />
          {canManage(user) && post.kind === 'event' && <div className="px-4 pb-4"><button type="button" onClick={() => setDialog({ type: 'records', post })} className={`${secondaryButton} w-full`}><Users size={16} aria-hidden="true" />View registrations · {snapshot.registrations.filter(r => r.postId === post.id).length}</button></div>}
        </div>
      })}
    </div>}
    {dialog?.type === 'create' && <SystemPostForm store={store} user={user} onClose={() => setDialog(null)} />}
    {dialog?.type === 'register' && <SystemRegistration post={dialog.post} user={user} store={store} onClose={() => setDialog(null)} />}
    {dialog?.type === 'details' && <SystemDialog title={dialog.post.title} onClose={() => setDialog(null)}>
      <div className="space-y-4 text-sm leading-6"><p className="whitespace-pre-wrap">{dialog.post.description}</p><dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-panel bg-cardBg p-4"><dt className="font-semibold">Venue</dt><dd>{dialog.post.venue}</dd><dt className="font-semibold">Starts</dt><dd>{dateTimeLabel(dialog.post.startsAt)}</dd><dt className="font-semibold">Ends</dt><dd>{dateTimeLabel(dialog.post.endsAt)}</dd><dt className="font-semibold">Organizer</dt><dd>{dialog.post.organizer}</dd></dl>
        {dialog.post.kind !== 'announcement' && <button type="button" className={primaryButton} onClick={() => { const post = dialog.post; setDialog(null); act(post) }}>{user ? dialog.post.kind === 'council' ? 'Apply for council' : 'Register' : 'Log in or sign up to register'}</button>}
      </div>
    </SystemDialog>}
    {dialog?.type === 'records' && <SystemDialog title={`${dialog.post.title} · Registrations`} onClose={() => setDialog(null)} wide>
      <div className="space-y-3"><p className="text-sm text-textSecondary">Registrations are confirmed immediately. No approval is required.</p>{snapshot.registrations.filter(r => r.postId === dialog.post.id).length === 0 && <p className="rounded-panel bg-cardBg p-5">No registrations yet.</p>}
        {snapshot.registrations.filter(r => r.postId === dialog.post.id).map(record => <article key={record.id} className="rounded-panel border border-track p-4 text-sm"><h3 className="font-bold">{record.details.teamName || record.name}</h3><p>{record.name} · {record.studentId} · {record.program}</p><p>{record.details.contact}</p>{record.details.category && <p>Category: {record.details.category}</p>}{record.details.members && <ul className="mt-3 space-y-1">{record.details.members.map(member => <li key={member.studentId}>{member.name} · {member.studentId}</li>)}</ul>}<p className="mt-3 text-xs text-textSecondary">Registered {dateTimeLabel(record.createdAt)}</p></article>)}
      </div>
    </SystemDialog>}
  </PageLayout>
}
