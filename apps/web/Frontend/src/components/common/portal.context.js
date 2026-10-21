import { canManageMembers } from '../../data/organization.js'
import { createContext, useContext } from 'react'

export const PortalContext = createContext(null)
export const usePortal = () => useContext(PortalContext)

export function roleDestination(user) {
  return ['student', 'admin', 'council'].includes(user?.role) ? '/news-feed' : '/'
}

export function portalNavigation(auth) {
  if (auth.status !== 'authenticated') return []
  const links = [{ label: 'News Feed', to: '/news-feed', end: true }, { label: 'Booking', to: '/booking' }, { label: 'Archive', to: '/archive' }]
  if (auth.user?.role === 'admin') links.push({ label: 'Rooms & Reservations', to: '/admin', end: true }, { label: 'Dashboard', to: '/admin/dashboard' })
  if (['admin', 'council'].includes(auth.user?.role)) links.push({ label: 'Council Applications', to: '/council/applications' })
  if (canManageMembers(auth.user)) links.push({ label: auth.user.role === 'admin' ? 'People & Roles' : 'Council Members', to: auth.user.role === 'admin' ? '/admin/people' : '/council/members' })
  return links
}
