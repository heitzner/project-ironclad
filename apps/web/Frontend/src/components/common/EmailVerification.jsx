import { useRef, useState } from 'react'
import { MailCheck } from 'lucide-react'
import { inputClass, primaryButton, secondaryButton } from './system-ui.js'

// Delivery and verification receipts belong to the supplied auth adapter.
// A disconnected preview never invokes the save callback, including for an email change.
export default function EmailVerification({ email, purpose, request, verify, onVerified, onBack, onBusyChange }) {
  const [challenge, setChallenge] = useState(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const guard = useRef(false)
  const changeBusy = value => { setBusy(value); onBusyChange?.(value) }
  const connected = typeof request === 'function' && typeof verify === 'function'
  const emailChange = purpose === 'email-change'
  const finalStep = purpose === 'signup' ? 'Create account' : emailChange ? 'Change email' : 'Change password'
  const send = async () => {
    if (guard.current) return
    guard.current = true; changeBusy(true); setError('')
    try {
      if (!connected) { setChallenge({ preview: true }); setCode(''); return }
      const result = await request({ email, purpose })
      if (!result?.id || result.sent !== true) throw new Error('Email delivery was not confirmed. Try again.')
      setChallenge(result); setCode('')
    } catch (failure) { setError(failure.message || 'Unable to send the verification email.') }
    finally { guard.current = false; changeBusy(false) }
  }
  const confirm = async event => {
    event.preventDefault()
    if (guard.current) return
    if (challenge?.preview) { if (code !== '123456') { setError('For this screen preview, enter 123456.'); return }; setError(''); setComplete(true); return }
    guard.current = true; changeBusy(true); setError('')
    try {
      const result = await verify({ challengeId: challenge.id, code, email, purpose })
      if (result?.verified !== true || !result.receipt) throw new Error('Verification was not confirmed. Check the code or request a new one.')
      await onVerified(result.receipt)
      setComplete(true)
    } catch (failure) { setError(failure.message || 'This code is invalid or expired. Request a new one.') }
    finally { guard.current = false; changeBusy(false) }
  }
  return <section className="space-y-4" aria-label="Email verification" aria-busy={busy}>
    <div className="flex items-center gap-3"><span className="rounded-full bg-cardBg p-3 text-dark"><MailCheck aria-hidden="true" /></span><div><h3 className="font-bold">{complete ? challenge?.preview ? 'Verification preview complete' : 'Email verified' : emailChange ? 'Verify your new school email' : 'Verify your school email'}</h3><p className="break-all text-sm text-textSecondary">{email}</p></div></div>
    <ol className="flex flex-wrap gap-2 text-xs font-semibold text-dark"><li>1 · Details</li><li>2 · Verify email</li><li>3 · {finalStep}</li></ol>
    {!connected && <p role="status" className="rounded-panel border border-soft bg-pageBg p-3 text-sm leading-6">{emailChange ? 'Email delivery is not connected yet. No code has been sent. You can preview this step; your current email and profile will stay unchanged.' : 'Email delivery is not connected yet. No email has been sent. You can preview the verification screens; this will not verify an email, create an account, or change a password.'}</p>}
    {complete ? <p role="status" className="rounded-panel bg-cardBg p-4 text-sm">{challenge?.preview ? emailChange ? 'Verification preview complete. Your email and profile have not been changed.' : 'Your email remains unverified. This preview has not created an account or changed a password.' : purpose === 'signup' ? 'Your account creation was confirmed. You can now sign in.' : emailChange ? 'Your email change was confirmed.' : 'Your password change was confirmed.'}</p> : challenge ? <form className="space-y-3" onSubmit={confirm}>
      <p className="text-sm text-textSecondary">{challenge.preview ? 'Preview code: 123456' : 'Enter the code from your email. Use only the most recent code.'}</p>
      <label className="block text-sm font-semibold">{emailChange ? 'Change of email verification code' : 'Verification code'}<input autoFocus autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} disabled={busy} onChange={event => setCode(event.target.value)} className={`${inputClass} mt-1 tracking-[0.4em]`} /></label>
      <div className="flex flex-wrap gap-2"><button type="submit" disabled={busy} className={primaryButton}>{busy ? 'Verifying…' : challenge.preview ? 'Preview confirmation' : 'Verify and continue'}</button><button type="button" disabled={busy} onClick={send} className={secondaryButton}>{challenge.preview ? 'Restart preview' : 'Resend code'}</button></div>
    </form> : <button type="button" disabled={busy} className={primaryButton} onClick={send}>{busy ? 'Sending…' : connected ? 'Send verification code' : 'Preview verification step'}</button>}
    {error && <p role="alert" className="rounded-control bg-selectBg p-3 text-sm">{error}</p>}
    <button type="button" disabled={busy} className={secondaryButton} onClick={onBack}>{complete && !challenge?.preview ? 'Continue' : 'Back to details'}</button>
  </section>
}
