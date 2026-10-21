import { useRef, useState } from 'react'
import { MailCheck } from 'lucide-react'
import { inputClass, primaryButton, secondaryButton } from './system-ui.js'

// Delivery and verification receipts belong to the supplied auth adapter.
// A disconnected preview never invokes the save callback, including for an email change.
export default function EmailVerification({ email, purpose, request, verify, onVerified, onBack, onBusyChange }) {
  const [challenge, setChallenge] = useState(null)
  const [code, setCode] = useState(() => Array(6).fill(''))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const guard = useRef(false)
  const codeInputs = useRef([])
  const changeBusy = value => { setBusy(value); onBusyChange?.(value) }
  const connected = typeof request === 'function' && typeof verify === 'function'
  const emailChange = purpose === 'email-change'
  const finalStep = purpose === 'signup' ? 'Create account' : emailChange ? 'Change email' : 'Change password'
  const send = async () => {
    if (guard.current) return
    guard.current = true; changeBusy(true); setError('')
    try {
      if (!connected) { setChallenge({ preview: true }); setCode(Array(6).fill('')); return }
      const result = await request({ email, purpose })
      if (!result?.id || result.sent !== true) throw new Error('Email delivery was not confirmed. Try again.')
      setChallenge(result); setCode(Array(6).fill(''))
    } catch (failure) { setError(failure.message || 'Unable to send the verification email.') }
    finally { guard.current = false; changeBusy(false) }
  }
  const confirm = async event => {
    event.preventDefault()
    if (guard.current) return
    const verificationCode = code.join('')
    if (verificationCode.length !== 6) { setError('Enter all 6 digits of the verification code.'); return }
    if (challenge?.preview) { if (verificationCode !== '123456') { setError('For this screen preview, enter 123456.'); return }; setError(''); setComplete(true); return }
    guard.current = true; changeBusy(true); setError('')
    try {
      const result = await verify({ challengeId: challenge.id, code: verificationCode, email, purpose })
      if (result?.verified !== true || !result.receipt) throw new Error('Verification was not confirmed. Check the code or request a new one.')
      await onVerified(result.receipt)
      setComplete(true)
    } catch (failure) { setError(failure.message || 'This code is invalid or expired. Request a new one.') }
    finally { guard.current = false; changeBusy(false) }
  }
  const enterDigits = (index, value) => {
    const incoming = value.replace(/\D/g, '')
    if (!incoming) {
      setCode(current => current.map((digit, position) => position === index ? '' : digit))
      return
    }
    setCode(current => {
      const next = [...current]
      incoming.slice(0, 6 - index).split('').forEach((digit, offset) => { next[index + offset] = digit })
      return next
    })
    codeInputs.current[Math.min(index + incoming.length, 5)]?.focus()
  }
  const handleCodeKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      if (code[index]) setCode(current => current.map((digit, position) => position === index ? '' : digit))
      else if (index > 0) {
        setCode(current => current.map((digit, position) => position === index - 1 ? '' : digit))
        codeInputs.current[index - 1]?.focus()
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault(); codeInputs.current[index - 1]?.focus()
    } else if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault(); codeInputs.current[index + 1]?.focus()
    }
  }
  const handleCodePaste = (index, event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '')
    if (!pasted) return
    event.preventDefault()
    enterDigits(index, pasted)
  }
  return <section className="space-y-4" aria-label="Email verification" aria-busy={busy}>
    <div className="flex items-center gap-3"><span className="rounded-full bg-cardBg p-3 text-dark"><MailCheck aria-hidden="true" /></span><div><h3 className="font-bold">{complete ? challenge?.preview ? 'Verification preview complete' : 'Email verified' : emailChange ? 'Verify your new school email' : 'Verify your school email'}</h3><p className="break-all text-sm text-textSecondary">{email}</p></div></div>
    <ol className="flex flex-wrap gap-2 text-xs font-semibold text-dark"><li>1 · Details</li><li>2 · Verify email</li><li>3 · {finalStep}</li></ol>
    {!connected && <p role="status" className="rounded-panel border border-soft bg-pageBg p-3 text-sm leading-6">{emailChange ? 'Email delivery is not connected yet. No code has been sent. You can preview this step; your current email and profile will stay unchanged.' : 'Email delivery is not connected yet. No email has been sent. You can preview the verification screens; this will not verify an email, create an account, or change a password.'}</p>}
    {complete ? <p role="status" className="rounded-panel bg-cardBg p-4 text-sm">{challenge?.preview ? emailChange ? 'Verification preview complete. Your email and profile have not been changed.' : 'Your email remains unverified. This preview has not created an account or changed a password.' : purpose === 'signup' ? 'Your account creation was confirmed. You can now sign in.' : emailChange ? 'Your email change was confirmed.' : 'Your password change was confirmed.'}</p> : challenge ? <form className="space-y-3" onSubmit={confirm}>
      <p className="text-sm text-textSecondary">{challenge.preview ? 'Preview code: 123456' : 'Enter the code from your email. Use only the most recent code.'}</p>
      <fieldset>
        <legend className="text-sm font-semibold">{emailChange ? 'Change of email verification code' : 'Verification code'}</legend>
        <div className="mt-2 grid max-w-sm grid-cols-6 gap-2 sm:gap-3">
          {code.map((digit, index) => <input
            key={index}
            ref={element => { codeInputs.current[index] = element }}
            autoFocus={index === 0}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            inputMode="numeric"
            pattern="[0-9]"
            maxLength={index === 0 ? 6 : 1}
            required
            value={digit}
            disabled={busy}
            aria-label={`Verification code digit ${index + 1} of 6`}
            onChange={event => enterDigits(index, event.target.value)}
            onKeyDown={event => handleCodeKeyDown(index, event)}
            onPaste={event => handleCodePaste(index, event)}
            onFocus={event => event.target.select()}
            className={`${inputClass} h-12 px-0 text-center text-lg font-bold tabular-nums sm:h-14 sm:text-xl`}
          />)}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2"><button type="submit" disabled={busy} className={primaryButton}>{busy ? 'Verifying…' : challenge.preview ? 'Preview confirmation' : 'Verify and continue'}</button><button type="button" disabled={busy} onClick={send} className={secondaryButton}>{challenge.preview ? 'Restart preview' : 'Resend code'}</button></div>
    </form> : <button type="button" disabled={busy} className={primaryButton} onClick={send}>{busy ? 'Sending…' : connected ? 'Send verification code' : 'Preview verification step'}</button>}
    {error && <p role="alert" className="rounded-control bg-selectBg p-3 text-sm">{error}</p>}
    <button type="button" disabled={busy} className={secondaryButton} onClick={onBack}>{complete && !challenge?.preview ? 'Continue' : 'Back to details'}</button>
  </section>
}
