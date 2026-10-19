import { Route, Routes } from 'react-router-dom'
import AuthProvider from './context/AuthContext.jsx'
import PortalProvider from './components/common/PortalProvider.jsx'
import Archive from './pages/student/Archive.jsx'
import Booking from './pages/student/Booking.jsx'
import NewsFeed from './pages/student/NewsFeed.jsx'
import Profile from './pages/student/Profile.jsx'
import CouncilRoutes from './pages/council/CouncilRoutes.jsx'
import AdminWorkspace from './pages/admin/AdminWorkspace.jsx'
import ViewerPage from './pages/public/ViewerPage.jsx'
import PortalState from './components/common/PortalState.jsx'
import PageLayout from './components/common/PageLayout.jsx'
import { frontendPreview } from './components/auth/frontend-preview.js'

// The standalone frontend uses the requested preview. Supplied integrations own all inputs.
export default function App(props) {
  const integration = Object.values(props).some(value => value !== undefined) ? props : frontendPreview
  return <PortalApp {...integration} />
}

function PortalApp({ session, loadSession, sessionKey, authActions, admin, council, viewer }) {
  return <AuthProvider session={session !== undefined ? session : council?.session} loadSession={loadSession ?? council?.loadSession} sessionKey={sessionKey ?? council?.sessionKey}>
    <PortalProvider authActions={authActions}>
    <Routes>
      <Route path="/" element={<ViewerPage {...viewer} />} />
      <Route path="/news-feed" element={<NewsFeed />} />
      <Route path="/booking" element={<Booking />} />
      <Route path="/archive" element={<Archive />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/admin/*" element={<AdminWorkspace {...admin} />} />
      <Route path="/council/*" element={<CouncilRoutes {...council} sharedSession />} />
      <Route path="*" element={<PageLayout><PortalState state="not-found" /></PageLayout>} />
    </Routes>
    </PortalProvider>
  </AuthProvider>
}
