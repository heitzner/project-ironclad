import { useId } from 'react'

const copy = {
  loading: ['Loading', 'Please wait while the latest information loads.'],
  unavailable: ['Connection unavailable', 'This information is not connected yet. Please try again when the connection is available.'],
  'signed-out': ['Sign in to continue', 'Your account information is needed to view this page.'],
  error: ['Information could not be loaded', 'Please retry. Your previous action has not been confirmed.'],
  empty: ['Nothing here yet', 'There are no records to display.'],
}

// Shared loading / error / empty / signed-out block for data-driven views.
export function ViewState({ state, title, description, onRetry, children }) {
  const titleId = useId()
  const defaults = copy[state]
  if (!defaults) return null
  const loading = state === 'loading'

  return (
    <section
      aria-labelledby={titleId}
      aria-busy={loading || undefined}
      className="flex min-w-0 flex-col items-start gap-3 rounded-panel bg-white p-6 shadow-card"
    >
      <div role={state === 'error' ? 'alert' : 'status'} aria-atomic="true" className="min-w-0 break-words">
        <h2 id={titleId} className="text-[16px] font-semibold leading-6 text-textPrimary">{title ?? defaults[0]}</h2>
        <p className="mt-1 text-[13px] leading-5 text-textSecondary">{description ?? defaults[1]}</p>
      </div>
      {(state === 'error' || state === 'unavailable') && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-control bg-dark px-4 py-2 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Retry
        </button>
      )}
      {children}
    </section>
  )
}

export default ViewState
