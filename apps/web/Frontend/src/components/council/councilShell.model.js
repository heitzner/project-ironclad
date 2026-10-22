// Shell labels adapt actual session fields; navigation never grants a capability.
export function councilShell(auth) {
  const current = auth.status === 'authenticated' ? auth.user : null
  const role = ['student', 'council', 'admin', 'public'].includes(current?.role) ? current.role : 'public'
  const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : undefined
  const user = current ? {
    name: text(current.name),
    program: text(current.program?.label) ?? text(current.program),
    avatarUrl: text(current.avatarUrl),
  } : null
  const navigationLinks = role === 'student' ? [
    { label: 'News Feed', to: '/news-feed' },
    { label: 'Booking', to: '/booking' },
    { label: 'Archive', to: '/archive' },
  ] : []
  navigationLinks.push({ label: 'Council', to: '/council', end: true })
  if (current && auth.capabilities.canApply === true) navigationLinks.push({ label: 'My application', to: '/council/apply', end: true })
  if (current?.role === 'council' && auth.capabilities.canReviewApplications === true) navigationLinks.push({ label: 'Applications', to: '/council/applications', end: true })
  return { role, user, navigationLinks, homeTo: role === 'student' ? '/' : '/council' }
}
