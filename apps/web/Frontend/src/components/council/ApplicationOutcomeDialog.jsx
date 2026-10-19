import { useEffect, useRef } from 'react'
import CouncilDialog from './CouncilDialog.jsx'
import CouncilButton from './CouncilButton.jsx'
import checkmark from './assets/ad8ab.svg'
import arrow from './assets/28520.svg'
import close from './assets/24b0d.svg'

export default function ApplicationOutcomeDialog({ outcome, busy, refreshError, onClose, restoreFocusRef }) {
  const returnRef = useRef(null)
  useEffect(() => { if (outcome && !busy) returnRef.current?.focus() }, [outcome, busy])
  if (!outcome) return null
  return <CouncilDialog open title="Decision received" variant="outcome" closeIconSrc={close}
    description={`The review service returned a status for ${outcome.applicantName}.`}
    icon={<span className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-cardBg shadow-inner">
      <span className="absolute -inset-2 rounded-full bg-ring/10" aria-hidden="true" />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-ring/60"><img src={checkmark} alt="" /></span>
    </span>}
    busy={busy} onClose={onClose} initialFocusRef={returnRef} restoreFocusRef={restoreFocusRef}>
    <div className="mt-12 flex min-w-0 flex-col items-center gap-3 break-words text-center text-[12px] leading-[18px]">
      <p role="status" className="max-w-full rounded-pill bg-cardBg px-[14px] py-1.5 font-semibold text-dark">Status: {outcome.application.status}</p>
      <p className="max-w-full text-textSecondary">Application reference: {outcome.application.id}</p>
      {outcome.notification ? <p className="max-w-full text-textSecondary">Notification status: {outcome.notification.status}{outcome.notification.channel ? ` (${outcome.notification.channel})` : ''}{outcome.notification.recipient ? ` — ${outcome.notification.recipient}` : ''}</p>
        : <p className="text-textSecondary">Notification delivery has not been confirmed.</p>}
      {busy && <p role="status">Reloading the latest applications…</p>}
      {refreshError && <p role="alert">The decision was received, but the latest applications could not be reloaded. Reload before making further decisions.</p>}
      <CouncilButton fullWidth ref={returnRef} disabled={busy} onClick={onClose} className="mt-4 min-h-[46px] rounded-panel text-[15px]">Back to applications<img src={arrow} alt="" /></CouncilButton>
    </div>
  </CouncilDialog>
}
