import { useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Mail, RotateCcwKey, Send, ShieldCheck, X } from 'lucide-react'
import ironcladLogo from '../../assets/ironclad_lightmode.png'
import { registerTestStudent, signInTestAccount } from './test-auth.js'

function PasswordField({ label, name, autoComplete, minLength, fieldClass }) {
  const [visible, setVisible] = useState(false)
  const inputId = useId()
  const Icon = visible ? EyeOff : Eye
  return <div className="grid gap-1 text-xs font-semibold">
    <label htmlFor={inputId}>{label}</label>
    <div className="relative">
      <input id={inputId} name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete} minLength={minLength} required className={`${fieldClass} pr-12`} />
      <button type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} aria-controls={inputId}
        onClick={() => setVisible(value => !value)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-control text-textMuted hover:text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
  </div>
}

// Component and scoped styles stay together; no separate login stylesheet.
export default function LogIn({ onClose, onSignedIn }) {
  const dialog = useRef(null)
  const signInField = useRef(null)
  const signUpField = useRef(null)
  const resetField = useRef(null)
  const confirmationHeading = useRef(null)
  const id = useId()
  const [signUp, setSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState('forms')

  useEffect(() => {
    const element = dialog.current
    const trigger = document.activeElement
    const previousOverflow = document.body.style.overflow
    element.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      element.close()
      document.body.style.overflow = previousOverflow
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])

  useEffect(() => {
    const field = view === 'reset' ? resetField.current : view === 'created' ? confirmationHeading.current : signUp ? signUpField.current : signInField.current
    field?.focus({ preventScroll: true })
    if (dialog.current) dialog.current.scrollTop = 0
  }, [signUp, view])

  function backToSignIn() {
    setView('forms')
    setSignUp(false)
    setMessage('')
  }

  function switchForm(next) {
    if (busy) return
    setSignUp(next)
    setMessage('')
  }

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    const fields = new FormData(event.currentTarget)
    setBusy(true)
    setMessage('')
    try {
      if (signUp) {
        await registerTestStudent(Object.fromEntries(fields))
        event.target.reset()
        setSignUp(false)
        setView('created')
        setMessage('Test student account created. Sign in with your student ID and password. This account is available in this browser tab until it is closed.')
      } else {
        await signInTestAccount(fields.get('studentId'), fields.get('password'))
        onSignedIn?.()
        onClose()
      }
    } catch (error) {
      setMessage(error.message || 'Unable to continue. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const fieldClass = 'min-h-11 w-full rounded-control border border-track bg-selectBg px-4 py-3 text-sm text-textPrimary placeholder:text-textMuted focus:outline-none focus:ring-2 focus:ring-primary'
  const buttonClass = 'min-h-11 rounded-control bg-primary px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
  const toggleClass = 'min-h-11 rounded-control border border-white px-8 py-3 text-sm font-semibold hover:bg-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-primary'

  return (
    <dialog ref={dialog} data-signup={signUp} aria-labelledby={view === 'forms' ? `${id}-${signUp ? 'signup' : 'signin'}-title` : `${id}-${view}-title`}
      aria-describedby={message ? view === 'forms' ? `${id}-${signUp ? 'signup' : 'signin'}-message` : `${id}-${view}-message` : undefined}
      onCancel={event => { event.preventDefault(); if (!busy) onClose() }}
      onClick={event => { if (!busy && event.target === event.currentTarget) onClose() }}
      className="ironclad-login m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-card border-0 bg-white p-0 text-textPrimary shadow-nav backdrop:bg-deep/60 backdrop:backdrop-blur-sm">
      <style>{`
        .ironclad-login .ic-stage { position: relative; overflow: hidden; }
        .ironclad-login .ic-form { min-height: 540px; }
        .ironclad-login .ic-signup { gap: 10px; }
        .ironclad-login button:disabled { cursor: wait; opacity: .65; }
        .ironclad-login .ic-form[inert],
        .ironclad-login .ic-welcome[inert] { display: none; }
        .ironclad-login .ic-welcome { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; padding: 40px 30px; text-align: center; }
        @media (min-width: 768px) {
          .ironclad-login .ic-stage { min-height: 940px; }
          .ironclad-login .ic-form,
          .ironclad-login .ic-form[inert] { display: flex; position: absolute; top: 0; left: 0; width: 50%; height: 100%; min-height: 0; transition: transform .6s ease-in-out; }
          .ironclad-login .ic-signin { z-index: 2; }
          .ironclad-login .ic-signup { z-index: 1; opacity: 0; }
          .ironclad-login[data-signup="true"] .ic-signin { transform: translateX(100%); }
          .ironclad-login[data-signup="true"] .ic-signup { transform: translateX(100%); opacity: 1; z-index: 5; animation: ic-form-swap .6s; }
          .ironclad-login .ic-overlay-window { position: absolute; top: 0; left: 50%; width: 50%; height: 100%; overflow: hidden; border-radius: 150px 0 0 150px; z-index: 6; transition: transform .6s ease-in-out, border-radius .6s ease-in-out; }
          .ironclad-login[data-signup="true"] .ic-overlay-window { transform: translateX(-100%); border-radius: 0 150px 150px 0; }
          .ironclad-login .ic-overlay { position: relative; left: -100%; width: 200%; height: 100%; transform: translateX(0); transition: transform .6s ease-in-out; }
          .ironclad-login[data-signup="true"] .ic-overlay { transform: translateX(50%); }
          .ironclad-login .ic-welcome,
          .ironclad-login .ic-welcome[inert] { display: flex; position: absolute; top: 0; width: 50%; height: 100%; transition: transform .6s ease-in-out; }
          .ironclad-login .ic-welcome-back { left: 0; transform: translateX(-200%); }
          .ironclad-login .ic-welcome-new { right: 0; transform: translateX(0); }
          .ironclad-login[data-signup="true"] .ic-welcome-back { transform: translateX(0); }
          .ironclad-login[data-signup="true"] .ic-welcome-new { transform: translateX(200%); }
        }
        @keyframes ic-form-swap {
          0%, 49.99% { opacity: 0; z-index: 1; }
          50%, 100% { opacity: 1; z-index: 5; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ironclad-login .ic-form,
          .ironclad-login .ic-overlay-window,
          .ironclad-login .ic-overlay,
          .ironclad-login .ic-welcome { transition: none; animation: none; }
        }
      `}</style>
      {view !== 'forms' && <section className="relative grid gap-7 px-6 py-8 sm:px-12 sm:py-12">
        <div className="flex items-center justify-between gap-4">
          <button type="button" onClick={backToSignIn} className="flex min-h-11 items-center gap-2 rounded-control text-sm font-medium text-textSecondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />Back to Sign In
          </button>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="flex h-11 w-11 items-center justify-center rounded-full text-textMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X aria-hidden="true" className="h-6 w-6" /></button>
        </div>
        <div className="grid justify-items-center gap-4 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full border border-soft bg-cardBg text-dark shadow-card">
            {view === 'reset' ? <RotateCcwKey aria-hidden="true" className="h-9 w-9" /> : <CheckCircle2 aria-hidden="true" className="h-9 w-9" />}
          </span>
          <h2 ref={confirmationHeading} tabIndex={-1} id={`${id}-${view}-title`} className="rounded-control text-3xl font-bold focus:outline-none">{view === 'reset' ? 'Account Reset' : 'Account Created'}</h2>
          <p className="max-w-xl text-sm leading-7 text-textSecondary">{view === 'reset' ? 'Enter your registered campus email to request an account reset.' : 'Your test student account is ready. Use your student number as your username to sign in.'}</p>
        </div>
        {view === 'reset' ? <form className="grid gap-6" onSubmit={event => { event.preventDefault(); setMessage('Reset email delivery is not connected yet. No email has been sent. Please contact your portal administrator.') }}>
          <label className="grid gap-3 text-sm font-semibold uppercase tracking-wide">Registered campus email
            <span className="relative">
              <Mail aria-hidden="true" className="absolute left-4 top-4 h-5 w-5 text-textMuted" />
              <input ref={resetField} type="email" name="email" autoComplete="email" placeholder="e.g. student@campus.edu" required className={`${fieldClass} pl-12 normal-case tracking-normal`} />
            </span>
          </label>
          <p className="flex items-start gap-3 rounded-card border border-soft bg-cardBg p-4 text-sm leading-6 text-dark"><ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />Email verification and reset links require the campus authentication service.</p>
          <p id={`${id}-reset-message`} role="status" className="text-sm leading-6 text-textSecondary">{message}</p>
          <button type="submit" className={`${buttonClass} flex items-center justify-center gap-3`}>Send Reset Link <Send aria-hidden="true" className="h-5 w-5" /></button>
          <p className="border-t border-track pt-6 text-center text-sm text-textSecondary">Remembered your password? <button type="button" onClick={backToSignIn} className="min-h-11 rounded-control font-semibold text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Back to Login</button></p>
        </form> : <>
          <p id={`${id}-created-message`} role="status" className="rounded-card bg-cardBg p-4 text-center text-sm leading-6 text-dark">{message}</p>
          <button type="button" onClick={backToSignIn} className={buttonClass}>Back to Sign In</button>
        </>}
      </section>}
      <div className="ic-stage" hidden={view !== 'forms'}>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Close sign in"
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-textSecondary shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
        {/* Both forms stay mounted so they slide together and retain typed values. */}
        {[false, true].map(registration => {
          const mode = registration ? 'signup' : 'signin'
          const inactive = signUp !== registration
          return (
            <form key={mode} inert={inactive} aria-hidden={inactive} aria-busy={busy} onSubmit={submit}
              className={`ic-form ic-${mode} flex flex-col justify-center gap-4 bg-white px-6 py-16 sm:px-10`}>
              <img src={ironcladLogo} alt="IronClad" className="mx-auto h-16 w-16 object-contain" />
              <h2 id={`${id}-${mode}-title`} className="text-center text-2xl font-bold">{registration ? 'Create Account' : 'Sign In'}</h2>
              <p className="text-center text-xs text-textSecondary">{registration ? 'Register with your student details' : 'Your username is your student number'}</p>
              <label className="grid gap-1 text-xs font-semibold">{registration ? 'Student ID' : 'Username'}
                <input ref={registration ? signUpField : signInField} name="studentId" type="text" autoComplete="username" autoCapitalize="characters" spellCheck={false} placeholder="e.g. 20241200-C" pattern="[0-9]{8}-[A-Za-z]" title="8 digits, a hyphen, and a letter, e.g. 20241200-C" required maxLength={10} className={fieldClass} />
              </label>
              {registration && <>
                <label className="grid gap-1 text-xs font-semibold">Full name
                  <input name="name" autoComplete="name" required maxLength={120} className={fieldClass} />
                </label>
                <label className="grid gap-1 text-xs font-semibold">Registered campus email
                  <input name="email" type="email" autoComplete="email" required maxLength={254} className={fieldClass} />
                </label>
                <label className="grid gap-1 text-xs font-semibold">Course
                  <input name="course" type="text" placeholder="e.g. BSCS" autoCapitalize="characters" pattern="[A-Za-z][A-Za-z0-9]{1,15}" title="Enter your course abbreviation, e.g. BSCS" required maxLength={16} className={fieldClass} />
                </label>
                <fieldset className="grid grid-cols-2 gap-3">
                  <legend className="mb-1 text-xs font-semibold">Section</legend>
                  <label className="grid gap-1 text-xs font-semibold">Year level
                    <select name="yearLevel" aria-label="Year level" required defaultValue="" className={fieldClass}>
                      <option value="" disabled>Year</option>
                      {['1', '2', '3', '4'].map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-semibold">Section letter
                    <select name="section" aria-label="Section letter" required defaultValue="" className={fieldClass}>
                      <option value="" disabled>Section</option>
                      {['A', 'B', 'C', 'D'].map(section => <option key={section} value={section}>{section}</option>)}
                    </select>
                  </label>
                </fieldset>
              </>}
              <PasswordField label="Password" name="password" autoComplete={registration ? 'new-password' : 'current-password'} minLength={registration ? 8 : undefined} fieldClass={fieldClass} />
              {registration && <PasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" minLength={8} fieldClass={fieldClass} />}
              {!registration && <button type="button" onClick={() => { setMessage(''); setView('reset') }} className="min-h-11 self-end rounded-control text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Forgot Password?</button>}
              <p id={`${id}-${mode}-message`} role="status" className="text-xs leading-5 text-textSecondary">{inactive ? '' : message}</p>
              <button type="submit" disabled={busy} className={buttonClass}>{busy && !inactive ? 'Please wait…' : registration ? 'Sign Up' : 'Sign In'}</button>
              <p className="text-center text-[10px] leading-4 text-textMuted">Browser testing only · No production authentication</p>
            </form>
          )
        })}
        <div className="ic-overlay-window">
          <div className="ic-overlay bg-primary text-white">
            <aside className="ic-welcome ic-welcome-back" inert={!signUp} aria-hidden={!signUp}>
              <h3 className="text-3xl font-bold">Welcome to IronClad!</h3>
              <p className="max-w-xs text-sm leading-6">Register with your personal details to use all of the portal features.</p>
              <button type="button" disabled={busy} onClick={() => switchForm(false)} className={toggleClass}>Sign In</button>
            </aside>
            <aside className="ic-welcome ic-welcome-new" inert={signUp} aria-hidden={signUp}>
              <h3 className="text-3xl font-bold">Welcome back!</h3>
              <p className="max-w-xs text-sm leading-6">Enter your personal details to use all of the portal features.</p>
              <button type="button" disabled={busy} onClick={() => switchForm(true)} className={toggleClass}>Sign Up</button>
            </aside>
          </div>
        </div>
      </div>
    </dialog>
  )
}
