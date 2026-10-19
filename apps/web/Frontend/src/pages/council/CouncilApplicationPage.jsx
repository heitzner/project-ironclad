import useAuth from '../../hooks/useAuth.js'
import useCouncilApplication from '../../hooks/useCouncilApplication.js'
import { councilService } from '../../services/council.service.js'
import CouncilApplication from '../../components/council/CouncilApplication.jsx'
import applicationIcon from '../../components/council/assets/61cee.svg'

// The same self-application body serves the future route and the feed modal. Task 21 mounts it.
export default function CouncilApplicationPage({ service = councilService, onReturn }) {
  const auth = useAuth()
  const resource = useCouncilApplication({ service })
  return <section aria-label="Council self-application" className="mx-auto w-full min-w-0 max-w-lg rounded-card bg-white p-6 shadow-card">
    <header className="mb-4 flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cardBg"><img src={applicationIcon} alt="" /></span>
      <div className="min-w-0 break-words"><h1 className="text-[16px] font-bold leading-6">Application for Council</h1><p className="text-[12px] leading-[18px] text-textSecondary">{auth.user?.program?.label ? `${auth.user.program.label} Council Application` : 'Council self-application'}</p></div>
    </header>
    <CouncilApplication key={JSON.stringify([auth.status, auth.user, auth.capabilities.canApply === true])} auth={auth} resource={resource} service={service} onClose={onReturn} />
  </section>
}
