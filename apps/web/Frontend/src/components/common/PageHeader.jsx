import { Circle } from 'lucide-react'

function StatusBadge({ variant = 'green', icon: Icon, children }) {
  const isGreen = variant === 'green'

  return (
    <span
      className={`inline-flex items-center gap-[6px] rounded-full px-3 py-1 text-[11px] leading-4 tracking-[0.44px] ${
        isGreen
          ? 'bg-cardBg font-semibold text-deep'
          : 'bg-surfaceGray font-medium text-textPrimary'
      }`}
    >
      {isGreen ? (
        <span className="h-2 w-2 rounded-full bg-dark" aria-hidden="true" />
      ) : (
        <span className="flex h-[11px] w-[11px] items-center justify-center text-dark" aria-hidden="true">
          {Icon ? <Icon className="h-[10.5px] w-[10.5px]" /> : <Circle className="h-[10.5px] w-[10.5px]" />}
        </span>
      )}
      {children}
    </span>
  )
}

function PageHeader({ icon: Icon, title, subtitle, children }) {
  return (
    <header className="flex flex-col items-start justify-between gap-4 rounded-panel bg-white p-4 shadow-card sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1">
          {Icon && <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-dark" />}
          <h1 className="min-w-0 wrap-anywhere text-[20px] font-semibold leading-7 tracking-[-0.5px] text-textPrimary">{title}</h1>
        </div>
        {subtitle && <p className="mt-0.5 text-[12px] font-normal leading-[18px] text-textSecondary">{subtitle}</p>}
      </div>
      {children && <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}

export { StatusBadge }
export default PageHeader
