import { useReducer } from 'react'
import useAuth from '../../hooks/useAuth.js'
import useCouncilApplications from '../../hooks/useCouncilApplications.js'
import { councilService } from '../../services/council.service.js'
import CouncilApplications from '../../components/council/CouncilApplications.jsx'
import { initialReviewCriteria, reviewCriteriaReducer } from '../../components/council/councilReview.model.js'

// Route and the actual shared shell/AuthProvider are composed separately in Task 21.
export default function CouncilApplicationsPage(props) {
  const auth = useAuth()
  return <ApplicationsSession key={JSON.stringify([auth.status, auth.user, auth.capabilities])} {...props} auth={auth} />
}

function ApplicationsSession({ auth, service = councilService }) {
  const [criteria, dispatch] = useReducer(reviewCriteriaReducer, initialReviewCriteria)
  const resource = useCouncilApplications({ service, ...criteria })
  return <CouncilApplications auth={auth} resource={resource} service={service} criteria={criteria} dispatch={dispatch} />
}
