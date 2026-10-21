import { ChevronDown, Lock, Pencil } from 'lucide-react'

export function FieldCard({
  label,
  value,
  isLocked = false,
  isEditable = false,
  isSelect = false,
  options = [],
  onChange,
  type = 'text',
  placeholder = '',
  id,
  required = false,
}) {
  return (
    <div className="rounded-control bg-white p-2 shadow-card border border-track/30">
      <div className="flex items-center justify-between pb-1.5">
        <label
          htmlFor={id}
          className="text-[10px] font-medium text-textSecondary"
        >
          {label}
        </label>
        {isLocked && (
          <span title="Locked credential" aria-label="Locked credential">
            <Lock className="h-3.5 w-3.5 text-textMuted" aria-hidden="true" />
          </span>
        )}
      </div>

      {isLocked ? (
        <div
          id={id}
          aria-readonly="true"
          className="flex h-11 items-center rounded-control bg-selectBg px-3 text-[15px] font-semibold text-textPrimary truncate"
        >
          {value || '-'}
        </div>
      ) : isSelect ? (
        <div className="relative h-11 w-full">
          <select
            id={id}
            value={value ?? ''}
            onChange={(e) => onChange?.(e.target.value)}
            className="h-full w-full appearance-none rounded-lg border border-track bg-white px-3 pr-9 text-[15px] font-semibold text-textPrimary focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary"
            aria-hidden="true"
          />
        </div>
      ) : isEditable ? (
        <div className="relative flex items-center">
          <input
            id={id}
            type={type}
            required={required}
            value={value ?? ''}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            className="h-11 w-full rounded-lg border border-track bg-white px-3 pr-9 text-[15px] font-semibold text-textPrimary placeholder:text-textSecondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Pencil className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-textMuted" aria-hidden="true" />
        </div>
      ) : (
        <div className="flex h-11 items-center rounded-lg bg-white px-3 text-[16px] font-semibold text-textPrimary">
          {value || '-'}
        </div>
      )}
    </div>
  )
}

export default FieldCard
