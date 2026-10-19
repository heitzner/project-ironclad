import { useEffect, useRef } from 'react'

export default function AdminMutationFeedback({ mutation, onCheckStatus, onRefresh }) {
  const feedback = useRef(null)
  useEffect(() => { if (mutation.outcome || mutation.error) feedback.current?.focus() }, [mutation.outcome, mutation.error])
  return <div ref={feedback} tabIndex={-1} className="grid gap-3 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark">
    {(mutation.pending || mutation.checking) && <p role="status" className="text-sm text-textSecondary">{mutation.checking ? 'Checking the latest status…' : 'Saving your change…'}</p>}
    {mutation.outcome && <div role="status" className="grid gap-2 rounded-control bg-cardBg p-3 text-sm leading-6 text-deep"><p>The requested change is confirmed.</p><p className="text-xs">Reference: {mutation.outcome.id}</p>{mutation.outcome.status && <p className="text-xs">Status: {mutation.outcome.status}</p>}</div>}
    {mutation.error && <p role="alert" className="text-sm leading-6 text-textPrimary">{mutation.error}</p>}
    {mutation.checkMessage && <p role="status" className="text-sm leading-6 text-textSecondary">{mutation.checkMessage}</p>}
    {mutation.uncertain && <p className="text-xs leading-6 text-textSecondary">Your input is retained. Check the latest status before making another change.{!onCheckStatus && ' Status checking is not connected yet.'}</p>}
    {mutation.denied && <p className="text-xs leading-6 text-textSecondary">Your account cannot complete this change. Refresh your session before continuing.</p>}
    {mutation.refreshError && <p role="alert" className="text-xs leading-6">The change is confirmed, but the latest list could not be loaded. Retry the refresh.</p>}
    {((mutation.uncertain && onCheckStatus) || (mutation.outcome && onRefresh)) && <button type="button" className="admin-secondary" disabled={mutation.pending || mutation.checking} onClick={mutation.check}>{mutation.checking ? 'Checking…' : mutation.outcome ? 'Refresh latest data' : 'Check latest status'}</button>}
  </div>
}
