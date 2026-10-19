import CouncilFeedAction from './CouncilFeedAction.jsx'
import searchIcon from './assets/a6a0e.svg'
import clearIcon from './assets/7673c.svg'
import categoryIcon from './assets/8fbc7.svg'
import plusIcon from './assets/ee36b.svg'

// The shared SearchBar has one fixed action; Council needs two independently gated actions and original SVGs.
export default function CouncilFeedToolbar({ criteria, dispatch, categories, council, auth, onAddPost, onApply, refreshFeed, inputRef, actionReason }) {
  const postReason = actionReason || (!council ? 'Council information is needed before posting.'
    : auth.capabilities.canCreatePost !== true ? 'Posting is not available for your account.' : undefined)
  const applyReason = actionReason || (!council ? 'Council information is needed before applying.'
    : auth.capabilities.canApply !== true ? 'Self-application is not available for your account.' : undefined)
  return (
    <section aria-label="Search and filter Council campaigns" className="flex min-w-0 flex-wrap items-start gap-2 rounded-panel bg-white p-2 shadow-card">
      <div role="search" className="flex min-h-11 min-w-0 flex-[2_1_20rem] items-center rounded-control border border-textMuted bg-pageBg pl-3 pr-1">
        <img src={searchIcon} alt="" className="shrink-0" />
        <input
          ref={inputRef}
          type="search"
          aria-label="Search Council campaigns"
          placeholder="Search announcements, event campaigns, venue permits, or student organizations…"
          value={criteria.query}
          onChange={(event) => dispatch({ type: 'query', value: event.target.value })}
          className="min-h-11 min-w-0 flex-1 rounded-control bg-transparent text-[13px] leading-5 text-textPrimary placeholder:text-textSecondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark"
        />
        {criteria.query && <button
          type="button" aria-label="Clear search"
          onClick={() => { dispatch({ type: 'query', value: '' }); inputRef.current?.focus() }}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark"
        ><img src={clearIcon} alt="" /></button>}
      </div>
      <div className="relative min-w-0 flex-[1_1_10rem]">
        <select
          aria-label="Filter campaigns by category" value={criteria.category}
          onChange={(event) => dispatch({ type: 'category', value: event.target.value })}
          className="min-h-11 w-full min-w-0 appearance-none rounded-control border border-textMuted bg-selectBg py-2 pl-3 pr-8 text-[11px] font-semibold leading-4 tracking-[0.44px] text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark"
        >
          <option value="">All Categories</option>
          {criteria.category && !categories.some((item) => item.id === criteria.category) && <option value={criteria.category}>Selected category</option>}
          {categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <img src={categoryIcon} alt="" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
      </div>
      <CouncilFeedAction onAction={onAddPost} subject={council} scope={auth.user} refreshFeed={refreshFeed} disabledReason={postReason}>
        Add Post <img src={plusIcon} alt="" className="shrink-0" />
      </CouncilFeedAction>
      <CouncilFeedAction onAction={onApply} subject={auth.user} scope={council} disabledReason={applyReason}>
        Apply a Member <img src={plusIcon} alt="" className="shrink-0" />
      </CouncilFeedAction>
    </section>
  )
}
