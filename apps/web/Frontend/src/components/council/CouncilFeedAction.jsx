import { useEffect, useId, useMemo, useSyncExternalStore } from 'react'
import CouncilButton from './CouncilButton.jsx'
import { createFeedAction } from './councilFeed.model.js'

export default function CouncilFeedAction({ onAction, subject, scope, refreshFeed, disabledReason, children, label, variant, size, className }) {
  const errorId = useId()
  const action = useMemo(() => createFeedAction(onAction, subject, { scope, refreshFeed }), [onAction, subject, scope, refreshFeed])
  const state = useSyncExternalStore(action.subscribe, action.getSnapshot, action.getSnapshot)
  useEffect(() => action.cancel, [action])
  const errorText = state.error?.status === 401 ? 'Sign in again before trying this action.'
    : state.error?.status === 403 ? 'Your account cannot perform this action.'
      : state.error?.conflict ? 'This campaign has changed. Refresh the feed before trying again.'
        : state.error?.unavailable ? 'This action is not connected yet.'
          : 'The action could not be opened. Please try again.'

  return (
    <div className="min-w-0 max-w-full break-words">
      <CouncilButton
        variant={variant}
        size={size}
        className={className}
        onClick={action.run}
        aria-label={label}
        aria-describedby={state.error ? errorId : undefined}
        disabledReason={disabledReason || (typeof onAction !== 'function' ? 'This action is not connected yet.' : undefined)}
        busy={state.busy}
        busyLabel="Opening…"
      >{children}</CouncilButton>
      {state.error && <p id={errorId} role="alert" className="mt-1 text-[12px] leading-[18px] text-textPrimary">{errorText}</p>}
    </div>
  )
}
