import { Route, Routes } from 'react-router-dom'
import AuthProvider from './context/AuthContext.jsx'
import PortalProvider from './components/common/PortalProvider.jsx'
import ProtectedRoute from './components/common/ProtectedRoute.jsx'
import StudentProvider from './components/student/StudentProvider.jsx'
import AccountReset from './pages/auth/AccountReset.jsx'
import LoginModal from './pages/auth/LoginModal.jsx'
import Support from './pages/public/Support.jsx'
import AllEvents from './pages/student/AllEvents.jsx'
import Archive from './pages/student/Archive.jsx'
import Booking from './pages/student/Booking.jsx'
import NewsFeed from './pages/student/NewsFeed.jsx'
import Profile from './pages/student/Profile.jsx'
import CouncilRoutes from './pages/council/CouncilRoutes.jsx'
import AdminWorkspace from './pages/admin/AdminWorkspace.jsx'
import ViewerPage from './pages/public/ViewerPage.jsx'
import PortalState from './components/common/PortalState.jsx'
import PageLayout from './components/common/PageLayout.jsx'
import FrontendSystem from './components/common/FrontendSystem.jsx'

// The standalone frontend uses the requested preview. Supplied integrations own all inputs.
export default function App(props) {
  if (!Object.values(props).some(value => value !== undefined)) return <FrontendSystem />
  return <PortalApp {...props} />
}

function PortalApp({ session, loadSession, sessionKey, authActions, admin, council, viewer, student }) {
  return <AuthProvider session={session !== undefined ? session : council?.session} loadSession={loadSession ?? council?.loadSession} sessionKey={sessionKey ?? council?.sessionKey}>
    <PortalProvider authActions={authActions}>
      <StudentProvider value={student}>
        <Routes>
          <Route path="/" element={<ViewerPage {...viewer} />} />
          <Route path="/login" element={<LoginModal />} />
          <Route path="/account-reset" element={<AccountReset />} />
          <Route path="/news-feed" element={<NewsFeed />} />
          <Route path="/events" element={<ProtectedRoute roles={['student']}><AllEvents /></ProtectedRoute>} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/archive" element={<ProtectedRoute roles={['student']}><Archive /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin/*" element={<AdminWorkspace {...admin} />} />
          <Route path="/council/*" element={<CouncilRoutes {...council} sharedSession />} />
          <Route path="/support" element={<Support />} />
          <Route path="*" element={<PageLayout><PortalState state="not-found" /></PageLayout>} />
        </Routes>
      </StudentProvider>
    </PortalProvider>
  </AuthProvider>
}
