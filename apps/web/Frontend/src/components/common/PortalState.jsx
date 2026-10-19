import { Link } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import { usePortal } from './portal.context.js'

const copy = {
  loading: ['Loading your workspace', 'Please wait while your account information loads.'],
  unavailable: ['Workspace connection unavailable', 'Account information is not connected yet. Public campus news remains available.'],
  error: ['Your workspace could not be loaded', 'Retry to check your account information.'],
  'signed-out': ['Sign in to continue', 'Sign in with your campus account to open this workspace.'],
  expired: ['Your session has expired', 'Sign in again to continue.'],
  forbidden: ['Access denied', 'Your account does not have access to this page.'],
  'not-found': ['Page not found', 'Choose campus news or return to an available workspace.'],
}

export default function PortalState({ state, title, description }) {
  const auth = useAuth()
  const portal = usePortal()
  const current = state ?? (auth.error?.status === 401 ? 'expired' : auth.loading ? 'loading' : auth.status)
  const defaults = copy[current] ?? copy.unavailable
  return <section className="grid min-w-0 gap-3 rounded-panel bg-white p-6 wrap-anywhere shadow-card" aria-busy={current === 'loading' || undefined}>
    <div role={current === 'error' ? 'alert' : 'status'}>
      <h1 className="text-xl font-semibold text-textPrimary">{title ?? defaults[0]}</h1>
      <p className="mt-2 text-sm leading-6 text-textSecondary">{description ?? defaults[1]}</p>
    </div>
    <div className="flex flex-wrap gap-2">
      {['signed-out', 'expired'].includes(current) && portal && <button type="button" onClick={() => portal.openLogin()} className="min-h-11 rounded-control bg-dark px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Sign in</button>}
      {['error', 'unavailable'].includes(current) && auth.refetch && <button type="button" onClick={auth.refetch} className="min-h-11 rounded-control bg-dark px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Retry</button>}
      <Link to="/" className="flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Campus news</Link>
    </div>
  </section>
}
