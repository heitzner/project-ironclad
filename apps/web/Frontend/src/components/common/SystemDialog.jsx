import { useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import ModalShell from './ModalShell.jsx'
import './task40.css'
import { primaryButton, secondaryButton } from './system-ui.js'

export default function SystemDialog({ title, onClose, children, wide = false, busy = false }) {
  const id = useId()
  return <ModalShell isOpen onClose={onClose} titleId={id} busy={busy} maxWidth={wide ? 'max-w-3xl' : 'max-w-xl'} className="!overflow-visible" showTopBar>
    <div className="flex items-start justify-between gap-4 border-b border-track p-5">
      <h2 id={id} className="text-xl font-bold">{title}</h2>
      <button type="button" aria-label="Close dialog" disabled={busy} onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control hover:bg-cardBg focus-visible:ring-2 focus-visible:ring-primary"><X aria-hidden="true" /></button>
    </div>
    <div className="ic-scroll max-h-[calc(100svh-10rem)] overflow-y-auto rounded-b-[24px] p-5">{children}</div>
  </ModalShell>
}

export function DecisionDialog({ title, description, actionLabel, requireReason = false, onConfirm, onClose }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const guard = useRef(false)
  const id = useId()
  return <SystemDialog title={title} onClose={onClose} busy={busy}>
    <form className="space-y-4" onSubmit={async event => {
      event.preventDefault()
      if (guard.current) return
      const reason = new FormData(event.currentTarget).get('reason') || ''
      guard.current = true; setBusy(true); setError('')
      try { await onConfirm(reason); onClose() } catch (failure) { setError(failure.message) } finally { guard.current = false; setBusy(false) }
    }}>
      <p className="text-sm leading-6 text-textSecondary">{description}</p>
      {requireReason && <label htmlFor={id} className="block text-sm font-semibold">Reason<textarea id={id} name="reason" required maxLength={500} disabled={busy} className="mt-2 min-h-24 w-full rounded-control border border-textMuted p-3 font-normal focus-visible:ring-2 focus-visible:ring-primary" /></label>}
      {error && <p role="alert" className="rounded-control bg-selectBg p-3 text-sm">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} onClick={onClose} className={secondaryButton}>Cancel</button><button type="submit" disabled={busy} className={primaryButton}>{busy ? 'Saving…' : actionLabel}</button></div>
    </form>
  </SystemDialog>
}
