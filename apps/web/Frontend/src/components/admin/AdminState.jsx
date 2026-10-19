import { Inbox, RefreshCw, ShieldAlert } from 'lucide-react'

export default function AdminState({ loading = false, error, connected = true, empty = false, onRetry, children, label = 'records' }) {
  if (!loading && !error && connected && !empty) return children
  const Icon = error ? ShieldAlert : loading ? RefreshCw : Inbox
  return <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-10 text-center" role={error ? 'alert' : 'status'} aria-live="polite">
    <span className="rounded-full bg-cardBg p-4 text-dark"><Icon aria-hidden="true" className={`h-7 w-7 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} /></span>
    <h2 className="text-base font-semibold">{loading ? `Loading ${label}…` : error ? `Unable to load ${label}` : !connected ? `${label[0].toUpperCase()}${label.slice(1)} are not connected` : `No ${label} found`}</h2>
    <p className="max-w-md text-xs leading-6 text-textSecondary">{error ? 'Please try again. If the problem continues, contact your administrator.' : loading ? 'Please wait while the latest information loads.' : !connected ? 'This page is ready for the live service. No sample records or totals are shown.' : 'There are no records matching the current filters.'}</p>
    {error && onRetry && <button type="button" className="admin-button" onClick={onRetry}>Retry</button>}
  </div>
}
