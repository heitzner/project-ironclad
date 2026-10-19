import Footer from './Footer.jsx'
import Navbar from './Navbar.jsx'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import { portalNavigation, usePortal } from './portal.context.js'

const pageTitles = {
  '/': 'Campus news',
  '/news-feed': 'Student portal',
  '/booking': 'Room booking',
  '/archive': 'Student archive',
  '/profile': 'Profile',
  '/admin': 'Admin dashboard',
  '/admin/dashboard': 'Admin dashboard',
  '/admin/bookings': 'Room bookings',
  '/admin/events': 'Campus events',
  '/admin/roles': 'Council roles',
  '/council': 'Council feed',
  '/council/apply': 'Council application',
  '/council/applications': 'Membership applications',
}

function PageLayout({ children, role = 'public', user = null, fullWidth = false, navigationLinks, homeTo, onSignOut }) {
  // Booking supplies its own main landmark and responsive content padding.
  const Content = fullWidth ? 'div' : 'main'
  const auth = useAuth()
  const portal = usePortal()
  const { pathname } = useLocation()
  // Keep the browser title aligned with the current role view after navigation.
  useEffect(() => {
    const route = pathname.replace(/\/+$/, '').toLowerCase() || '/'
    document.title = `${pageTitles[route] || 'Page not found'} · IronClad`
  }, [pathname])
  const shared = portal ? {
    role: auth.user?.role ?? 'public',
    user: auth.status === 'authenticated' ? auth.user : null,
    navigationLinks: portalNavigation(auth), homeTo: '/',
    onSignOut: auth.status === 'authenticated' && portal.authActions?.signOut ? async () => {
      const result = await portal.authActions.signOut()
      if (result?.signedOut === true && auth.refetch) await auth.refetch()
      return result
    } : undefined,
  } : { role, user, navigationLinks, homeTo, onSignOut }

  return (
    <div className="flex min-h-svh flex-col bg-pageBg">
      <a href="#portal-content" className="fixed left-3 top-3 z-50 -translate-y-24 rounded-control bg-white p-3 text-sm font-semibold text-dark focus:translate-y-0">Skip to content</a>
      <Navbar key={pathname} {...shared} />
      <Content id="portal-content" tabIndex={-1} className={fullWidth ? 'student-layout-booking flex flex-1 flex-col pt-16' : 'mx-auto flex w-full max-w-content flex-1 flex-col gap-4 px-4 pb-6 pt-[88px] sm:px-6 lg:px-8'}>
        {children}
      </Content>
      <Footer />
    </div>
  )
}

export default PageLayout
