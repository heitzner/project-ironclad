import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AuthProvider from '../../context/AuthContext.jsx'
import useAuth from '../../hooks/useAuth.js'
import PortalProvider from './PortalProvider.jsx'
import PageLayout from './PageLayout.jsx'
import PortalState from './PortalState.jsx'
import SystemFeed from './SystemFeed.jsx'
import { Facilities, MembershipReview, MyParticipation } from './SystemRequests.jsx'
import StudentProvider from '../student/StudentProvider.jsx'
import { createStudentService } from '../../services/student.service.js'
import { filterArchive } from '../student/student.model.js'
import { getTestUser, registerTestStudent, signInTestAccount, signOutTestAccount, changeTestPassword } from '../auth/test-auth.js'
import { previewSession } from '../auth/frontend-preview.js'
import { canManage, createFrontendStore } from '../../data/frontend-system.js'
import BookingPage from '../../pages/student/BookingPage.jsx'
import Profile from '../../pages/student/Profile.jsx'
import Archive from '../../pages/student/Archive.jsx'
import LoginModal from '../../pages/auth/LoginModal.jsx'
import Support from '../../pages/public/Support.jsx'
import AccountReset from '../../pages/auth/AccountReset.jsx'

const fixedAccount = user => ['test-admin', 'test-council', 'test-student'].includes(user?.id)
const clock = () => new Date()
const csvFile = (records, fileName) => ({ fileName, blob: new Blob([
  ['Reference', 'Event', 'Organizer', 'Date', 'Venue', 'Course / Section'].join(',') + '\r\n' + records.map(record => [record.permitNo, record.title, record.organizer, record.concludedDate, record.venue.label, record.courseSection].map(value => `"${String(value ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`).join(',')).join('\r\n'),
], { type: 'text/csv;charset=utf-8' }) })

export default function FrontendSystem() {
  const [store] = useState(() => {
    // A failing storage adapter reports a recoverable write error, never a false save.
    let storage
    try { storage = window.localStorage } catch { storage = { getItem: () => null, setItem: () => { throw new Error('Storage unavailable') } } }
    return createFrontendStore({ storage })
  })
  const sessionFor = user => previewSession(user ? { ...user, ...store.getSnapshot().profiles[user.id] } : null)
  const [authActions] = useState(() => ({
    displayUser: user => user ? { ...user, ...store.getSnapshot().profiles[user.id] } : null,
    signIn: async ({ studentId, password, remember }) => sessionFor(await signInTestAccount(studentId, password, remember)),
    register: async fields => {
      try { await registerTestStudent(fields); return { confirmed: true, message: 'Your account is ready. Sign in with your student ID and password.' } }
      catch (error) { error.status = 422; throw error }
    },
    signOut: async () => { signOutTestAccount(); return { signedOut: true } },
  }))
  const [loadSession] = useState(() => async () => sessionFor(getTestUser()))
  useEffect(() => {
    const update = event => { if (event.key === 'ironclad-frontend-system-v1') store.refresh() }
    window.addEventListener('storage', update)
    return () => window.removeEventListener('storage', update)
  }, [store])
  return <AuthProvider loadSession={loadSession}><PortalProvider authActions={authActions}><SystemRoutes store={store} /></PortalProvider></AuthProvider>
}

function SystemRoutes({ store }) {
  const auth = useAuth()
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const user = auth.user
  const student = useMemo(() => ({ service: createStudentService({ operations: {
    getProfile: async () => ({ profile: user ? {
      id: user.id, studentId: user.studentId, fullName: user.name, programCode: user.course,
      section: `${user.yearLevel}${user.section}`, position: { admin: 'Administrator', council: 'Council Member', student: 'Student' }[user.role],
      email: store.getSnapshot().profiles[user.id]?.email || user.email || '', avatarUrl: store.getSnapshot().profiles[user.id]?.avatarUrl || '',
      lastSyncedAt: store.getSnapshot().profiles[user.id]?.updatedAt || 'No changes saved yet', sourceLabel: 'Campus account', passwordManaged: fixedAccount(user),
    } : null }),
    updateProfile: async input => {
      if (input.newPassword) await changeTestPassword(user, input.currentPassword, input.newPassword)
      const result = store.saveProfile(user, input)
      return result
    },
    getArchive: async () => {
      const records = store.getSnapshot().archive.map(record => ({ ...record, hasAsset: true, venue: { ...record.venue, type: 'room' } }))
      return { records, summary: { totalArchived: records.length, coverageLabel: 'Campus event records' }, filters: { academicYears: [...new Set(records.map(r => r.academicYear))], semesters: [...new Set(records.map(r => r.semester))], venues: [...new Map(records.map(r => [r.venue.id, r.venue])).values()] }, policy: 'Download an event record or export the records matching your filters.' }
    },
    exportArchive: async criteria => csvFile(filterArchive(store.getSnapshot().archive, criteria), 'campus-archive.csv'),
    getArchiveAsset: async ({ id }) => {
      const record = store.getSnapshot().archive.find(r => r.id === id)
      if (!record) throw new Error('This archive record could not be found. Refresh and try again.')
      return csvFile([record], `${record.permitNo}.csv`)
    },
  } }) }), [user, store])
  const signedIn = content => auth.loading ? <PageLayout><PortalState state="loading" /></PageLayout> : user ? content : <PageLayout><PortalState state="signed-out" /></PageLayout>
  const allowed = (condition, content) => signedIn(condition ? content : <PageLayout><PortalState state="forbidden" /></PageLayout>)
  const error = store.getError()
  if (error) return <PageLayout><div role="alert" className="rounded-panel bg-white p-6"><h1 className="text-xl font-bold">Campus data unavailable</h1><p className="mt-3">{error}</p><button type="button" className="mt-4 min-h-11 rounded-control bg-dark px-4 text-white" onClick={() => { store.refresh(); window.location.reload() }}>Reload data</button></div></PageLayout>
  return <StudentProvider value={student}><Routes>
    <Route path="/" element={<SystemFeed store={store} snapshot={snapshot} user={user} />} />
    <Route path="/news-feed" element={<SystemFeed store={store} snapshot={snapshot} user={user} />} />
    <Route path="/events" element={<Navigate to="/news-feed?kind=event" replace />} />
    <Route path="/council" element={<Navigate to="/news-feed" replace />} />
    <Route path="/council/apply" element={<Navigate to="/my-activity" replace />} />
    <Route path="/council/applications" element={allowed(canManage(user), <MembershipReview store={store} snapshot={snapshot} user={user} />)} />
    <Route path="/admin" element={allowed(user?.role === 'admin', <Facilities store={store} snapshot={snapshot} user={user} />)} />
    <Route path="/admin/bookings" element={<Navigate to="/admin" replace />} />
    <Route path="/admin/events" element={allowed(user?.role === 'admin', <Navigate to="/news-feed?kind=event" replace />)} />
    <Route path="/admin/roles" element={allowed(user?.role === 'admin', <Navigate to="/council/applications" replace />)} />
    <Route path="/booking" element={signedIn(user && <SystemBooking store={store} snapshot={snapshot} user={user} />)} />
    <Route path="/archive" element={signedIn(<Archive />)} />
    <Route path="/profile" element={signedIn(<Profile />)} />
    <Route path="/my-activity" element={signedIn(user && <MyParticipation snapshot={snapshot} user={user} />)} />
    <Route path="/login" element={<LoginModal />} />
    <Route path="/account-reset" element={<AccountReset />} />
    <Route path="/support" element={<Support />} />
    <Route path="*" element={<PageLayout><PortalState state="not-found" /></PageLayout>} />
  </Routes></StudentProvider>
}

function SystemBooking({ store, snapshot, user }) {
  const [now, setNow] = useState(clock)
  useEffect(() => { const timer = setInterval(() => setNow(clock()), 30000); return () => clearInterval(timer) }, [])
  const schedules = useMemo(() => store.schedules(snapshot, undefined, now), [store, snapshot, now])
  return <PageLayout fullWidth><BookingPage rooms={snapshot.rooms} schedules={schedules} requester={{ ...user, program: `${user.course} ${user.yearLevel}${user.section}` }} clock={clock} onRequest={input => store.book(user, input)} /></PageLayout>
}
