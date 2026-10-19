import { useState } from 'react'
import AdminDashboard from './AdminDashboard.jsx'
import BookingManagement from './BookingManagement.jsx'
import EventManagement from './EventManagement.jsx'
import UserManagement from './UserManagement.jsx'

const adminPages = {
  dashboard: AdminDashboard,
  bookings: BookingManagement,
  events: EventManagement,
  roles: UserManagement,
}

// Page selection lives here; AdminShell supplies layout and AdminSidebar navigation.
export default function AdminWorkspace({ user }) {
  const [section, setSection] = useState('dashboard')
  const Page = adminPages[section] ?? AdminDashboard

  return <Page user={user} onNavigate={setSection} />
}
