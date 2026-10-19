import { useId } from 'react'

export default function CouncilButton({ children, variant = 'primary', size = 'default', fullWidth = false, busy = false, busyLabel = 'Please wait…', disabled = false, disabledReason, className = '', type = 'button', ...props }) {
  const reasonId = useId()
  const colors = variant === 'primary'
    ? 'bg-dark text-white hover:bg-deep'
    : variant === 'venue' ? 'bg-soft text-textPrimary hover:bg-footerBg'
      : variant === 'danger' ? 'bg-red-700 text-white hover:bg-red-800'
        : variant === 'quiet' ? 'bg-transparent text-textSecondary hover:bg-selectBg' : 'bg-selectBg text-textPrimary hover:bg-surfaceGray'
  const shadow = variant === 'quiet' ? 'shadow-none' : 'shadow-card'
  const typography = size === 'compact' ? 'text-[11px] leading-4 tracking-[0.44px]' : 'text-[13px] leading-[18px]'

  return (
    <span className={`inline-flex min-w-0 max-w-full flex-col items-start gap-1 wrap-anywhere ${fullWidth ? 'w-full' : ''}`}>
      <button
        {...props}
        type={type}
        disabled={disabled || busy || Boolean(disabledReason)}
        aria-busy={busy || undefined}
        aria-describedby={[props['aria-describedby'], disabledReason ? reasonId : null].filter(Boolean).join(' ') || undefined}
        className={`inline-flex min-h-11 min-w-11 max-w-full items-center justify-center gap-1.5 rounded-control px-4 py-2 whitespace-normal font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${shadow} ${typography} ${colors} ${fullWidth ? 'w-full' : ''} ${className}`}
      >
        {busy ? busyLabel : children}
      </button>
      {disabledReason && <span id={reasonId} className="min-w-0 text-[12px] leading-[18px] wrap-anywhere text-textSecondary">{disabledReason}</span>}
    </span>
  )
}
