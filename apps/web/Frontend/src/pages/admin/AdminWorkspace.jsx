import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import PageLayout from '../../components/common/PageLayout.jsx'
import PortalState from '../../components/common/PortalState.jsx'
import { isAdmin } from '../../components/admin/admin.logic.js'
import { AdminMutationContext, createMutationRegistry } from '../../components/admin/adminMutation.model.js'
import { adminResource } from '../../components/admin/adminResource.model.js'
import AdminDashboard from './AdminDashboard.jsx'
import BookingManagement from './BookingManagement.jsx'
import EventManagement from './EventManagement.jsx'
import UserManagement from './UserManagement.jsx'

// A host supplies each section's resource state and supported mutation callbacks.
export default function AdminWorkspace({ dashboard, bookings, events, roles }) {
  const auth = useAuth()
  const [registry] = useState(createMutationRegistry)
  if (auth.status !== 'authenticated') return <PageLayout><PortalState /></PageLayout>
  if (!isAdmin(auth.user)) return <PageLayout><PortalState state="forbidden" /></PageLayout>
  return <AdminMutationContext.Provider value={registry}>
    <Routes>
      <Route index element={<AdminDashboard {...adminResource(dashboard, ['rooms', 'bookings', 'events'])} user={auth.user} />} />
      <Route path="dashboard" element={<Navigate to="/admin" replace />} />
      <Route path="bookings" element={<BookingManagement {...adminResource(bookings, ['rooms', 'bookings'])} user={auth.user} />} />
      <Route path="events" element={<EventManagement {...adminResource(events, ['events', 'venues'])} user={auth.user} />} />
      <Route path="roles" element={<UserManagement {...adminResource(roles, ['members', 'roles'])} user={auth.user} />} />
      <Route path="*" element={<PageLayout><PortalState state="not-found" /></PageLayout>} />
    </Routes>
  </AdminMutationContext.Provider>
}
