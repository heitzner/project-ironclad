import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AuthProvider from '../../context/AuthContext.jsx'
import useAuth from '../../hooks/useAuth.js'
import PortalProvider from './PortalProvider.jsx'
import PageLayout from './PageLayout.jsx'
import PortalState from './PortalState.jsx'
import SystemFeed from './SystemFeed.jsx'
import OrganizationManagement from './OrganizationManagement.jsx'
import SystemDashboard from './SystemDashboard.jsx'
import { canManageMembers, effectiveUser, positionLabel } from '../../data/organization.js'
import { Facilities, MembershipReview, MyParticipation } from './SystemRequests.jsx'
import StudentProvider from '../student/StudentProvider.jsx'
import { createStudentService } from '../../services/student.service.js'
import { canManage } from '../../data/frontend-system.js'
import { createPortalApiStore } from '../../data/portal-api-store.js'
import {
  changePortalPassword, downloadPortalArchive, loadPortalSession, registerPortal,
  requestPortalVerification, resetPortalPassword, signInPortal, signOutPortal, verifyPortalEmail,
} from '../../services/portal.js'
import BookingPage from '../../pages/student/BookingPage.jsx'
import Profile from '../../pages/student/Profile.jsx'
import Archive from '../../pages/student/Archive.jsx'
import LoginModal from '../../pages/auth/LoginModal.jsx'
import Support from '../../pages/public/Support.jsx'
import AccountReset from '../../pages/auth/AccountReset.jsx'

const clock = () => new Date()

export default function FrontendSystem() {
  const [store] = useState(createPortalApiStore)
  const [authActions] = useState(() => ({
    displayUser: user => store.user(user),
    signIn: async fields => { const session = await signInPortal(fields); await store.refresh(); return session },
    register: registerPortal,
    resetPassword: resetPortalPassword,
    requestSignupVerification: requestPortalVerification,
    verifySignupEmail: verifyPortalEmail,
    requestEmailChangeVerification: requestPortalVerification,
    verifyEmailChange: verifyPortalEmail,
    requestPasswordVerification: requestPortalVerification,
    verifyPasswordEmail: verifyPortalEmail,
    changePassword: changePortalPassword,
    signOut: async () => { const result = await signOutPortal(); await store.refresh(); return result },
  }))
  const [loadSession] = useState(() => loadPortalSession)
  useEffect(() => {
    store.refresh().catch(() => {})
    const timer = window.setInterval(() => store.refresh().catch(() => {}), 15000)
    return () => window.clearInterval(timer)
  }, [store])
  return <AuthProvider loadSession={loadSession}><PortalProvider authActions={authActions}><SystemRoutes store={store} /></PortalProvider></AuthProvider>
}

function SystemRoutes({ store }) {
  const auth = useAuth()
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const user = useMemo(() => effectiveUser(auth.user, snapshot), [auth.user, snapshot])
  const student = useMemo(() => ({ service: createStudentService({ operations: {
    getProfile: async () => ({ profile: user ? {
      id: user.id, version: store.getSnapshot().profiles[user.id]?.version || 0, studentId: user.studentId, fullName: store.getSnapshot().directory.find(person => person.id === user.id)?.name || user.name, programCode: user.course,
      section: `${user.yearLevel}${user.section}`, position: positionLabel(user), displayName: store.getSnapshot().profiles[user.id]?.displayName || '', corrections: store.getSnapshot().profiles[user.id]?.corrections || [],
      email: store.getSnapshot().profiles[user.id]?.email || user.email || '', avatarUrl: store.getSnapshot().profiles[user.id]?.avatarUrl || '',
      emailVerified: store.getSnapshot().profiles[user.id]?.emailVerified === true,
      lastSyncedAt: store.getSnapshot().profiles[user.id]?.updatedAt || 'No changes saved yet', sourceLabel: 'Campus account', passwordManaged: true,
    } : null }),
    updateProfile: async input => {
      try { return store.saveProfile(user, input) } catch (failure) { failure.status = 422; throw failure }
    },
    getArchive: async () => {
      const records = store.getSnapshot().archive.map(record => ({ ...record, hasAsset: true, venue: { ...record.venue, type: 'room' } }))
      return { records, formats: ['pdf', 'csv'], summary: { totalArchived: records.length, coverageLabel: 'Campus event records' }, filters: { academicYears: [...new Set(records.map(r => r.academicYear))], semesters: [...new Set(records.map(r => r.semester))], venues: [...new Map(records.map(r => [r.venue.id, r.venue])).values()] }, policy: 'Download an event record or export the records matching your filters.' }
    },
    exportArchive: async criteria => downloadPortalArchive({ format: criteria.format, filters: criteria }),
    getArchiveAsset: async ({ id, format }) => downloadPortalArchive({ id, format }),
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
    <Route path="/admin/dashboard" element={allowed(user?.role === 'admin', <SystemDashboard store={store} snapshot={snapshot} user={user} />)} />
    <Route path="/admin/people" element={allowed(user?.role === 'admin' && canManageMembers(user), <OrganizationManagement store={store} snapshot={snapshot} user={user} directory={snapshot.directory} />)} />
    <Route path="/council/members" element={allowed(user?.role === 'council' && canManageMembers(user), <OrganizationManagement store={store} snapshot={snapshot} user={user} directory={snapshot.directory} />)} />
    <Route path="/admin/roles" element={allowed(user?.role === 'admin', <Navigate to="/council/applications" replace />)} />
    <Route path="/booking" element={signedIn(user && <SystemBooking store={store} snapshot={snapshot} user={user} />)} />
    <Route path="/archive" element={signedIn(<Archive />)} />
    <Route path="/profile" element={signedIn(<Profile />)} />
    <Route path="/my-activity" element={signedIn(user && <MyParticipation snapshot={snapshot} user={user} store={store} />)} />
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
