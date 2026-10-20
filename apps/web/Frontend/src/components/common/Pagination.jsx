import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({ page = 1, totalPages = 1, onPageChange }) {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, '...', totalPages)
      } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', page, '...', totalPages)
      }
    }
    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => onPageChange?.(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="flex min-h-11 items-center gap-1 rounded-control bg-white px-2.5 text-[12px] font-medium text-textPrimary shadow-sm transition-colors duration-150 hover:bg-pageBg disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Prev</span>
      </button>

      <div className="flex items-center gap-1">
        {pageNumbers.map((item, index) => {
          if (item === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center text-[12px] text-textMuted select-none"
              >
                ...
              </span>
            )
          }

          const isCurrent = item === page
          return (
            <button
              key={`page-${item}`}
              type="button"
              onClick={() => onPageChange?.(item)}
              aria-current={isCurrent ? 'page' : undefined}
              aria-label={`Page ${item}`}
              className={`flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-[12px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isCurrent
                  ? 'bg-dark text-white shadow-sm'
                  : 'bg-white text-textPrimary hover:bg-pageBg shadow-sm'
              }`}
            >
              {item}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => onPageChange?.(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="flex min-h-11 items-center gap-1 rounded-control bg-white px-2.5 text-[12px] font-medium text-textPrimary shadow-sm transition-colors duration-150 hover:bg-pageBg disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span>Next</span>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </nav>
  )
}

export default Pagination
