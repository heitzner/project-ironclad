import { useRef } from 'react'
import CouncilHeader from './CouncilHeader.jsx'
import CouncilFeedToolbar from './CouncilFeedToolbar.jsx'
import CampaignCard from './CampaignCard.jsx'
import CouncilViewState from './CouncilViewState.jsx'
import CouncilButton from './CouncilButton.jsx'
import FeedPreviewNotice from '../common/FeedPreviewNotice.jsx'
import { feedViewState, validateFeed } from './councilFeed.model.js'

export default function CouncilFeed({ resource, auth, criteria, dispatch, onAddPost, onApply, onViewVenue, onRegisterIndividual, onRegisterTeam, searchInputRef }) {
  const fallbackInputRef = useRef(null)
  const inputRef = searchInputRef ?? fallbackInputRef
  let feed = null, validationError = null
  if (resource.data) {
    try { feed = validateFeed(resource.data) } catch (error) { validationError = error }
  }
  const state = feedViewState(validationError ? { ...resource, status: 'error', error: validationError, data: null } : resource, criteria)
  const authorized = auth.status === 'authenticated' && !['signed-out', 'forbidden'].includes(state)
  const visible = authorized ? feed : null
  const clear = () => { dispatch({ type: 'clear' }); inputRef.current?.focus() }
  const actionReason = resource.loading ? 'Please wait for the latest Council information.'
    : ['error', 'unavailable'].includes(state) ? 'Refresh Council information before opening this action.' : undefined
  const pagination = visible?.pagination
  const canShowCards = visible?.campaigns.length > 0 && !validationError

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <CouncilHeader council={visible?.council} />
      {visible?.preview === true && <FeedPreviewNotice />}
      {authorized && <CouncilFeedToolbar criteria={criteria} dispatch={dispatch} categories={visible?.categories ?? []} council={visible?.council} auth={auth} onAddPost={onAddPost} onApply={onApply} refreshFeed={resource.refetch} inputRef={inputRef} actionReason={actionReason} />}
      {state !== 'success' && <CouncilViewState
        state={state}
        title={state === 'empty' ? 'No Council campaigns yet' : undefined}
        description={state === 'empty' ? 'Campaigns will appear here when they are available.' : undefined}
        onRetry={resource.refetch} onClear={clear}
      />}
      {canShowCards && <section aria-label="Council campaigns" aria-busy={resource.loading || undefined} className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {visible.campaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} user={auth.user} onViewVenue={onViewVenue} onRegisterIndividual={onRegisterIndividual} onRegisterTeam={onRegisterTeam} refreshFeed={resource.refetch} actionReason={actionReason} />)}
      </section>}
      {pagination && pagination.totalPages > 1 && <nav aria-label="Campaign pages" className="flex flex-wrap items-center justify-center gap-3">
        <CouncilButton variant="secondary" disabled={resource.loading || criteria.page <= 1} onClick={() => dispatch({ type: 'page', value: criteria.page - 1 })}>Previous</CouncilButton>
        <p role="status" className="text-[13px] text-textSecondary">Page {pagination.page} of {pagination.totalPages}</p>
        <CouncilButton variant="secondary" disabled={resource.loading || criteria.page >= pagination.totalPages} onClick={() => dispatch({ type: 'page', value: criteria.page + 1 })}>Next</CouncilButton>
      </nav>}
    </div>
  )
}
