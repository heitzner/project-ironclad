import { useEffect, useState } from 'react'
import { CalendarDays, ChevronDown, Clock3, DoorOpen, LayoutDashboard, ShieldCheck, Users } from 'lucide-react'
import PageLayout from '../common/PageLayout.jsx'
import PageHeader from '../common/PageHeader.jsx'
import { isAdmin } from './admin.logic.js'
import './admin.css'

const sections = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'bookings', label: 'Room Bookings', icon: DoorOpen },
  { id: 'events', label: 'Campus Events', icon: CalendarDays },
  { id: 'roles', label: 'User Management', icon: Users },
]

export default function AdminShell({ section, title, subtitle, user = null, preview = false, onNavigate, previewControls, children }) {
  const [now, setNow] = useState(() => new Date())
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])
  const allowed = isAdmin(user)
  return <PageLayout role="admin" user={user} fullWidth>
    <div className="admin-workspace grid w-full min-w-0 flex-1 grid-cols-1 content-start items-start gap-3 p-3 md:grid-cols-[clamp(12rem,16vw,15rem)_minmax(0,1fr)] md:gap-4 md:p-4">
      <aside className="min-w-0 rounded-panel border border-track bg-white p-3 shadow-card md:sticky md:top-20 md:min-h-[calc(100svh_-_6rem)]">
        <div className="mb-3 hidden items-center gap-2 border-b border-track px-3 pb-4 pt-2 text-xs font-semibold text-dark md:flex"><ShieldCheck aria-hidden="true" className="h-4 w-4" />Administration</div>
        <button type="button" onClick={() => setMobileNavigationOpen(open => !open)} aria-expanded={mobileNavigationOpen} aria-controls="admin-sidebar-links" className="flex min-h-11 w-full items-center justify-between gap-3 rounded-control px-3 text-sm font-semibold text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden">
          <span>{sections.find(item => item.id === section)?.label ?? 'Admin navigation'}</span><ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${mobileNavigationOpen ? 'rotate-180' : ''}`} />
        </button>
      <nav aria-label="Admin navigation">
        <ul id="admin-sidebar-links" className={`${mobileNavigationOpen ? 'grid' : 'hidden'} grid-cols-1 gap-1 md:grid`}>
          {sections.map(({ id, label, icon: Icon }) => <li key={id} className="min-w-0">
            <button type="button" onClick={() => { onNavigate?.(id); setMobileNavigationOpen(false) }} disabled={!onNavigate} aria-current={section === id ? 'page' : undefined}
              className={`flex min-h-11 w-full items-center justify-start gap-3 rounded-control px-3 py-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${section === id ? 'bg-primary text-white shadow-card' : 'text-textSecondary hover:bg-cardBg hover:text-dark'} disabled:cursor-default`}>
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />{label}
            </button>
          </li>)}
        </ul>
      </nav>
      </aside>
      <main className="flex min-h-[calc(100svh_-_6rem)] min-w-0 flex-col gap-3">
        <PageHeader icon={ShieldCheck} title={title} subtitle={subtitle || 'Manage campus facilities, bookings, events, and account roles.'} />
        {previewControls}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-textSecondary">
          <span className="flex items-center gap-1.5 rounded-full bg-cardBg px-3 py-1 font-medium text-dark"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />{preview ? 'Design preview · No live accounts or records' : 'Administrator workspace'}</span>
          <time dateTime={now.toISOString()} className="flex items-center gap-1.5"><Clock3 aria-hidden="true" className="h-3.5 w-3.5" />{now.toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })}</time>
        </div>
        {preview || allowed ? children : <section className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-panel border border-track bg-white p-6 text-center shadow-card" role="status"><ShieldCheck aria-hidden="true" className="h-8 w-8 text-dark" /><h2 className="text-lg font-semibold">{user ? 'Access denied' : 'Administrator sign-in required'}</h2><p className="max-w-md text-sm leading-6 text-textSecondary">{user ? 'This account does not have administrator access.' : 'Sign in with an administrator account to continue.'}</p></section>}
      </main>
    </div>
  </PageLayout>
}
