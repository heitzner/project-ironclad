import { useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  CalendarDays,
  ChevronDown,
  DoorOpen,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from 'lucide-react'

const sections = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'bookings', label: 'Room Bookings', icon: DoorOpen },
  { id: 'events', label: 'Campus Events', icon: CalendarDays },
  { id: 'roles', label: 'User Management', icon: Users },
]

export default function AdminSidebar({ section, onNavigate }) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  const trigger = useRef(null)

  return (
    <aside onKeyDown={event => { if (event.key === 'Escape') { setMobileNavigationOpen(false); trigger.current?.focus() } }} className="min-w-0 rounded-panel border border-track bg-white p-3 shadow-card md:sticky md:top-20 md:min-h-[calc(100svh-6rem)]">
      <div className="mb-3 hidden items-center gap-2 border-b border-track px-3 pb-4 pt-2 text-xs font-semibold text-dark md:flex">
        <ShieldCheck aria-hidden="true" className="h-4 w-4" />
        Administration
      </div>
      <button
        ref={trigger}
        type="button"
        onClick={() => setMobileNavigationOpen((open) => !open)}
        aria-expanded={mobileNavigationOpen}
        aria-controls="admin-sidebar-links"
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-control px-3 text-sm font-semibold text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
      >
        <span>{sections.find((item) => item.id === section)?.label ?? 'Admin navigation'}</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 transition-transform ${mobileNavigationOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <nav aria-label="Admin navigation">
        <ul
          id="admin-sidebar-links"
          className={`${mobileNavigationOpen ? 'grid' : 'hidden'} grid-cols-1 gap-1 md:grid`}
        >
          {sections.map(({ id, label, icon: Icon }) => (
            <li key={id} className="min-w-0">
              <NavLink
                to={id === 'dashboard' ? '/admin' : `/admin/${id}`}
                end={id === 'dashboard'}
                onClick={event => { if (onNavigate) { event.preventDefault(); onNavigate(id) }; setMobileNavigationOpen(false) }}
                className={`flex min-h-11 w-full items-center justify-start gap-3 rounded-control px-3 py-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${section === id ? 'bg-dark text-white shadow-card' : 'text-textSecondary hover:bg-cardBg hover:text-dark'} disabled:cursor-default`}
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
