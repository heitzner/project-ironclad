import { useId } from 'react'
import CouncilButton from './CouncilButton.jsx'

const copy = {
  loading: ['Loading Council information', 'Please wait while the latest information loads.'],
  unavailable: ['Council connection unavailable', 'Council information is not connected yet. Please try again when the connection is available.'],
  'signed-out': ['Sign in to continue', 'Your account information is needed to use Council services.'],
  forbidden: ['Access unavailable', 'Your account does not currently have access to this Council view.'],
  error: ['Council information could not be loaded', 'Please retry. Your previous action has not been confirmed.'],
  empty: ['Nothing here yet', 'There are no records to display.'],
  'no-results': ['No matching results', 'Try another search or clear your filters.'],
}

export default function CouncilViewState({ state, title, description, onRetry, onClear }) {
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
      {(state === 'error' || state === 'unavailable') && onRetry && <CouncilButton onClick={onRetry}>Retry</CouncilButton>}
      {state === 'no-results' && onClear && <CouncilButton variant="secondary" onClick={onClear}>Clear filters</CouncilButton>}
    </section>
  )
}
