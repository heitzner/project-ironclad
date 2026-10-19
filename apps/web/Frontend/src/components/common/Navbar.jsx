import { useRef, useState } from 'react'
import { ChevronDown, CircleUserRound, Menu, X } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import ironcladLogo from '../../assets/ironclad_lightmode.png'
import LogIn from './LogIn.jsx'
import { signOutTestAccount, useTestUser } from './test-auth.js'

const roleLinks = {
  student: [
    { label: 'News Feed', to: '/news-feed' },
    { label: 'Booking', to: '/booking' },
    { label: 'Archive', to: '/archive' },
  ],
  council: [{ label: 'Council workspace', to: '/news-feed' }],
  admin: [{ label: 'Admin dashboard', to: '/news-feed' }],
  public: [],
}

function Navbar({ role: suppliedRole = 'public', user: suppliedUser = null, onSignOut }) {
  const testUser = useTestUser()
  const user = suppliedUser ?? testUser
  const role = user?.role ?? suppliedRole
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [navigationOpen, setNavigationOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const navigationTrigger = useRef(null)
  const userTrigger = useRef(null)
  const links = roleLinks[role] ?? []
  const displayName = user?.name || 'Signed out'
  const program = user?.testAccount ? `${role.toUpperCase()} · Test session` : user?.program

  return (
    <nav
      className="fixed inset-x-0 top-0 z-20 h-16 bg-navbar text-white shadow-nav"
      aria-label="Main navigation"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        if (navigationOpen) { setNavigationOpen(false); navigationTrigger.current?.focus() }
        if (menuOpen) { setMenuOpen(false); userTrigger.current?.focus() }
      }}
    >
      <div className="mx-auto flex h-full max-w-content items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img src={ironcladLogo} alt="IronClad" className="h-8 w-8 object-contain" />
          <span className="text-[15px] font-bold leading-5.5 tracking-[-0.375px]">IronClad</span>
          <span className="ml-1 hidden rounded-full bg-navActive px-1 py-0.5 text-[10px] font-semibold uppercase leading-3.5 tracking-[0.5px] text-white sm:inline">
            Portal
          </span>
        </Link>

        <div className="hidden items-center gap-4 md:flex">
          {links.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `rounded-control px-4 py-1.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? 'bg-navActive text-[13px] font-semibold leading-5 text-white'
                    : 'text-[15px] font-medium leading-5.5 text-navMuted hover:bg-navActive/40 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {links.length > 0 && (
            <button
              ref={navigationTrigger}
              type="button"
              aria-label={navigationOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={navigationOpen}
              aria-controls="student-mobile-navigation"
              onClick={() => { setNavigationOpen(open => !open); setMenuOpen(false) }}
              className="flex h-11 w-11 items-center justify-center rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            >
              {navigationOpen ? <X aria-hidden="true" className="h-6 w-6" /> : <Menu aria-hidden="true" className="h-6 w-6" />}
            </button>
          )}
          {!user ? (
            <button type="button" onClick={() => setLoginOpen(true)} className="min-h-11 rounded-control bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Sign in
            </button>
          ) : <div className="relative">
          <button
            ref={userTrigger}
            type="button"
            onClick={() => { setMenuOpen((open) => !open); setNavigationOpen(false) }}
            aria-expanded={menuOpen}
            aria-controls="student-user-menu"
            aria-label="Open user menu"
            className="flex min-h-11 items-center gap-2 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-ring" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-navMuted ring-1 ring-ring" aria-hidden="true">
                <CircleUserRound className="h-6 w-6" />
              </span>
            )}
            <span className="hidden flex-col text-left sm:flex">
              <span className="text-[11px] font-semibold leading-3.5 tracking-[0.44px] text-white">{displayName}</span>
              {program && <span className="text-[10px] font-medium leading-2.5 tracking-[0.5px] text-navMuted">{program}</span>}
            </span>
            <ChevronDown aria-hidden="true" className="h-1.75 w-1.75 text-navMuted" />
          </button>

          {menuOpen && (
            <div id="student-user-menu" className="absolute right-0 top-full mt-2 min-w-36 rounded-control bg-white p-1 text-textPrimary shadow-card">
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center rounded-control px-3 py-2 text-sm hover:bg-pageBg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (user?.testAccount) signOutTestAccount()
                  else onSignOut?.()
                  setMenuOpen(false)
                  navigate('/news-feed')
                }}
                disabled={!onSignOut && !user?.testAccount}
                className="block min-h-11 w-full rounded-control px-3 py-2 text-left text-sm hover:bg-pageBg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sign out
              </button>
            </div>
          )}
          </div>}
        </div>
      </div>
      {navigationOpen && (
        <div id="student-mobile-navigation" className="absolute inset-x-0 top-full grid gap-1 bg-navbar px-4 py-3 shadow-nav md:hidden">
          {links.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setNavigationOpen(false)}
              className={({ isActive }) => `flex min-h-11 items-center rounded-control px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? 'bg-navActive text-white' : 'text-navMuted hover:bg-navActive/40 hover:text-white'}`}
            >
              {label}
            </NavLink>
          ))}
        </div>
      )}
      {loginOpen && <LogIn onClose={() => setLoginOpen(false)} onSignedIn={() => { setLoginOpen(false); navigate('/news-feed') }} />}
    </nav>
  )
}

export default Navbar
