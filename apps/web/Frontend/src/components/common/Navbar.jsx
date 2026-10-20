import { useRef, useState } from 'react'
import { ChevronDown, CircleUserRound, Menu, X } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import ironcladLogo from '../../assets/ironclad_lightmode.png'
import viewerLogo from '../public/assets/viewer-logo.png'
import { usePortal, roleDestination } from './portal.context.js'

const roleLinks = {
  student: [
    { label: 'News Feed', to: '/news-feed' },
    { label: 'Events', to: '/events' },
    { label: 'Booking', to: '/booking' },
    { label: 'Archive', to: '/archive' },
  ],
  council: [{ label: 'Council workspace', to: '/council' }],
  admin: [{ label: 'Admin dashboard', to: '/admin' }],
  public: [],
}

function Navbar({ role: suppliedRole = 'public', user: suppliedUser = null, onSignOut, navigationLinks, homeTo = '/' }) {
  const portal = usePortal()
  const customNavigation = navigationLinks !== undefined
  // Council supplies its own session and capability-based links, including when signed out.
  const user = suppliedUser
  const role = customNavigation ? suppliedRole : user?.role ?? suppliedRole
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [navigationOpen, setNavigationOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const signOutGuard = useRef(false)
  const navigationTrigger = useRef(null)
  const userTrigger = useRef(null)
  const links = navigationLinks ?? roleLinks[role] ?? []
  // The expanded Student menu needs the wide breakpoint to keep the shared header usable.
  const wideNavigation = customNavigation && links.length > 5
  const displayName = user ? typeof user.name === 'string' && user.name.trim() ? user.name : 'Signed in' : 'Signed out'
  const program = typeof user?.program === 'string' ? user.program : typeof user?.program?.label === 'string' ? user.program.label : undefined

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
        <Link to={homeTo} className="flex shrink-0 items-center gap-2 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img src={user ? ironcladLogo : viewerLogo} alt="IronClad" className="h-8 w-8 object-contain" />
          <span className="text-[15px] font-bold leading-[22px] tracking-[-0.375px]">IronClad</span>
          <span className="ml-1 hidden rounded-full bg-navActive px-1 py-0.5 text-[10px] font-semibold uppercase leading-[14px] tracking-[0.5px] text-white sm:inline">
            {user?.testAccount ? 'Preview' : user ? 'Portal' : 'Viewer'}
          </span>
        </Link>

        <div className={customNavigation ? `hidden items-center gap-1 ${wideNavigation ? 'xl:flex' : 'lg:flex'}` : 'hidden items-center gap-4 md:flex'}>
          {links.map(({ label, to, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `${customNavigation ? 'flex min-h-11 items-center px-3' : 'px-4'} rounded-control py-[6px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? 'bg-navActive text-[13px] font-semibold leading-5 text-white'
                    : `${customNavigation ? 'text-[13px] leading-5' : 'text-[15px] leading-[22px]'} font-medium text-navMuted hover:bg-navActive/40 hover:text-white`
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
              className={`flex h-11 w-11 items-center justify-center rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${customNavigation ? (wideNavigation ? 'xl:hidden' : 'lg:hidden') : 'md:hidden'}`}
            >
              {navigationOpen ? <X aria-hidden="true" className="h-6 w-6" /> : <Menu aria-hidden="true" className="h-6 w-6" />}
            </button>
          )}
          {!user ? (
            <button
              type="button"
              onClick={() => portal?.openLogin()}
              disabled={!portal}
              className="min-h-11 rounded-control border-2 border-cardBg px-4 py-2 text-sm font-semibold text-white hover:bg-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Log in
            </button>
          ) : (
          <div className="relative">
          <button
            ref={userTrigger}
            type="button"
            onClick={() => { setMenuOpen((open) => !open); setNavigationOpen(false) }}
            aria-expanded={menuOpen}
            aria-controls="student-user-menu"
            aria-label="Open user menu"
            className="flex min-h-11 items-center gap-2 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {typeof user?.avatarUrl === 'string' && user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-ring" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-navMuted ring-1 ring-ring" aria-hidden="true">
                <CircleUserRound className="h-6 w-6" />
              </span>
            )}
            <span className={`hidden flex-col text-left sm:flex ${customNavigation ? 'max-w-28' : ''}`}>
              <span className={`text-[11px] font-semibold leading-[14px] tracking-[0.44px] text-white ${customNavigation ? 'truncate' : ''}`} title={customNavigation ? displayName : undefined}>{displayName}</span>
              {program && <span className={`text-[10px] font-medium tracking-[0.5px] text-navMuted ${customNavigation ? 'truncate leading-[14px]' : 'leading-[10px]'}`} title={customNavigation ? program : undefined}>{program}</span>}
            </span>
            <ChevronDown aria-hidden="true" className="h-[7px] w-[7px] text-navMuted" />
          </button>

          {menuOpen && (
            <div id="student-user-menu" className="absolute right-0 top-full mt-2 min-w-36 rounded-control bg-white p-1 text-textPrimary shadow-card">
              <Link
                to={roleDestination({ role })}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center rounded-control px-3 py-2 text-sm hover:bg-pageBg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >My workspace</Link>
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center rounded-control px-3 py-2 text-sm hover:bg-pageBg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={async () => {
                  if (signOutGuard.current || !onSignOut) return
                  signOutGuard.current = true
                  setSigningOut(true)
                  setSignOutError('')
                  try {
                    const result = await onSignOut()
                    if (result?.signedOut !== true) throw new Error('Sign-out has not been confirmed. Try again.')
                    setMenuOpen(false)
                    navigate('/')
                  } catch (error) {
                    setSignOutError(error?.message || 'Unable to sign out. Try again.')
                  } finally {
                    signOutGuard.current = false
                    setSigningOut(false)
                  }
                }}
                disabled={!onSignOut || signingOut}
                className="block min-h-11 w-full rounded-control px-3 py-2 text-left text-sm hover:bg-pageBg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
              {!onSignOut && <p className="max-w-60 p-3 text-xs leading-5 text-textSecondary">Sign-out is not connected yet.</p>}
              {signOutError && <p role="alert" className="max-w-60 p-3 text-xs leading-5 text-textPrimary">{signOutError}</p>}
            </div>
          )}
          </div>
          )}
        </div>
      </div>
      {navigationOpen && (
        <div id="student-mobile-navigation" className={`absolute inset-x-0 top-full grid max-h-[calc(100svh-64px)] gap-1 overflow-y-auto bg-navbar px-4 py-3 shadow-nav ${customNavigation ? (wideNavigation ? 'xl:hidden' : 'lg:hidden') : 'md:hidden'}`}>
          {links.map(({ label, to, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setNavigationOpen(false)}
              className={({ isActive }) => `flex min-h-11 items-center rounded-control px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? 'bg-navActive text-white' : 'text-navMuted hover:bg-navActive/40 hover:text-white'}`}
            >
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}

export default Navbar
