import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import Breadcrumb from '../../components/common/Breadcrumb.jsx'
import PageLayout from '../../components/common/PageLayout.jsx'
import AvatarCard from '../../components/common/AvatarCard.jsx'
import FieldCard from '../../components/common/FieldCard.jsx'
import PasswordChange from '../../components/common/PasswordChange.jsx'
import EmailVerification from '../../components/common/EmailVerification.jsx'
import { usePortal } from '../../components/common/portal.context.js'
import SystemDialog from '../../components/common/SystemDialog.jsx'
import { inputClass, primaryButton, secondaryButton } from '../../components/common/system-ui.js'
import ViewState from '../../components/common/ViewState.jsx'
import { resourceState } from '../../hooks/resourceState.js'
import useAuth from '../../hooks/useAuth.js'
import useProfile from '../../hooks/useProfile.js'
import { useStudent } from '../../components/student/student.context.js'
import useStudentAction from '../../components/student/useStudentAction.js'

function formatSyncTime(dateString) {
  if (!dateString) return 'No changes saved yet'
  if (!Number.isFinite(Date.parse(dateString))) return dateString
  return `${new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dateString))} PHT`
}

// Official records are corrected through a request; display preferences are editable.
export function ProfileForm({ profile, onSaved }) {
  const { service } = useStudent()
  const portal = usePortal()
  const mutation = useStudentAction(`profile:${profile.id}:${profile.version ?? ''}`)
  const [email, setEmail] = useState(profile.email || '')
  const [displayName, setDisplayName] = useState(profile.displayName || profile.fullName)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '')
  const [correction, setCorrection] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pendingProfile, setPendingProfile] = useState(null)
  const [verificationBusy, setVerificationBusy] = useState(false)
  const changed = email !== (profile.email || '') || avatarUrl !== (profile.avatarUrl || '') || displayName !== (profile.displayName || profile.fullName)
  const save = async input => {
    setMessage(''); setError('')
    const result = await mutation.run(service.updateProfile, { id: profile.id, ...input })
    if (result) { setMessage(input.correction ? 'Your correction request is recorded for review. Official records have not changed.' : 'Profile settings saved.'); setCorrection(false); await onSaved?.() }
    return result
  }
  const submitProfile = event => {
    event.preventDefault()
    if (!displayName.trim()) { setError('Enter a display name.'); return }
    const input = { email: email.trim(), avatarUrl, displayName: displayName.trim() }
    if (input.email.toLowerCase() !== (profile.email || '').trim().toLowerCase()) {
      setError(''); setMessage(''); setPendingProfile(input)
    } else save(input)
  }
  return <div className="space-y-5">
    <form className="rounded-card border border-soft bg-cardBg p-4 shadow-card sm:p-6" onSubmit={submitProfile}>
      <div className="mb-5 flex gap-3 border-b border-soft pb-5"><ShieldCheck className="h-10 w-10 shrink-0 rounded-panel bg-dark p-2 text-white" aria-hidden="true" /><div><h1 className="text-xl font-bold">Account & Profile</h1><p className="mt-1 text-sm text-textSecondary">Your identity, campus position, and personal preferences.</p></div></div>
      <fieldset disabled={mutation.busy || mutation.blocked} className="min-w-0 space-y-5">
        <AvatarCard avatarUrl={avatarUrl} onAvatarChanged={setAvatarUrl} />
        <div className="grid gap-3 md:grid-cols-2">
          <FieldCard id="profile-display-name" label="Display name" value={displayName} onChange={setDisplayName} isEditable required />
          <FieldCard id="profile-email" label="School Email" type="email" value={email} onChange={setEmail} isEditable required placeholder="Your school-issued email address" />
        </div>
        <p className="text-xs text-textSecondary">School Email verification: {profile.emailVerified === true ? 'Verified by the campus account service' : 'Pending campus account verification'}</p>
        <p className="text-xs text-textSecondary">Changing your School Email requires a verification code sent to the new address. Your current address stays in use until the change is confirmed.</p>
        <section className="rounded-panel border border-track bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Official student record</h2><button type="button" className={secondaryButton} disabled={!service.supports('updateProfile')} onClick={() => setCorrection(true)}>Request a correction</button></div><p className="my-3 text-xs leading-6 text-textSecondary">Official name, enrollment, and Student ID are institution-controlled records. Request a correction when they are wrong; your display name can be changed above. School email is required. Verification status is supplied by the campus account service.</p>
          <div className="grid gap-3 md:grid-cols-2"><FieldCard id="profile-fullname" label="Official full name" value={profile.fullName} isLocked /><FieldCard id="profile-course-section" label="Course & Section" value={[profile.programName || profile.programCode, profile.section].filter(Boolean).join(' · ')} isLocked /><FieldCard id="profile-student-id" label="Student ID Number" value={profile.studentId} isLocked /><FieldCard id="profile-position" label="Organization position" value={profile.position || 'Student'} /></div>
          {profile.corrections?.length > 0 && <ul className="mt-4 space-y-2 text-xs text-textSecondary">{profile.corrections.map(item => <li key={item.id} className="rounded-control bg-pageBg p-3">Correction request · {item.status} · {item.field}: {item.value}</li>)}</ul>}
        </section>
        <div className="flex flex-wrap justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => { setEmail(profile.email || ''); setAvatarUrl(profile.avatarUrl || ''); setDisplayName(profile.displayName || profile.fullName); setMessage(''); setError('') }}>Discard changes</button><button type="submit" disabled={!changed || mutation.busy || !service.supports('updateProfile')} className={primaryButton}>{mutation.busy ? 'Saving…' : 'Save profile'}</button></div>
      </fieldset>
      {message && <p role="status" className="mt-4 text-sm text-dark">{message}</p>}{(error || mutation.error) && <p role="alert" className="mt-4 text-sm">{error || mutation.error}</p>}
      {!service.supports('updateProfile') && <p role="status" className="mt-4 text-sm text-textSecondary">Profile changes are not connected yet. Saving your profile and requesting official-record corrections will be available when the campus profile service is connected.</p>}
      <p className="mt-4 text-xs text-textSecondary">Last saved: {formatSyncTime(profile.lastSyncedAt)}</p>
    </form>
    {pendingProfile && <SystemDialog title="Verify email change" onClose={() => setPendingProfile(null)} busy={verificationBusy || mutation.busy}>
      <p className="mb-4 text-sm leading-6 text-textSecondary">Verify the new address below before saving your profile changes.</p>
      <EmailVerification email={pendingProfile.email} purpose="email-change" request={portal?.authActions?.requestEmailChangeVerification} verify={portal?.authActions?.verifyEmailChange} onBusyChange={setVerificationBusy} onBack={() => setPendingProfile(null)} onVerified={async emailVerificationReceipt => {
        if (mutation.blocked) throw new Error('Check your latest profile before retrying this change.')
        const result = await save({ ...pendingProfile, emailVerificationReceipt })
        if (!result) throw new Error('The email change could not be confirmed. Check your profile before retrying.')
        setPendingProfile(null)
      }} />
    </SystemDialog>}
    <PasswordChange profile={profile} />
    {correction && <SystemDialog title="Request an official-record correction" onClose={() => setCorrection(false)} busy={mutation.busy}><form className="space-y-4" onSubmit={event => { event.preventDefault(); const fields = Object.fromEntries(new FormData(event.currentTarget)); save({ correction: fields }) }}>
      <p className="text-sm leading-6 text-textSecondary">Describe the correct information. Your official record changes only after the institution reviews and approves your request.</p>
      <label className="block text-sm font-semibold">Record to correct<select name="field" className={`${inputClass} mt-1`}><option>Official full name</option><option>Course & Section</option><option>Student ID Number</option></select></label>
      <label className="block text-sm font-semibold">Correct information<input name="value" required maxLength={120} className={`${inputClass} mt-1`} /></label><label className="block text-sm font-semibold">Reason<textarea name="reason" required maxLength={500} className={`${inputClass} mt-1`} /></label>
      <button type="submit" disabled={mutation.busy} className={primaryButton}>Submit correction request</button>
    </form></SystemDialog>}
  </div>
}

export default Profile

// Page shell: resolves auth and profile states before showing the form.
export function Profile() {
  const auth = useAuth()
  const { service } = useStudent()
  const profileResource = useProfile({ service, enabled: auth.status === 'authenticated', scope: auth.user?.id })
  const profile = profileResource.data?.profile

  let state
  if (auth.loading) state = 'loading'
  else if (!auth.user) state = 'signed-out'
  else state = resourceState(profileResource, !profile)
  if (profile && profile.id !== auth.user?.id) state = 'error'

  return (
    <PageLayout role="student" user={auth.user}>
      <div className="mx-auto flex w-full min-w-0 flex-col gap-3">
        <Breadcrumb
          items={[
            { label: 'Portal', to: '/' },
            { label: 'Account Settings & Profile' },
          ]}
          separator="slash"
          showHomeIcon={true}
        />

        {state ? (
          <ViewState state={state} onRetry={profileResource.refetch}>
            {state === 'signed-out' && (
              <Link
                to="/login"
                className="rounded-control bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Go to sign in
              </Link>
            )}
          </ViewState>
        ) : (
          <ProfileForm
            key={`${profile.id}:${profile.version ?? ''}`}
            profile={profile}
            onSaved={profileResource.refetch}
          />
        )}
      </div>
    </PageLayout>
  )
}
