import useAuth from '../../hooks/useAuth.js'
import PageLayout from './PageLayout.jsx'
import PortalState from './PortalState.jsx'

export default function ProtectedRoute({ children, roles }) {
  const auth = useAuth()
  if (auth.status !== 'authenticated') return <PageLayout><PortalState /></PageLayout>
  if (auth.user?.disabled === true || (roles && !roles.includes(auth.user?.role))) {
    return <PageLayout><PortalState state="forbidden" /></PageLayout>
  }
  return children
}
