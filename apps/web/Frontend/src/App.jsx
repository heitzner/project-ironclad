import { Navigate, Route, Routes } from 'react-router-dom'
import AuthProvider from './context/AuthContext.jsx'
import ProtectedRoute from './components/common/ProtectedRoute.jsx'
import AccountReset from './pages/auth/AccountReset.jsx'
import LoginModal from './pages/auth/LoginModal.jsx'
import NotFound from './pages/public/NotFound.jsx'
import Support from './pages/public/Support.jsx'
import AllEvents from './pages/student/AllEvents.jsx'
import Archive from './pages/student/Archive.jsx'
import Booking from './pages/student/Booking.jsx'
import NewsFeed from './pages/student/NewsFeed.jsx'
import Profile from './pages/student/Profile.jsx'

// BrowserRouter lives in main.jsx; this only declares routes.
export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/news-feed" replace />} />

        {/* Auth routes */}
        <Route path="/login" element={<LoginModal />} />
        <Route path="/account-reset" element={<AccountReset />} />

        {/* Student routes (gate is a pass-through until auth is connected) */}
        <Route path="/news-feed" element={<ProtectedRoute><NewsFeed /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><AllEvents /></ProtectedRoute>} />
        <Route path="/booking" element={<ProtectedRoute><Booking /></ProtectedRoute>} />
        <Route path="/archive" element={<ProtectedRoute><Archive /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Public routes */}
        <Route path="/support" element={<Support />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
