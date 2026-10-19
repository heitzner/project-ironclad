import { useId, useRef, useState } from 'react'
import PageLayout from '../../components/common/PageLayout.jsx'
import CampaignCard from '../../components/council/CampaignCard.jsx'
import CouncilViewState from '../../components/council/CouncilViewState.jsx'
import { validateFeed } from '../../components/council/councilFeed.model.js'
import announcementsIcon from '../../components/public/assets/announcements.svg'
import nextVenueIcon from '../../components/public/assets/next-venue.svg'
import searchIcon from '../../components/council/assets/a6a0e.svg'
import clearIcon from '../../components/council/assets/7673c.svg'
import categoryIcon from '../../components/council/assets/8fbc7.svg'
import moreIcon from '../../components/council/assets/28520.svg'
import FeedPreviewNotice from '../../components/common/FeedPreviewNotice.jsx'

// Supply a complete public snapshot, or server-filtered pages with onCriteriaChange.
export default function ViewerPage({ data, loading = false, error, onRetry, onCriteriaChange, onViewVenue, onRegisterIndividual, onRegisterTeam }) {
  const [criteria, setCriteria] = useState({ query: '', category: '', page: 1 })
  const input = useRef(null)
  const eventsId = useId()
  let feed, invalid
  if (data) {
    try { feed = validateFeed(data, { publicFeed: true }) }
    catch (failure) { invalid = failure }
  }
  const failure = error ?? invalid
  const state = loading ? 'loading' : failure ? 'error' : !feed ? 'unavailable' : !feed.campaigns.length ? 'empty' : 'success'
  const campaigns = !feed ? [] : onCriteriaChange ? feed.campaigns : feed.campaigns.filter(campaign =>
    (!criteria.category || campaign.category?.id === criteria.category) &&
    `${campaign.title} ${campaign.description ?? ''} ${campaign.venue?.name ?? ''} ${campaign.organizer?.name ?? ''}`.toLowerCase().includes(criteria.query.trim().toLowerCase()))
  function change(next) {
    const updated = { ...criteria, ...next, page: next.page ?? 1 }
    setCriteria(updated)
    onCriteriaChange?.(updated)
  }
  const filtered = Boolean(criteria.query.trim() || criteria.category)
  return <PageLayout>
    <header className="flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-panel bg-white p-4 shadow-card">
      <div className="min-w-0 flex-1 basis-64 break-words">
        <h1 className="flex items-start gap-1 text-xl font-semibold leading-7 tracking-[-0.5px] text-textPrimary"><img src={announcementsIcon} alt="" className="mt-1.5 shrink-0" /><span>Campus News Feed &amp; Announcements</span></h1>
        <p className="mt-1 text-xs leading-[18px] text-textSecondary">Explore campus initiatives, event campaigns, and venue reservations.</p>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] font-semibold leading-4 tracking-[0.44px] text-deep">
        <span className="rounded-full bg-cardBg px-3 py-1">{feed?.activeEventCount == null ? 'Event count unavailable' : `${feed.activeEventCount} Active Events`}</span>
        {feed?.nextVenue?.label && <span className="flex items-center gap-1 rounded-full bg-surfaceGray px-3 py-1"><img src={nextVenueIcon} alt="" />{feed.nextVenue.label}</span>}
      </div>
    </header>
    {feed?.preview === true && <FeedPreviewNotice />}
    <section className="flex min-w-0 flex-wrap items-center gap-2 rounded-panel bg-white p-2 shadow-card" aria-label="Search and filter campus news">
      <div role="search" className="flex min-w-0 flex-[2_1_20rem] items-center rounded-control border border-textMuted bg-pageBg pl-3">
        <img src={searchIcon} alt="" className="shrink-0" />
        <input ref={input} type="search" aria-label="Search campus news" value={criteria.query} onChange={event => change({ query: event.target.value })} placeholder="Search announcements, event campaigns, venues, or organizations…" className="min-h-11 min-w-0 flex-1 rounded-control bg-transparent px-1 text-[13px] text-textPrimary placeholder:text-textSecondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark" />
        <button type="button" aria-label="Clear campus news search" disabled={!criteria.query} onClick={() => { change({ query: '' }); input.current?.focus() }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark disabled:opacity-50"><img src={clearIcon} alt="" /></button>
      </div>
      <label className="relative min-w-0 flex-[1_1_10rem]"><span className="sr-only">Campus news category</span>
        <select value={criteria.category} onChange={event => change({ category: event.target.value })} className="min-h-11 w-full min-w-0 appearance-none rounded-control border border-textMuted bg-selectBg py-2 pl-3 pr-8 text-[11px] font-semibold text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark">
          <option value="">All Categories</option>{feed?.categories.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
        </select><img src={categoryIcon} alt="" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
      </label>
      <a href={`#${eventsId}`} className="flex min-h-11 items-center justify-center gap-2 rounded-control bg-dark px-4 text-[11px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">View More Events <img src={moreIcon} alt="" className="shrink-0" /></a>
    </section>
    <section id={eventsId} tabIndex={-1} aria-label="Campus event campaigns" className="scroll-mt-20 outline-none">
      {state !== 'success' ? <CouncilViewState state={state === 'empty' && filtered ? 'no-results' : state} title={state === 'unavailable' ? 'Campus news is not connected yet' : state === 'error' ? 'Campus news could not be loaded' : state === 'loading' ? 'Loading campus news' : 'No campus announcements yet'} description={state === 'unavailable' ? 'Public announcements and event campaigns will appear here when the campus feed is available.' : undefined} onRetry={onRetry} onClear={() => { change({ query: '', category: '' }); input.current?.focus() }} />
        : campaigns.length ? <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2">{campaigns.map(campaign => <CampaignCard key={campaign.id} campaign={campaign} onViewVenue={onViewVenue} onRegisterIndividual={onRegisterIndividual} onRegisterTeam={onRegisterTeam} refreshFeed={onRetry} />)}</div>
          : <CouncilViewState state="no-results" onClear={() => { change({ query: '', category: '' }); input.current?.focus() }} />}
    </section>
    {feed?.pagination && <nav aria-label="Campus news pages" className="flex flex-wrap items-center justify-end gap-3 text-sm">
      <button type="button" disabled={loading || !onCriteriaChange || feed.pagination.page <= 1} onClick={() => change({ page: feed.pagination.page - 1 })} className="min-h-11 rounded-control border border-textMuted px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark disabled:opacity-50">Previous</button>
      <span>Page {feed.pagination.page} of {feed.pagination.totalPages}</span>
      <button type="button" disabled={loading || !onCriteriaChange || feed.pagination.page >= feed.pagination.totalPages} onClick={() => change({ page: feed.pagination.page + 1 })} className="min-h-11 rounded-control border border-textMuted px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark disabled:opacity-50">Next</button>
    </nav>}
    {feed?.pagination && !onCriteriaChange && <p className="text-xs text-textSecondary">Additional pages are not connected yet.</p>}
  </PageLayout>
}
