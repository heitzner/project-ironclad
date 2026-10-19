import { Navigate, Route, Routes } from 'react-router-dom'
import Archive from './pages/student/Archive.jsx'
import Booking from './pages/student/Booking.jsx'
import NewsFeed from './pages/student/NewsFeed.jsx'
import Profile from './pages/student/Profile.jsx'
import CouncilRoutes from './pages/council/CouncilRoutes.jsx'

export default function App({ council }) {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/news-feed" replace />} />
      <Route path="/news-feed" element={<NewsFeed />} />
      <Route path="/booking" element={<Booking />} />
      <Route path="/archive" element={<Archive />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/council/*" element={<CouncilRoutes {...council} />} />
    </Routes>
  )
}
