import { useState } from 'react'
import { Check, Eye, EyeOff } from 'lucide-react'

export function TextField({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  readOnly = false,
  required = false,
  autoComplete,
  icon: Icon,
  endIcon: EndIcon,
  headerRight,
  className = '',
}) {
  const inputId = id || name

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-semibold uppercase tracking-[0.44px] text-textSecondary"
          >
            {label}
            {required && <span className="ml-0.5 text-textPrimary">*</span>}
          </label>
        )}
        {headerRight}
      </div>

      <div className="relative flex items-center">
        {Icon && (
          <span className="pointer-events-none absolute left-3.5 flex items-center justify-center text-textMuted">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}

        <input
          id={inputId}
          name={name}
          type={type}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`h-11 w-full rounded-xl border text-[14px] transition-colors duration-150 ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${EndIcon ? 'pr-10' : 'pr-3.5'} ${
            readOnly
              ? 'cursor-not-allowed bg-selectBg border-track/60 text-textPrimary'
              : error
              ? 'border-dark bg-white text-textPrimary focus:border-dark focus:outline-none focus:ring-2 focus:ring-ring'
              : 'border-track bg-white text-textPrimary placeholder:text-textSecondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring'
          }`}
        />

        {EndIcon && (
          <span className="pointer-events-none absolute right-3.5 flex items-center justify-center text-textMuted">
            <EndIcon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-[11px] font-medium text-textPrimary">
          {error}
        </p>
      )}
    </div>
  )
}

export function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  placeholder = '••••••••••••',
  error,
  required = false,
  autoComplete = 'current-password',
  icon: Icon,
  className = '',
}) {
  const [showPassword, setShowPassword] = useState(false)
  const inputId = id || name

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-[11px] font-semibold uppercase tracking-[0.44px] text-textSecondary"
        >
          {label}
          {required && <span className="ml-0.5 text-textPrimary">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <span className="pointer-events-none absolute left-3.5 flex items-center justify-center text-textMuted">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}

        <input
          id={inputId}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`h-11 w-full rounded-xl border text-[14px] transition-colors duration-150 ${
            Icon ? 'pl-10' : 'pl-3.5'
          } pr-12 ${
            error
              ? 'border-dark bg-white text-textPrimary focus:border-dark focus:outline-none focus:ring-2 focus:ring-ring'
              : 'border-track bg-white text-textPrimary placeholder:text-textSecondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring'
          }`}
        />

        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-pressed={showPassword}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-0.5 flex h-11 w-11 items-center justify-center rounded text-textMuted transition-colors duration-150 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-[11px] font-medium text-textPrimary">
          {error}
        </p>
      )}
    </div>
  )
}

export function Checkbox({
  id,
  name,
  label,
  checked = false,
  onChange,
  className = '',
}) {
  const inputId = id || name

  return (
    <label htmlFor={inputId} className={`flex items-center gap-2 cursor-pointer select-none ${className}`}>
      <span className="relative flex items-center justify-center">
        <input
          id={inputId}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-[4px] border transition-colors duration-150 ${
            checked
              ? 'border-primary bg-primary text-white'
              : 'border-track bg-white peer-focus-visible:ring-2 peer-focus-visible:ring-primary'
          }`}
        >
          {checked && <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />}
        </span>
      </span>
      <span className="text-[13px] font-medium text-textPrimary">{label}</span>
    </label>
  )
}

export default {
  TextField,
  PasswordField,
  Checkbox,
}
