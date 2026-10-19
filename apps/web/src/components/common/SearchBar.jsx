import { ArrowRight, ChevronsUpDown, Search, X } from 'lucide-react'

function SearchBar({
  query = '',
  onQueryChange,
  category = '',
  onCategoryChange,
  categories = [],
  placeholder = 'Search announcements, event campaigns, venue permits, or student organizations...',
  actionLabel = 'Search',
  onAction,
}) {
  return (
    <section className="rounded-panel bg-white p-2 shadow-card" aria-label="Search and filter">
      <div className="flex min-h-[34px] items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center rounded-control bg-pageBg px-3 py-[6px]">
          <Search aria-hidden="true" className="mr-2 h-[15px] w-[15px] shrink-0 text-textSecondary" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange?.(event.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] font-normal leading-5 text-textPrimary placeholder:text-textMuted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange?.('')}
              aria-label="Clear search"
              className="ml-2 flex h-5 w-5 items-center justify-center rounded-full text-textMuted transition-colors duration-150 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X aria-hidden="true" className="h-[9.33px] w-[9.33px]" />
            </button>
          )}
        </div>

        <div className="relative h-8 w-48 shrink-0">
          <select
            value={category}
            onChange={(event) => onCategoryChange?.(event.target.value)}
            aria-label="Filter by category"
            className="h-full w-full appearance-none rounded-control bg-selectBg py-2 pl-3 pr-8 text-[11px] font-semibold leading-4 tracking-[0.44px] text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
          className="flex shrink-0 items-center gap-1.5 rounded-control bg-primary px-5 py-2 text-[13px] font-semibold leading-[18px] tracking-[0.26px] text-white shadow-card transition-colors duration-150 hover:bg-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLabel}
          <ArrowRight aria-hidden="true" className="h-[11px] w-[10.67px]" />
        </button>
      </div>
    </section>
  )
}

export default SearchBar
