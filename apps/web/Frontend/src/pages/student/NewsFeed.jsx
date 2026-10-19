import { useState } from 'react'
import PageLayout from '../../components/common/PageLayout'
import { useTestUser } from '../../components/common/test-auth.js'
import AdminDashboard from '../admin/adminDashbord.jsx'
import AdminBooking from '../admin/adminBooking.jsx'
import AdminEvents from '../admin/adminEvents.jsx'
import AdminRoles from '../admin/adminRoles.jsx'

const adminPages = { dashboard: AdminDashboard, bookings: AdminBooking, events: AdminEvents, roles: AdminRoles }

export default function NewsFeed() {
  const user = useTestUser()
  const [section, setSection] = useState('dashboard')
  if (user?.role === 'admin') {
    const AdminPage = adminPages[section] ?? AdminDashboard
    return <AdminPage user={user} onNavigate={setSection} />
  }
  return (
    <PageLayout role={user?.role ?? 'student'} user={user}>
      <section className="grid gap-3 rounded-card bg-white p-6 shadow-card">
        <h1 className="text-2xl font-bold">{user?.role === 'council' ? 'Council workspace' : 'Student portal'}</h1>
        {user ? <>
          <p className="text-sm text-textSecondary">Welcome, {user.name}.</p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="font-semibold">Student ID</dt><dd>{user.studentId}</dd></div>
            <div><dt className="font-semibold">Role</dt><dd className="capitalize">{user.role}</dd></div>
            <div><dt className="font-semibold">Section</dt><dd>{user.course ? `${user.course}-` : ''}{user.yearLevel}{user.section}</dd></div>
          </dl>
          <p className="text-xs leading-5 text-textMuted">Browser test session. Live portal data is not connected{user.role === 'council' ? '; council tools have not been implemented yet' : ''}.</p>
        </> : <p className="text-sm text-textSecondary">Sign in to access your portal account.</p>}
      </section>
    </PageLayout>
  )
}
