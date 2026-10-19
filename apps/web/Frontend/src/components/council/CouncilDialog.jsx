import { useEffect, useId, useRef } from 'react'
import closeIcon from './assets/8e9fb.svg'

const focusable = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

export default function CouncilDialog({ open, title, description, icon, children, onClose, busy = false, initialFocusRef, restoreFocusRef, initialFocusSelector, closeIconSrc = closeIcon, variant = 'default' }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    const opener = document.activeElement
    const fallback = restoreFocusRef?.current
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    const requested = initialFocusRef?.current ?? (initialFocusSelector ? dialog.querySelector(initialFocusSelector) : null)
    const initial = requested && !requested.matches(':disabled') ? requested : dialog.querySelector(focusable) ?? dialog
    initial.focus()

    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      const destination = opener?.isConnected && opener.matches(focusable) && !opener.matches(':disabled') && opener.getClientRects().length > 0
        ? opener : fallback
      if (destination?.isConnected) destination.focus({ preventScroll: true })
    }
  }, [open, initialFocusRef, restoreFocusRef, initialFocusSelector])

  const trapFocus = (event) => {
    if (event.key !== 'Tab') return
    const dialog = dialogRef.current
    const controls = [...dialog.querySelectorAll(focusable)].filter((element) => element.getClientRects().length > 0 && !element.closest('[hidden], [inert]'))
    const first = controls[0]
    const last = controls.at(-1)
    if (!first) {
      event.preventDefault()
      dialog.focus()
    } else if (!dialog.contains(document.activeElement) || document.activeElement === dialog
      || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
      event.preventDefault()
      const destination = event.shiftKey ? last : first
      destination.focus()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      tabIndex={-1}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-busy={busy || undefined}
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose?.() }}
      onKeyDown={trapFocus}
      className={`fixed inset-0 m-auto max-h-[calc(100svh_-_2rem)] w-[calc(100%_-_2rem)] overflow-y-auto rounded-card border-0 bg-white wrap-anywhere text-textPrimary shadow-nav backdrop:bg-textPrimary/40 ${variant === 'outcome' ? 'max-w-[460px] p-8' : 'max-w-lg p-6'}`}
    >
      <header className={variant === 'outcome' ? 'flex flex-col items-center pt-1 text-center' : 'mb-4 flex items-start gap-3 pr-8'}>
        <div className={variant === 'outcome' ? 'flex min-w-0 flex-col items-center gap-5' : 'flex min-w-0 items-start gap-3'}>
          {icon}
          <div className="min-w-0 break-words">
            <h2 id={titleId} className={variant === 'outcome' ? 'text-[28px] font-semibold leading-9 tracking-[-0.7px]' : 'text-[16px] font-bold leading-6'}>{title}</h2>
            {description && <p id={descriptionId} className={variant === 'outcome' ? 'mt-[10px] text-[13px] leading-[21px] text-textSecondary' : 'mt-0.5 text-[12px] leading-[18px] text-textSecondary'}>{description}</p>}
          </div>
        </div>
        <button type="button" onClick={onClose} disabled={busy} aria-label={`Close ${title}`} className={`absolute flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark disabled:cursor-not-allowed disabled:opacity-60 ${variant === 'outcome' ? 'right-3 top-3' : 'right-1 top-1'}`}>
          <img src={closeIconSrc} alt="" />
        </button>
      </header>
      {children}
    </dialog>
  )
}
