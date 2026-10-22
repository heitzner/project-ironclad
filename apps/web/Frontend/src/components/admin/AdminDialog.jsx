import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

export default function AdminDialog({ title, description, onClose, busy = false, children }) {
  const dialog = useRef(null)
  const titleId = useId()
  const descriptionId = useId()
  useEffect(() => {
    const element = dialog.current
    const trigger = document.activeElement
    const previousOverflow = document.body.style.overflow
    element.showModal()
    document.body.style.overflow = 'hidden'
    element.querySelector('input:not(:disabled), textarea:not(:disabled), select:not(:disabled)')?.focus()
    return () => {
      element.close()
      document.body.style.overflow = previousOverflow
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
      else document.getElementById('portal-content')?.focus()
    }
  }, [])
  return (
    <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
      aria-busy={busy || undefined}
      onCancel={event => { event.preventDefault(); if (!busy) onClose() }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return
        const elements = [...event.currentTarget.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')].filter(node => !node.disabled && node.getClientRects().length)
        const first = elements[0], last = elements.at(-1)
        if (event.shiftKey && (document.activeElement === first || !elements.includes(document.activeElement))) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && (document.activeElement === last || !elements.includes(document.activeElement))) { event.preventDefault(); first?.focus() }
      }}
      className="m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-card border-0 border-t-4 border-primary bg-white p-4 wrap-anywhere text-textPrimary shadow-nav backdrop:bg-deep/60 backdrop:backdrop-blur-sm sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><h2 id={titleId} className="text-lg font-semibold">{title}</h2>{description && <p id={descriptionId} className="mt-1 text-xs leading-5 text-textSecondary">{description}</p>}</div>
        <button type="button" aria-label="Close dialog" disabled={busy} onClick={onClose} className="admin-icon-button"><X aria-hidden="true" className="h-5 w-5" /></button>
      </div>
      {children}
    </dialog>
  )
}
