import { useState } from 'react'
import AdminDashboard from './AdminDashboard.jsx'
import BookingManagement from './BookingManagement.jsx'
import EventManagement from './EventManagement.jsx'
import UserManagement from './UserManagement.jsx'
import { useAdminWorkspace } from '../../hooks/useAdminWorkspace.js'

const adminPages = {
  dashboard: AdminDashboard,
  bookings: BookingManagement,
  events: EventManagement,
  roles: UserManagement,
}

// Page selection lives here; AdminShell supplies layout and AdminSidebar navigation.
export default function AdminWorkspace({ user }) {
  const [section, setSection] = useState('dashboard')
  const admin = useAdminWorkspace(user?.role === 'admin')
  const Page = adminPages[section] ?? AdminDashboard

  return <Page
    user={user}
    onNavigate={setSection}
    rooms={admin.data.rooms}
    bookings={admin.data.bookings}
    events={admin.data.events}
    venues={admin.data.rooms}
    members={admin.data.members}
    roles={admin.data.roles}
    loading={admin.loading}
    error={admin.error}
    onRetry={admin.refetch}
    onDecision={admin.onDecision}
    onSaveEvent={admin.onSaveEvent}
    onCompleteEvent={admin.onCompleteEvent}
    onSaveRole={admin.onSaveRole}
  />
}
