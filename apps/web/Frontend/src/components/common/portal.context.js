import { createContext, useContext } from 'react'

export const PortalContext = createContext(null)
export const usePortal = () => useContext(PortalContext)

export function roleDestination(user) {
  return user?.role === 'admin' ? '/admin' : user?.role === 'council' ? '/council' : user?.role === 'student' ? '/news-feed' : '/'
}

export function portalNavigation(auth) {
  if (auth.status !== 'authenticated') return []
  const links = [{ label: 'Campus news', to: '/', end: true }]
  if (auth.user?.role === 'admin') links.push({ label: 'Administration', to: '/admin' })
  if (auth.user?.role === 'student') links.push(
    { label: 'News Feed', to: '/news-feed', end: true },
    { label: 'Events', to: '/events' },
    { label: 'Booking', to: '/booking' },
    { label: 'Archive', to: '/archive' },
  )
  if (auth.user?.role === 'council' || auth.capabilities?.canApply === true || auth.capabilities?.canCreatePost === true) links.push({ label: 'Council', to: '/council', end: true })
  if (auth.capabilities?.canApply === true) links.push({ label: 'My application', to: '/council/apply' })
  if (auth.user?.role === 'council' && auth.capabilities?.canReviewApplications === true) links.push({ label: 'Applications', to: '/council/applications' })
  return links
}
