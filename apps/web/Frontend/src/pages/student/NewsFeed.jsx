import PageLayout from '../../components/common/PageLayout'
import { Navigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import PortalState from '../../components/common/PortalState.jsx'

export default function NewsFeed() {
  const auth = useAuth()
  const user = auth.user
  if (auth.status === 'authenticated' && user?.role === 'admin') return <Navigate to="/admin" replace />
  if (auth.status === 'authenticated' && user?.role === 'council') return <Navigate to="/council" replace />
  if (auth.status !== 'authenticated') return <PageLayout><PortalState /></PageLayout>
  if (user?.role !== 'student') return <PageLayout><PortalState state="forbidden" /></PageLayout>
  const label = value => ['string', 'number'].includes(typeof value) ? value : 'Not provided'
  return (
    <PageLayout role={user?.role ?? 'student'} user={user}>
      <section className="grid gap-3 rounded-card bg-white p-6 shadow-card">
        <h1 className="text-2xl font-bold">
          {user?.role === 'council' ? 'Council workspace' : 'Student portal'}
        </h1>
        {user ? (
          <>
            <p className="text-sm text-textSecondary">Welcome, {label(user.name)}.</p>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold">Student ID</dt>
                <dd>{label(user.studentId)}</dd>
              </div>
              <div>
                <dt className="font-semibold">Role</dt>
                <dd className="capitalize">{label(user.role)}</dd>
              </div>
              <div>
                <dt className="font-semibold">Section</dt>
                <dd>
                  {user.course ? `${user.course}-` : ''}
                  {user.yearLevel}
                  {user.section}
                </dd>
              </div>
            </dl>
            <p className="text-xs leading-5 text-textMuted">
              Student news is not connected yet. Campus announcements are available from Campus news.
            </p>
          </>
        ) : (
          <p className="text-sm text-textSecondary">Sign in to access your portal account.</p>
        )}
      </section>
    </PageLayout>
  )
}
