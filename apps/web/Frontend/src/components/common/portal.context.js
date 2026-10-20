import { createContext, useContext } from 'react'

export const PortalContext = createContext(null)
export const usePortal = () => useContext(PortalContext)

export function roleDestination(user) {
  return ['student', 'admin', 'council'].includes(user?.role) ? '/news-feed' : '/'
}

export function portalNavigation(auth) {
  if (auth.status !== 'authenticated') return []
  const links = [{ label: 'News Feed', to: '/news-feed', end: true }, { label: 'Booking', to: '/booking' }, { label: 'Archive', to: '/archive' }]
  if (auth.user?.role === 'admin') links.push({ label: 'Rooms & Reservations', to: '/admin' })
  if (['admin', 'council'].includes(auth.user?.role)) links.push({ label: 'Council Applications', to: '/council/applications' })
  return links
}
