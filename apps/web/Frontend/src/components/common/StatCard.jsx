export function StatCard({
  variant = 'green',
  icon: Icon,
  label,
  value,
}) {
  const isGreen = variant === 'green'

  return (
    <div
      className={`flex items-center gap-2.5 rounded-panel px-3 py-2 shadow-card min-w-[150px] ${
        isGreen ? 'bg-cardBg' : 'bg-surfaceGray'
      }`}
    >
      {Icon && (
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-control ${
            isGreen ? 'bg-dark text-white' : 'bg-white text-textPrimary shadow-sm'
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      )}

      <div className="flex flex-col">
        <span className="text-[10px] font-medium leading-[14px] tracking-[0.5px] text-textSecondary">
          {label}
        </span>
        <span className="text-[16px] font-bold leading-5 text-textPrimary">
          {value}
        </span>
      </div>
    </div>
  )
}

export default StatCard
