import { useState } from 'react'
import { usePortal } from './portal.context.js'
import SecurityForm from './SecurityForm.jsx'
import EmailVerification from './EmailVerification.jsx'
import { primaryButton, secondaryButton } from './system-ui.js'

export default function PasswordChange({ profile }) {
  const portal = usePortal()
  const [editing, setEditing] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const actions = portal?.authActions
  const reset = () => { setEditing(false); setVerifying(false); setCurrent(''); setNext(''); setConfirmation(''); setError('') }
  return <section className="rounded-panel border border-track bg-white p-5">
    <h2 className="font-bold">Password & security</h2><p className="mt-1 text-sm leading-6 text-textSecondary">Confirm your current password, then verify your school email before a new password can be saved.</p>
    {!editing ? <button type="button" className={`${secondaryButton} mt-3`} onClick={() => setEditing(true)}>Change password</button> : verifying ? <div className="mt-4"><EmailVerification email={profile.email} purpose="password-change" request={actions?.requestPasswordVerification} verify={actions?.verifyPasswordEmail} onBack={() => setVerifying(false)} onVerified={async verificationReceipt => { if (!actions?.changePassword) throw new Error('Password changes are not connected. No password was changed.'); const result = await actions.changePassword({ currentPassword: current, newPassword: next, verificationReceipt }); if (result?.confirmed !== true) throw new Error('The password change was not confirmed.'); setCurrent(''); setNext(''); setConfirmation('') }} /></div> : <form className="mt-4 space-y-4" onSubmit={event => { event.preventDefault(); if (!profile.email) { setError('Save your required School Email before changing your password.'); return }; if (!current || next.length < 8 || next !== confirmation || current === next) { setError('Enter your current password and a different new password of at least 8 characters. Both new password fields must match.'); return }; setError(''); setVerifying(true) }}>
      <SecurityForm currentPassword={current} onCurrentPasswordChange={setCurrent} newPassword={next} onNewPasswordChange={setNext} confirmPassword={confirmation} onConfirmPasswordChange={setConfirmation} error={error} />
      <div className="flex flex-wrap gap-2"><button type="submit" className={primaryButton}>Continue to email verification</button><button type="button" className={secondaryButton} onClick={reset}>Cancel</button></div>
    </form>}
  </section>
}
