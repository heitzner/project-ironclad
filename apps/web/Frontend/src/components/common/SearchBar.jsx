import { ArrowRight, ChevronsUpDown, Search, X } from 'lucide-react'

function SearchBar({
  query = '',
  onQueryChange,
  category = '',
  onCategoryChange,
  categories = [],
  searchLabel = 'Search campus news',
  placeholder = 'Search announcements, event campaigns, venue permits, or student organizations...',
  actionLabel = 'Search',
  onAction,
}) {
  return (
    <section className="rounded-panel bg-white p-2 shadow-card" aria-label="Search and filter">
      <div className="flex min-h-11 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <div className="flex min-h-11 w-full min-w-0 flex-1 items-center rounded-control border border-textMuted bg-pageBg px-3">
          <Search aria-hidden="true" className="mr-2 h-[15px] w-[15px] shrink-0 text-textSecondary" />
          <input
            type="search"
            aria-label={searchLabel}
            value={query}
            onChange={(event) => onQueryChange?.(event.target.value)}
            placeholder={placeholder}
            className="min-h-11 w-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] font-normal leading-5 text-textPrimary placeholder:text-textSecondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange?.('')}
              aria-label="Clear search"
              className="ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-textMuted transition-colors duration-150 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X aria-hidden="true" className="h-[9.33px] w-[9.33px]" />
            </button>
          )}
        </div>

        <div className="relative h-11 w-full shrink-0 sm:w-48">
          <select
            value={category}
            onChange={(event) => onCategoryChange?.(event.target.value)}
            aria-label="Filter by category"
            className="h-full w-full appearance-none rounded-control border border-textMuted bg-selectBg py-2 pl-3 pr-8 text-[11px] font-semibold leading-4 tracking-[0.44px] text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">All Categories</option>
            {categories.map((item) => {
              const value = typeof item === 'string' ? item : item.value
              const label = typeof item === 'string' ? item : item.label
              return <option key={value} value={value}>{label}</option>
            })}
          </select>
          <ChevronsUpDown aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 h-3 w-[6px] -translate-y-1/2 text-textSecondary" />
        </div>

        <button
          type="button"
          onClick={onAction}
          disabled={!onAction}
          className="flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-control bg-dark px-5 py-2 text-[13px] font-semibold leading-[18px] tracking-[0.26px] text-white shadow-card transition-colors duration-150 hover:bg-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {actionLabel}
          <ArrowRight aria-hidden="true" className="h-[11px] w-[10.67px]" />
        </button>
      </div>
    </section>
  )
}

export default SearchBar
