import { useEffect, useState } from 'react'
import { CalendarDays, Clock3, DoorOpen, LayoutDashboard, ShieldCheck, Users } from 'lucide-react'
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
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])
  const allowed = isAdmin(user)
  return <PageLayout role="admin" user={user} fullWidth>
    <div className="admin-workspace mx-auto flex w-full max-w-content flex-1 flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <nav aria-label="Admin navigation" className="rounded-panel border border-track bg-white p-1.5 shadow-card">
        <ul className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap">
          {sections.map(({ id, label, icon: Icon }) => <li key={id} className="min-w-0 sm:flex-1">
            <button type="button" onClick={() => onNavigate?.(id)} disabled={!onNavigate} aria-current={section === id ? 'page' : undefined}
              className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-control px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${section === id ? 'bg-primary text-white shadow-card' : 'text-textSecondary hover:bg-cardBg hover:text-dark'} disabled:cursor-default`}>
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />{label}
            </button>
          </li>)}
        </ul>
      </nav>
      <main className="flex min-w-0 flex-1 flex-col gap-4">
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
