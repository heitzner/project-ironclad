import { ShieldCheck } from 'lucide-react'
import PageLayout from '../common/PageLayout.jsx'
import PageHeader from '../common/PageHeader.jsx'
import { isAdmin } from './admin.logic.js'
import AdminSidebar from './AdminSidebar.jsx'
import AdminWorkspaceStatus from './AdminWorkspaceStatus.jsx'
import './admin.css'

export default function AdminShell({
  section,
  title,
  subtitle,
  user = null,
  preview = false,
  onNavigate,
  previewControls,
  children,
}) {
  const allowed = isAdmin(user)
  return (
    <PageLayout role="admin" user={user} fullWidth>
      <div className="admin-workspace grid w-full min-w-0 flex-1 grid-cols-1 content-start items-start gap-3 p-3 md:grid-cols-[clamp(12rem,16vw,15rem)_minmax(0,1fr)] md:gap-4 md:p-4">
        <AdminSidebar section={section} onNavigate={onNavigate} />
        <main className="flex min-h-[calc(100svh-6rem)] min-w-0 flex-col gap-3">
          <PageHeader
            icon={ShieldCheck}
            title={title}
            subtitle={subtitle || 'Manage campus facilities, bookings, events, and account roles.'}
          />
          {previewControls}
          <AdminWorkspaceStatus preview={preview} />
          {preview || allowed ? (
            children
          ) : (
            <section
              className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-panel border border-track bg-white p-6 text-center shadow-card"
              role="status"
            >
              <ShieldCheck aria-hidden="true" className="h-8 w-8 text-dark" />
              <h2 className="text-lg font-semibold">
                {user ? 'Access denied' : 'Administrator sign-in required'}
              </h2>
              <p className="max-w-md text-sm leading-6 text-textSecondary">
                {user
                  ? 'This account does not have administrator access.'
                  : 'Sign in with an administrator account to continue.'}
              </p>
            </section>
          )}
        </main>
      </div>
    </PageLayout>
  )
}
