import { useCallback, useReducer, useRef, useState } from 'react'
import useAuth from '../../hooks/useAuth.js'
import useCouncilFeed from '../../hooks/useCouncilFeed.js'
import CouncilFeed from '../../components/council/CouncilFeed.jsx'
import CouncilPostDialog from '../../components/council/CouncilPostDialog.jsx'
import CouncilApplicationDialog from '../../components/council/CouncilApplicationDialog.jsx'
import { feedCriteriaReducer, initialFeedCriteria } from '../../components/council/councilFeed.model.js'

// Task 21 supplies the shared shell/routes and actual AuthProvider. No local identity or demo records.
export default function CouncilFeedPage(props) {
  const auth = useAuth()
  const sessionScope = JSON.stringify([auth.status, auth.user, auth.capabilities.canCreatePost === true, auth.capabilities.canApply === true])
  return <CouncilFeedSession key={sessionScope} {...props} auth={auth} />
}

function CouncilFeedSession({ auth, service, postConstraints, onAddPost, onApply, onViewVenue, onRegisterIndividual, onRegisterTeam }) {
  const [criteria, dispatch] = useReducer(feedCriteriaReducer, initialFeedCriteria)
  const resource = useCouncilFeed({ service, ...criteria })
  const [postTarget, setPostTarget] = useState(null)
  const [postOpen, setPostOpen] = useState(false)
  const [applicationOpen, setApplicationOpen] = useState(false)
  const [applicationStarted, setApplicationStarted] = useState(false)
  const openApplication = useCallback(() => { setApplicationStarted(true); setApplicationOpen(true) }, [])
  const searchInputRef = useRef(null)
  const openPost = useCallback((council, { scope }) => {
    setPostTarget({ councilId: council.id, userId: scope.id })
    setPostOpen(true)
  }, [])
  const canPost = auth.status === 'authenticated' && auth.capabilities.canCreatePost === true
  const sameScope = canPost && postTarget?.userId === auth.user?.id && (!resource.data || postTarget?.councilId === resource.data.council?.id)
    && ![401, 403].includes(resource.error?.status)
  return <>
    <CouncilFeed resource={resource} auth={auth} criteria={criteria} dispatch={dispatch} onAddPost={onAddPost ?? openPost} onApply={onApply ?? openApplication} onViewVenue={onViewVenue} onRegisterIndividual={onRegisterIndividual} onRegisterTeam={onRegisterTeam} searchInputRef={searchInputRef} />
    {applicationStarted && auth.status === 'authenticated' && auth.capabilities.canApply === true && ![401, 403].includes(resource.error?.status) && <CouncilApplicationDialog
      open={applicationOpen} onClose={() => setApplicationOpen(false)} service={service} restoreFocusRef={searchInputRef}
    />}
    {sameScope && <CouncilPostDialog
      key={`${postTarget.userId}:${postTarget.councilId}`}
      open={postOpen} onClose={() => setPostOpen(false)} service={service} userId={postTarget.userId} councilId={postTarget.councilId}
      canCreatePost={canPost} constraints={postConstraints} onCreated={resource.refetch}
      restoreFocusRef={searchInputRef}
      onCheckFeed={async () => { setPostOpen(false); await resource.refetch() }}
    />}
  </>
}
