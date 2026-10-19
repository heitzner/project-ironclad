import { useId } from 'react'
import CouncilButton from './CouncilButton.jsx'
import { postErrorMessage } from './councilPost.model.js'
import uploadIcon from './assets/24e77.svg'

export default function CouncilPostForm({ state, limits, disabledReason, onEdit, onSubmit, onClose, onCheckFeed, headerRef, descriptionRef, returnRef }) {
  const id = useId()
  const fieldClass = 'w-full min-w-0 rounded-control border border-textMuted bg-white px-[13px] text-textPrimary shadow-card placeholder:text-textSecondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark disabled:cursor-not-allowed disabled:opacity-60'
  const labelClass = 'text-[10px] font-bold uppercase leading-[14px] tracking-[0.5px]'
  const hint = (field) => [limits?.[field]?.minLength ? `Minimum ${limits[field].minLength} characters.` : '', limits?.[field]?.maxLength ? `Maximum ${limits[field].maxLength} characters.` : ''].filter(Boolean).join(' ')

  if (state.outcome) return (
    <div className="flex min-w-0 flex-col gap-4 break-words">
      <div role="status" className="rounded-panel bg-cardBg p-4 text-[13px] leading-5">
        <p className="font-semibold">Post received</p>
        <p>Status: {state.outcome.status}</p>
        <p>Reference: {state.outcome.id}</p>
      </div>
      {state.refreshError && <p role="alert" className="text-[12px] leading-[18px] text-textSecondary">The post was received, but the feed could not be refreshed. Refresh the feed to see the latest posts.</p>}
      <CouncilButton ref={returnRef} onClick={onClose}>Return to feed</CouncilButton>
    </div>
  )

  return (
    <form noValidate onSubmit={onSubmit} aria-busy={state.busy || undefined} className="flex min-w-0 flex-col gap-4">
      <div className="flex w-full min-w-0 flex-col gap-1 sm:max-w-[272px]">
        <label htmlFor={`${id}-header`} className={labelClass}>Header</label>
        <input
          ref={headerRef} id={`${id}-header`} name="header" required value={state.values.header}
          onChange={(event) => onEdit('header', event.target.value)} disabled={state.busy}
          aria-invalid={Boolean(state.errors.header)} aria-describedby={`${id}-header-help${state.errors.header ? ` ${id}-header-error` : ''}`}
          placeholder="input your header" className={`${fieldClass} min-h-[38px] py-2 text-[13px] leading-5 max-sm:min-h-11`}
        />
        <p id={`${id}-header-help`} className={hint('header') ? 'text-[12px] leading-[18px] text-textSecondary' : 'sr-only'}>Required. {hint('header')}</p>
        {state.errors.header && <p id={`${id}-header-error`} className="text-[12px] leading-[18px] text-textPrimary">{state.errors.header}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-3 rounded-panel border border-textMuted/30 bg-selectBg/70 p-[15px]">
        <label htmlFor={`${id}-description`} className={labelClass}>Description</label>
        <textarea
          ref={descriptionRef} id={`${id}-description`} name="description" required value={state.values.description}
          onChange={(event) => onEdit('description', event.target.value)} disabled={state.busy}
          aria-invalid={Boolean(state.errors.description)} aria-describedby={`${id}-description-help${state.errors.description ? ` ${id}-description-error` : ''}`}
          placeholder="enter the event’s description" className={`${fieldClass} min-h-[164px] resize-y py-[7px] text-[12px] leading-[18px]`}
        />
        <p id={`${id}-description-help`} className={hint('description') ? 'text-[12px] leading-[18px] text-textSecondary' : 'sr-only'}>Required. {hint('description')}</p>
        {state.errors.description && <p id={`${id}-description-error`} className="text-[12px] leading-[18px] text-textPrimary">{state.errors.description}</p>}
      </div>
      {Object.values(state.errors).some(Boolean) && <p role="alert" className="sr-only">Check the highlighted fields before uploading.</p>}
      {state.busy && <p role="status" className="text-[12px] leading-[18px] text-textSecondary">Submitting your post… Please wait before closing.</p>}
      {state.error && <div className="flex flex-col items-start gap-2">
        <p role="alert" className="text-[12px] leading-[18px] text-textPrimary">{postErrorMessage(state.error)}</p>
        {onCheckFeed && <CouncilButton size="compact" variant="secondary" onClick={onCheckFeed}>Check feed</CouncilButton>}
      </div>}
      <footer className="flex min-w-0 flex-col gap-2 border-t border-textMuted/20 pt-[13px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CouncilButton size="compact" variant="quiet" onClick={onClose} disabled={state.busy}>Cancel</CouncilButton>
          <CouncilButton size="compact" type="submit" busy={state.busy} busyLabel="Uploading…" disabledReason={disabledReason} className="px-6">
            <img src={uploadIcon} alt="" /> Upload
          </CouncilButton>
        </div>
        <p className="text-[12px] leading-[18px] text-textSecondary">Cancel keeps this draft while you stay on this page.</p>
      </footer>
    </form>
  )
}
