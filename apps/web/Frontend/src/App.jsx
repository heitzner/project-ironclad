import { Navigate, Route, Routes } from 'react-router-dom'
import Archive from './pages/student/Archive.jsx'
import Booking from './pages/student/Booking.jsx'
import NewsFeed from './pages/student/NewsFeed.jsx'
import Profile from './pages/student/Profile.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/news-feed" replace />} />
      <Route path="/news-feed" element={<NewsFeed />} />
      <Route path="/booking" element={<Booking />} />
      <Route path="/archive" element={<Archive />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  )
}
