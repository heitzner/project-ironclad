import { useEffect, useId, useRef, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  RotateCcwKey,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react'
import ironcladLogo from '../../assets/ironclad_lightmode.png'

// Shared controls and scoped animation styles.
const FIELD_CLASS =
  'min-h-11 w-full rounded-control border border-textMuted bg-selectBg px-4 py-3 text-sm text-textPrimary placeholder:text-textSecondary focus:outline-none focus:ring-2 focus:ring-primary'
const BUTTON_CLASS =
  'min-h-11 rounded-control bg-dark px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
const TOGGLE_CLASS =
  'min-h-11 rounded-control border border-white px-8 py-3 text-sm font-semibold hover:bg-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-primary'
const LOGIN_STYLES = `
.ironclad-login {
  width: min(770px, calc(100% - 32px));
  max-width: 770px;
}
.ironclad-login[data-view="forms"] {
  height: auto;
}
.ironclad-login .ic-stage {
  position: relative;
  overflow: hidden;
}
.ironclad-login .ic-form {
  min-height: 0;
  gap: 8px;
  padding: 24px 28px;
}
.ironclad-login .ic-form > img {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}
.ironclad-login .ic-form > h2 {
  font-size: 22px;
  line-height: 28px;
}
.ironclad-login .ic-feedback {
  min-height: 40px;
  overflow-wrap: anywhere;
}
.ironclad-login .ic-signin {
  justify-content: flex-start;
}
.ironclad-login .ic-signin > img {
  margin-top: auto;
}
.ironclad-login .ic-signin > p:last-child {
  margin-bottom: auto;
}
.ironclad-login .ic-form > * {
  flex-shrink: 0;
}
.ironclad-login .ic-signup {
  justify-content: flex-start;
  padding-top: 28px;
}
.ironclad-login button:disabled {
  cursor: wait;
  opacity: 0.65;
}
.ironclad-login .ic-form[inert],
.ironclad-login .ic-welcome[inert] {
  display: none;
}
.ironclad-login .ic-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 32px 28px;
  text-align: center;
}
@media (min-width: 768px) {
  .ironclad-login[data-view="forms"] {
    height: min(600px, calc(100svh - 32px));
    overflow: hidden;
  }
  .ironclad-login .ic-stage {
    height: 100%;
  }
  .ironclad-login .ic-form,
  .ironclad-login .ic-form[inert] {
    display: flex;
    position: absolute;
    top: 0;
    left: 0;
    width: 50%;
    height: 100%;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: thin;
    visibility: visible;
  }
  .ironclad-login .ic-form[inert] {
    visibility: hidden;
    transition: visibility 0s linear 0.7s;
    /* Keep the gutter stable without flashing the covered form's scrollbar. */
    scrollbar-color: transparent transparent;
  }
  .ironclad-login .ic-signup,
  .ironclad-login .ic-signup[inert] {
    left: 50%;
  }
  .ironclad-login .ic-overlay-window {
    position: absolute;
    top: 0;
    left: 50%;
    width: 50%;
    height: 100%;
    overflow: hidden;
    border-radius: 64px 0 0 64px;
    z-index: 6;
    transition:
      transform 0.7s cubic-bezier(0.22, 1, 0.36, 1),
      border-radius 0.7s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .ironclad-login[data-signup="true"] .ic-overlay-window {
    transform: translateX(-100%);
    border-radius: 0 64px 64px 0;
  }
  .ironclad-login .ic-overlay {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .ironclad-login .ic-welcome,
  .ironclad-login .ic-welcome[inert] {
    display: flex;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    justify-content: safe center;
    transition: opacity 0.25s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .ironclad-login .ic-welcome[inert] {
    visibility: hidden;
  }
  .ironclad-login .ic-welcome-back {
    opacity: 0;
    transform: translateX(-12%);
  }
  .ironclad-login .ic-welcome-new {
    opacity: 1;
    transform: translateX(0);
  }
  .ironclad-login[data-signup="true"] .ic-welcome-back {
    opacity: 1;
    transform: translateX(0);
  }
  .ironclad-login[data-signup="true"] .ic-welcome-new {
    opacity: 0;
    transform: translateX(12%);
  }
}
@media (prefers-reduced-motion: reduce) {
  /* Keep the requested panel slide and form-cover timing in both preferences. */
  .ironclad-login .ic-overlay,
  .ironclad-login .ic-welcome {
    transition: none;
    animation: none;
  }
}
`

function PasswordField({ label, name, autoComplete, minLength, fieldClass, disabled }) {
  const [visible, setVisible] = useState(false)
  const inputId = useId()
  const Icon = visible ? EyeOff : Eye
  return (
    <div className="grid gap-1 text-xs font-semibold">
      <label htmlFor={inputId}>{label}</label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          disabled={disabled}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          className={`${fieldClass} pr-12`}
        />
        <button
          type="button"
          disabled={disabled}
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-pressed={visible}
          aria-controls={inputId}
          onClick={() => setVisible((value) => !value)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-control text-textMuted hover:text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

// Registration fields: student identity, campus email, and course/year/section.
function RegistrationFields({ disabled }) {
  return (
    <>
      <label className="grid gap-1 text-xs font-semibold">
        Full name
        <input name="name" autoComplete="name" required disabled={disabled} maxLength={120} className={FIELD_CLASS} />
      </label>
      <label className="grid gap-1 text-xs font-semibold">
        Registered campus email
        <input
          name="email"
          disabled={disabled}
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className={FIELD_CLASS}
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold">
        Course
        <input
          name="course"
          disabled={disabled}
          type="text"
          placeholder="e.g. BSCS"
          autoCapitalize="characters"
          pattern="[A-Za-z][A-Za-z0-9]{1,15}"
          title="Enter your course abbreviation, e.g. BSCS"
          required
          maxLength={16}
          className={FIELD_CLASS}
        />
      </label>
      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="mb-1 text-xs font-semibold">Section</legend>
        <label className="grid gap-1 text-xs font-semibold">
          Year level
          <select
            name="yearLevel"
            disabled={disabled}
            aria-label="Year level"
            required
            defaultValue=""
            className={FIELD_CLASS}
          >
            <option value="" disabled>
              Year
            </option>
            {['1', '2', '3', '4'].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          Section letter
          <select
            name="section"
            disabled={disabled}
            aria-label="Section letter"
            required
            defaultValue=""
            className={FIELD_CLASS}
          >
            <option value="" disabled>
              Section
            </option>
            {['A', 'B', 'C', 'D'].map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
    </>
  )
}

// Both forms stay mounted to retain input values during the sliding animation.
function LoginForm({
  registration,
  inactive,
  busy,
  id,
  inputRef,
  onSubmit,
  onForgotPassword,
  message,
  blocked,
  preview,
}) {
  const mode = registration ? 'signup' : 'signin'

  return (
    <form
      inert={inactive}
      aria-hidden={inactive}
      aria-busy={busy}
      onSubmit={onSubmit}
      className={`ic-form ic-${mode} flex flex-col justify-center gap-4 bg-white px-6 py-16 sm:px-10`}
    >
      <img src={ironcladLogo} alt="IronClad" className="mx-auto h-16 w-16 object-contain" />
      <h2 id={`${id}-${mode}-title`} className="text-center text-2xl font-bold">
        {registration ? 'Create Account' : 'Sign In'}
      </h2>
      <p className="text-center text-xs text-textSecondary">
        {registration
          ? 'Register with your student details'
          : 'Your username is your student number'}
      </p>
      <label className="grid gap-1 text-xs font-semibold">
        {registration ? 'Student ID' : 'Username'}
        <input
          ref={inputRef}
          name="studentId"
          disabled={busy}
          type="text"
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="e.g. 20241200-C"
          pattern="[0-9]{8}-[A-Za-z]"
          title="8 digits, a hyphen, and a letter, e.g. 20241200-C"
          required
          maxLength={10}
          className={FIELD_CLASS}
        />
      </label>
      {registration && <RegistrationFields disabled={busy} />}
      <PasswordField
        label="Password"
        name="password"
        autoComplete={registration ? 'new-password' : 'current-password'}
        minLength={registration ? 8 : undefined}
        fieldClass={FIELD_CLASS}
        disabled={busy}
      />
      {registration && (
        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          minLength={8}
          fieldClass={FIELD_CLASS}
          disabled={busy}
        />
      )}
      {!registration && (
        <div className="flex flex-wrap items-center justify-between gap-x-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[11px] font-medium text-textSecondary">
            <input
              type="checkbox"
              name="remember"
              disabled={busy}
              className="h-4 w-4 rounded-chip accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={onForgotPassword}
            disabled={busy}
            className="min-h-11 rounded-control text-[11px] font-semibold text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Forgot Password?
          </button>
        </div>
      )}
      <p
        id={`${id}-${mode}-message`}
        role="status"
        className="ic-feedback text-xs leading-5 text-textSecondary"
      >
        {inactive ? '' : message}
      </p>
      <button type="submit" disabled={busy || blocked} className={BUTTON_CLASS}>
        {busy && !inactive ? 'Please wait…' : registration ? 'Sign Up' : 'Sign In'}
      </button>
      <p className="text-center text-[10px] leading-4 text-textSecondary">
        {preview ? 'Preview access for Admin, Council and Student.' : 'Use your campus account to continue.'}
      </p>
    </form>
  )
}

function WelcomePanels({ signUp, busy, onSwitch }) {
  return (
    <div className="ic-overlay-window bg-dark text-white">
      <div className="ic-overlay">
        <aside className="ic-welcome ic-welcome-back" inert={!signUp} aria-hidden={!signUp}>
          <h3 className="text-3xl font-bold">Welcome to IronClad!</h3>
          <p className="max-w-xs text-sm leading-6">
            Register with your personal details to use all of the portal features.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSwitch(false)}
            className={TOGGLE_CLASS}
          >
            Sign In
          </button>
        </aside>
        <aside className="ic-welcome ic-welcome-new" inert={signUp} aria-hidden={signUp}>
          <h3 className="text-3xl font-bold">Welcome back!</h3>
          <p className="max-w-xs text-sm leading-6">
            Enter your personal details to use all of the portal features.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSwitch(true)}
            className={TOGGLE_CLASS}
          >
            Sign Up
          </button>
        </aside>
      </div>
    </div>
  )
}

// Reset and account-created screens share the same dialog and focus lifecycle.
function AccountFeedback({
  view,
  id,
  message,
  onBack,
  onClose,
  onReset,
  resetField,
  confirmationHeading,
  busy,
}) {
  return (
    <section className="relative grid gap-7 px-6 py-8 sm:px-12 sm:py-12">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="flex min-h-11 items-center gap-2 rounded-control text-sm font-medium text-textSecondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          Back to Sign In
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close dialog"
          className="flex h-11 w-11 items-center justify-center rounded-full text-textMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X aria-hidden="true" className="h-6 w-6" />
        </button>
      </div>
      <div className="grid justify-items-center gap-4 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full border border-soft bg-cardBg text-dark shadow-card">
          {view === 'reset' ? (
            <RotateCcwKey aria-hidden="true" className="h-9 w-9" />
          ) : (
            <CheckCircle2 aria-hidden="true" className="h-9 w-9" />
          )}
        </span>
        <h2
          ref={confirmationHeading}
          tabIndex={-1}
          id={`${id}-${view}-title`}
          className="rounded-control text-3xl font-bold focus:outline-none"
        >
          {view === 'reset' ? 'Account Reset' : 'Registration received'}
        </h2>
        <p className="max-w-xl text-sm leading-7 text-textSecondary">
          {view === 'reset'
            ? 'Enter your registered campus email to request an account reset.'
            : 'Your registration was received. Follow the account status shown below.'}
        </p>
      </div>
      {view === 'reset' ? (
        <form className="grid gap-6" onSubmit={onReset}>
          <label className="grid gap-3 text-sm font-semibold uppercase tracking-wide">
            Registered campus email
            <span className="relative">
              <Mail aria-hidden="true" className="absolute left-4 top-4 h-5 w-5 text-textMuted" />
              <input
                ref={resetField}
                type="email"
                name="email"
                disabled={busy}
                autoComplete="email"
                placeholder="e.g. student@campus.edu"
                required
                className={`${FIELD_CLASS} pl-12 normal-case tracking-normal`}
              />
            </span>
          </label>
          <p className="flex items-start gap-3 rounded-card border border-soft bg-cardBg p-4 text-sm leading-6 text-dark">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
            Email verification and reset links require the campus authentication service.
          </p>
          <p
            id={`${id}-reset-message`}
            role="status"
            className="text-sm leading-6 text-textSecondary"
          >
            {message}
          </p>
          <button
            type="submit"
            disabled={busy}
            className={`${BUTTON_CLASS} flex items-center justify-center gap-3`}
          >
            {busy ? 'Requesting…' : 'Send Reset Link'} <Send aria-hidden="true" className="h-5 w-5" />
          </button>
          <p className="border-t border-track pt-6 text-center text-sm text-textSecondary">
            Remembered your password?{' '}
            <button
              type="button"
              onClick={onBack}
              disabled={busy}
              className="min-h-11 rounded-control font-semibold text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Back to Login
            </button>
          </p>
        </form>
      ) : (
        <>
          <p
            id={`${id}-created-message`}
            role="status"
            className="rounded-card bg-cardBg p-4 text-center text-sm leading-6 text-dark"
          >
            {message}
          </p>
          <button type="button" onClick={onBack} className={BUTTON_CLASS}>
            Back to Sign In
          </button>
        </>
      )}
    </section>
  )
}

// Component and scoped styles stay together; no separate login stylesheet.
export default function LogIn({ onClose, onSignedIn, handlers, initialMode = 'signin' }) {
  const dialog = useRef(null)
  const signInField = useRef(null)
  const signUpField = useRef(null)
  const resetField = useRef(null)
  const confirmationHeading = useRef(null)
  const id = useId()
  const [signUp, setSignUp] = useState(initialMode === 'signup')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState('forms')
  const [registrationBlocked, setRegistrationBlocked] = useState(false)
  const submitGuard = useRef(false)
  const mounted = useRef(false)

  useEffect(() => {
    const element = dialog.current
    const trigger = document.activeElement
    const previousOverflow = document.body.style.overflow
    mounted.current = true
    element.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      mounted.current = false
      element.close()
      document.body.style.overflow = previousOverflow
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])

  useEffect(() => {
    const field =
      view === 'reset'
        ? resetField.current
        : view === 'created'
          ? confirmationHeading.current
          : signUp
            ? signUpField.current
            : signInField.current
    const form = field?.closest('.ic-form')
    if (form) form.scrollTop = 0
    field?.focus({ preventScroll: true })
    if (dialog.current) dialog.current.scrollTop = 0
  }, [signUp, view])

  function backToSignIn() {
    if (submitGuard.current) return
    setView('forms')
    setSignUp(false)
    setMessage('')
  }

  function switchForm(next) {
    if (busy) return
    setSignUp(next)
    setMessage('')
  }

  function openReset() {
    if (submitGuard.current) return
    setMessage('')
    setView('reset')
  }

  async function requestReset(event) {
    event.preventDefault()
    if (submitGuard.current) return
    if (typeof handlers?.resetPassword !== 'function') { setMessage('Account reset is not connected yet. No email has been sent.'); return }
    submitGuard.current = true
    setBusy(true)
    try {
      const result = await handlers.resetPassword({ email: new FormData(event.currentTarget).get('email') })
      if (result?.confirmed !== true || typeof result?.message !== 'string' || !result.message.trim()) throw new Error('The reset request has not been confirmed. Check your account status before trying again.')
      if (mounted.current) setMessage(result.message)
    } catch (error) { if (mounted.current) setMessage(error?.message || 'Unable to request an account reset.') }
    finally { submitGuard.current = false; if (mounted.current) setBusy(false) }
  }

  async function submit(event) {
    event.preventDefault()
    if (submitGuard.current) return
    if (signUp && registrationBlocked) { setMessage('Registration is still unconfirmed. Check your account status before trying again.'); return }
    const fields = new FormData(event.currentTarget)
    const form = event.currentTarget
    const handler = signUp ? handlers?.register : handlers?.signIn
    if (typeof handler !== 'function') { setMessage(`${signUp ? 'Registration' : 'Sign-in'} is not connected yet. Your information has not been submitted.`); return }
    if (signUp && fields.get('password') !== fields.get('confirmPassword')) { setMessage('Passwords must match.'); return }
    submitGuard.current = true
    setBusy(true)
    setMessage('')
    try {
      if (signUp) {
        const result = await handler(Object.fromEntries(fields))
        if (result?.confirmed !== true || typeof result?.message !== 'string' || !result.message.trim()) throw new Error('Registration has not been confirmed. Check your account status before trying again.')
        if (!mounted.current) return
        form.reset()
        setSignUp(false)
        setView('created')
        setMessage(result.message)
      } else {
        const result = await handler({ studentId: fields.get('studentId'), password: fields.get('password'), remember: fields.get('remember') === 'on' })
        if (!mounted.current) return
        await onSignedIn?.(result)
      }
    } catch (error) {
      if (mounted.current && signUp && ![400, 401, 403, 409, 422].includes(error?.status)) setRegistrationBlocked(true)
      if (mounted.current) setMessage(error?.message || 'Unable to continue. Please try again.')
    } finally {
      submitGuard.current = false
      if (mounted.current) setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      data-view={view}
      data-signup={signUp}
      aria-labelledby={
        view === 'forms' ? `${id}-${signUp ? 'signup' : 'signin'}-title` : `${id}-${view}-title`
      }
      aria-describedby={
        message
          ? view === 'forms'
            ? `${id}-${signUp ? 'signup' : 'signin'}-message`
            : `${id}-${view}-message`
          : undefined
      }
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const fields = [...event.currentTarget.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')].filter(node => !node.disabled && !node.closest('[inert], [hidden]') && node.getClientRects().length)
        const first = fields[0], last = fields.at(-1)
        if (event.shiftKey && (document.activeElement === first || !fields.includes(document.activeElement))) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && (document.activeElement === last || !fields.includes(document.activeElement))) { event.preventDefault(); first?.focus() }
      }}
      onClick={(event) => {
        if (!busy && event.target === event.currentTarget) onClose()
      }}
      className="ironclad-login m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-card border-0 bg-white p-0 text-textPrimary shadow-nav backdrop:bg-deep/60 backdrop:backdrop-blur-sm"
    >
      <style>{LOGIN_STYLES}</style>
      {view !== 'forms' && (
        <AccountFeedback
          view={view}
          id={id}
          message={message}
          onBack={backToSignIn}
          onClose={() => { if (!busy) onClose() }}
          onReset={requestReset}
          resetField={resetField}
          confirmationHeading={confirmationHeading}
          busy={busy}
        />
      )}
      <div className="ic-stage" hidden={view !== 'forms'}>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close sign in"
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-textSecondary shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
        {/* Forms retain their sides and values; the rounded green panel slides over the inactive side. */}
        {[false, true].map((registration) => (
          <LoginForm
            key={registration ? 'signup' : 'signin'}
            registration={registration}
            inactive={signUp !== registration}
            busy={busy}
            id={id}
            inputRef={registration ? signUpField : signInField}
            onSubmit={submit}
            onForgotPassword={openReset}
            blocked={registration && registrationBlocked}
            message={registration && registrationBlocked ? 'Registration is still unconfirmed. Sign in to check your account or contact your administrator before trying again.' : message}
            preview={handlers?.preview === true}
          />
        ))}
        <WelcomePanels signUp={signUp} busy={busy} onSwitch={switchForm} />
      </div>
    </dialog>
  )
}
