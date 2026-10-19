import { useEffect, useState } from 'react'
import AdminDashboard from '../../pages/admin/adminDashbord.jsx'
import AdminBooking from '../../pages/admin/adminBooking.jsx'
import AdminEvents from '../../pages/admin/adminEvents.jsx'
import AdminRoles from '../../pages/admin/adminRoles.jsx'

const pages = { dashboard: AdminDashboard, bookings: AdminBooking, events: AdminEvents, roles: AdminRoles }
function currentPage() { return Object.hasOwn(pages, window.location.hash.slice(1)) ? window.location.hash.slice(1) : 'dashboard' }

// This separate entry is an explicit design preview, not an authenticated route.
export default function AdminPreview() {
  const [section, setSection] = useState(currentPage)
  const [state, setState] = useState('disconnected')
  useEffect(() => {
    const update = () => setSection(currentPage())
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  useEffect(() => { document.title = `${section[0].toUpperCase()}${section.slice(1)} · IronClad Admin Preview` }, [section])
  const Page = pages[section]
  const controls = <label className="flex flex-wrap items-center gap-2 rounded-control bg-white px-3 py-2 text-[10px] font-medium text-textSecondary">Preview state<select className="min-w-0 rounded-control bg-pageBg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" value={state} onChange={event => setState(event.target.value)}><option value="disconnected">Service not connected</option><option value="loading">Loading</option><option value="error">Load error / Retry</option><option value="access">Signed out / access gate</option></select></label>
  return <Page key={`${section}-${state}`} preview={state !== 'access'} previewControls={controls} onNavigate={next => { window.location.hash = next }} loading={state === 'loading'} error={state === 'error' ? 'Preview error' : undefined} onRetry={state === 'error' ? () => setState('disconnected') : undefined} />
}

