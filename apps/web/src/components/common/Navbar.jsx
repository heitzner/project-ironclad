import { useState } from 'react'
import { ChevronDown, CircleUserRound } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import ironcladLogo from '../../assets/ironclad_lightmode.png'

const roleLinks = {
  student: [
    { label: 'News Feed', to: '/news-feed' },
    { label: 'Booking', to: '/booking' },
    { label: 'Archive', to: '/archive' },
  ],
  council: [],
  admin: [],
  public: [],
}

function Navbar({ role = 'public', user = null, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const links = roleLinks[role] ?? []
  const displayName = user?.name || 'Signed out'
  const program = user?.program

  return (
    <nav className="fixed inset-x-0 top-0 z-20 h-16 bg-navbar text-white shadow-nav" aria-label="Main navigation">
      <div className="mx-auto flex h-full max-w-content items-center justify-between px-8">
        <Link to="/" className="flex items-center gap-2 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img src={ironcladLogo} alt="IronClad" className="h-8 w-8 object-contain" />
          <span className="text-[15px] font-bold leading-[22px] tracking-[-0.375px]">IronClad</span>
          <span className="ml-1 rounded-full bg-navActive px-1 py-0.5 text-[10px] font-semibold uppercase leading-[14px] tracking-[0.5px] text-white">
            Portal
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {links.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `rounded-control px-4 py-[6px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? 'bg-navActive text-[13px] font-semibold leading-5 text-white'
                    : 'text-[15px] font-medium leading-[22px] text-navMuted hover:bg-navActive/40 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label="Open user menu"
            className="flex items-center gap-2 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-ring" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-navMuted ring-1 ring-ring" aria-hidden="true">
                <CircleUserRound className="h-6 w-6" />
              </span>
            )}
            <span className="flex flex-col text-left">
              <span className="text-[11px] font-semibold leading-[14px] tracking-[0.44px] text-white">{displayName}</span>
              {program && <span className="text-[10px] font-medium leading-[10px] tracking-[0.5px] text-navMuted">{program}</span>}
            </span>
            <ChevronDown aria-hidden="true" className="h-[7px] w-[7px] text-navMuted" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 min-w-36 rounded-control bg-white p-1 text-textPrimary shadow-card">
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="block rounded-control px-3 py-2 text-sm hover:bg-pageBg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={() => {
                  onSignOut?.()
                  setMenuOpen(false)
                }}
                disabled={!onSignOut}
                className="block w-full rounded-control px-3 py-2 text-left text-sm hover:bg-pageBg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
