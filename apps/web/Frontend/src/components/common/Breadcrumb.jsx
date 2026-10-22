import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Breadcrumb({
  items = [],
  separator = 'chevron',
  showHomeIcon = false,
  className = '',
}) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-[12px] ${className}`}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const isFirst = index === 0

          return (
            <li key={item.to || item.label || index} className="flex items-center gap-1.5">
              {index > 0 && (
                <span className="text-textMuted select-none" aria-hidden="true">
                  {separator === 'chevron' ? (
                    <ChevronRight className="h-3.5 w-3.5" />
                  ) : (
                    <span className="px-0.5">/</span>
                  )}
                </span>
              )}

              {isFirst && showHomeIcon && (
                <Home className="h-3.5 w-3.5 text-textSecondary mr-0.5" aria-hidden="true" />
              )}

              {isLast || !item.to ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={
                    isLast
                      ? 'font-bold text-dark'
                      : 'font-medium text-textSecondary'
                  }
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className="font-medium text-textSecondary transition-colors duration-150 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumb
