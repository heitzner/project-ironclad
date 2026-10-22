import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import AuthProvider from '../../context/AuthContext.jsx'
import useAuth from '../../hooks/useAuth.js'
import PageLayout from '../../components/common/PageLayout.jsx'
import CouncilViewState from '../../components/council/CouncilViewState.jsx'
import { councilShell } from '../../components/council/councilShell.model.js'
import CouncilFeedPage from './CouncilFeedPage.jsx'
import CouncilApplicationPage from './CouncilApplicationPage.jsx'
import CouncilApplicationsPage from './CouncilApplicationsPage.jsx'

// The integration host supplies actual session/service adapters, never endpoint guesses.
export default function CouncilRoutes({ session, loadSession, sessionKey, sharedSession = false, ...integration }) {
  if (sharedSession) return <CouncilShell {...integration} />
  return <AuthProvider session={session} loadSession={loadSession} sessionKey={sessionKey}>
    <CouncilShell {...integration} />
  </AuthProvider>
}

function CouncilShell({ service, postConstraints, onAddPost, onApply, onViewVenue, onRegisterIndividual, onRegisterTeam, onSignOut }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // Reset open shared menus on route/identity/permission changes without remounting drafts on refresh.
  const shellKey = JSON.stringify([pathname, auth.status, auth.user?.id, auth.user?.role, auth.capabilities])
  return <PageLayout key={shellKey} {...councilShell(auth)} onSignOut={auth.status === 'authenticated' ? onSignOut : undefined}>
    <Routes>
      <Route index element={<CouncilFeedPage service={service} postConstraints={postConstraints} onAddPost={onAddPost} onApply={onApply} onViewVenue={onViewVenue} onRegisterIndividual={onRegisterIndividual} onRegisterTeam={onRegisterTeam} />} />
      <Route path="apply" element={<CouncilAccess capability="canApply"><CouncilApplicationPage service={service} onReturn={() => navigate('/council')} /></CouncilAccess>} />
      <Route path="applications" element={<CouncilAccess capability="canReviewApplications"><CouncilApplicationsPage service={service} /></CouncilAccess>} />
      <Route path="*" element={<>
        <CouncilViewState state="empty" title="Council page not found" description="Choose Council to return to the feed." />
        <Link to="/council" className="flex min-h-11 items-center self-start rounded-control px-3 text-sm font-semibold text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Return to Council</Link>
      </>} />
    </Routes>
  </PageLayout>
}

function CouncilAccess({ capability, children }) {
  const auth = useAuth()
  if (auth.status !== 'authenticated') return <CouncilViewState state={auth.loading ? 'loading' : auth.status} onRetry={auth.refetch} />
  if (auth.capabilities[capability] !== true || (capability === 'canReviewApplications' && auth.user?.role !== 'council')) return <CouncilViewState state="forbidden" />
  return children
}
