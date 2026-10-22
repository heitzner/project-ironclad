import { useRef, useState } from 'react'
import useAuth from '../../hooks/useAuth.js'
import useCouncilApplication from '../../hooks/useCouncilApplication.js'
import { councilService } from '../../services/council.service.js'
import CouncilApplication from './CouncilApplication.jsx'
import CouncilDialog from './CouncilDialog.jsx'
import applicationIcon from './assets/61cee.svg'
import alternateCloseIcon from './assets/13a05.svg'

export default function CouncilApplicationDialog({ open, onClose, service = councilService, restoreFocusRef }) {
  const auth = useAuth()
  const scope = JSON.stringify([auth.status, auth.user, auth.capabilities.canApply === true])
  return <ApplicationDialogSession key={scope} auth={auth} open={open} onClose={onClose} service={service} restoreFocusRef={restoreFocusRef} />
}

function ApplicationDialogSession({ auth, open, onClose, service, restoreFocusRef }) {
  const resource = useCouncilApplication({ service })
  const [busy, setBusy] = useState(false)
  const closeGuardRef = useRef(null)
  const close = () => { if (!closeGuardRef.current || closeGuardRef.current()) onClose?.() }
  return <CouncilDialog open={open} title="Application for Council" description={auth.user?.program?.label ? `${auth.user.program.label} Council Application` : 'Council self-application'}
    onClose={close} busy={busy} restoreFocusRef={restoreFocusRef} initialFocusSelector="[data-application-answer]"
    closeIconSrc={auth.user?.program?.code === 'BSCS' ? undefined : alternateCloseIcon}
    icon={<span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cardBg"><img src={applicationIcon} alt="" /></span>}
  ><CouncilApplication auth={auth} resource={resource} service={service} active={open} onBusyChange={setBusy} closeGuardRef={closeGuardRef} onClose={close} /></CouncilDialog>
}
