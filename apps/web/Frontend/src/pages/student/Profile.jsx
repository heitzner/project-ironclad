import { useState } from 'react'
import {
  Check,
  Info,
  Lock,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Breadcrumb from '../../components/common/Breadcrumb.jsx'
import PageLayout from '../../components/common/PageLayout.jsx'
import AvatarCard from '../../components/common/AvatarCard.jsx'
import FieldCard from '../../components/common/FieldCard.jsx'
import SecurityForm from '../../components/common/SecurityForm.jsx'
import ViewState from '../../components/common/ViewState.jsx'
import { resourceState } from '../../hooks/resourceState.js'
import useAuth from '../../hooks/useAuth.js'
import useProfile from '../../hooks/useProfile.js'
import { studentService } from '../../services/student.service.js'

function formatSyncTime(dateString) {
  return dateString || 'Not yet synced'
}

// Page shell: resolves auth and profile states before showing the form.
export function Profile() {
  const auth = useAuth()
  const profileResource = useProfile({ enabled: Boolean(auth.user) })
  const profile = profileResource.data?.profile

  let state
  if (auth.loading) state = 'loading'
  else if (!auth.user) state = 'signed-out'
  else state = resourceState(profileResource, !profile)

  return (
    <PageLayout role="student" user={auth.user}>
      <div className="mx-auto w-full max-w-[960px] flex flex-col gap-3">
        <Breadcrumb
          items={[
            { label: 'Portal', to: '/' },
            { label: 'Account Settings & Student Profile' },
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
            key={profile.id ?? profile.studentId}
            profile={profile}
            positionOptions={profileResource.data?.positionOptions ?? []}
            onSaved={profileResource.refetch}
          />
        )}
      </div>
    </PageLayout>
  )
}

// Editable profile form; every save goes through studentService.updateProfile.
function ProfileForm({ profile, positionOptions, onSaved }) {
  // Editable fields
  const [email, setEmail] = useState(profile.email || '')
  const [position, setPosition] = useState(profile.position || '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '')

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Submission state
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [passwordError, setPasswordError] = useState(null)

  const handleDiscard = () => {
    setEmail(profile.email || '')
    setPosition(profile.position || '')
    setAvatarUrl(profile.avatarUrl || '')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSaveError(null)
    setPasswordError(null)
    setSaveSuccess(null)
  }

  const hasProfileChanges =
    email !== (profile.email || '') ||
    position !== (profile.position || '') ||
    avatarUrl !== (profile.avatarUrl || '')

  const hasPasswordInput = currentPassword || newPassword || confirmPassword
  const hasAnyChanges = hasProfileChanges || hasPasswordInput

  const handleSaveChanges = async (e) => {
    e.preventDefault()
    setSaveError(null)
    setPasswordError(null)
    setSaveSuccess(null)

    // Password validation if password field is filled
    if (hasPasswordInput) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setPasswordError('All password fields are required to change your password.')
        return
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('New password and confirmation password do not match.')
        return
      }
    }

    setSaving(true)
    try {
      await studentService.updateProfile({
        email,
        position,
        avatarUrl,
        ...(hasPasswordInput && { currentPassword, newPassword }),
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSaveSuccess('Profile settings updated successfully.')
      onSaved?.()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
        <div className="rounded-3xl bg-cardBg p-6 shadow-card border border-track/30">
          {/* Card Header */}
          <div className="flex items-start gap-3.5 pb-5 border-b border-deep/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-dark text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-textPrimary leading-tight">
                Student Account & Identity Settings
              </h1>
              <p className="mt-0.5 text-[12px] text-textSecondary">
                Manage your university credentials, avatar image, and academic profile synchronization.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-6">
            {/* 1. Avatar Card */}
            <AvatarCard
              avatarUrl={avatarUrl}
              onAvatarChanged={setAvatarUrl}
            />

            {/* 2. Verified Academic Credentials */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-textPrimary font-semibold text-[15px]">
                  <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span>Verified Academic Credentials</span>
                </div>
                <span className="text-[11px] font-medium text-textSecondary">
                  Source: University Registrar SIS
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FieldCard
                  id="profile-fullname"
                  label="Student Full Name"
                  value={profile.fullName}
                  isLocked={true}
                />

                <FieldCard
                  id="profile-course-section"
                  label="Course & Section"
                  value={[profile.programName || profile.programCode, profile.section].filter(Boolean).join(' - ')}
                  isLocked={true}
                />

                <FieldCard
                  id="profile-student-id"
                  label="Student ID Number"
                  value={profile.studentId}
                  isLocked={true}
                />

                <FieldCard
                  id="profile-email"
                  label="School Email (optional)"
                  value={email}
                  onChange={setEmail}
                  isEditable={true}
                  type="email"
                  placeholder="student.name@gmail.com"
                />

                <div className="md:col-span-2">
                  <FieldCard
                    id="profile-position"
                    label="System Role / Position"
                    value={position}
                    onChange={setPosition}
                    isSelect={true}
                    options={positionOptions}
                  />
                </div>
              </div>
            </div>

            {/* 3. Info Banner */}
            <div className="flex items-start gap-2.5 rounded-xl bg-cardBg/80 border border-soft/30 p-3.5 text-[12px] text-textSecondary">
              <Info className="h-4 w-4 shrink-0 text-dark mt-0.5" aria-hidden="true" />
              <p>
                Official institutional data is synced directly with the Office of the University Registrar. Contact{' '}
                <Link
                  to="/support"
                  className="font-semibold text-primary underline hover:text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  Student Affairs
                </Link>{' '}
                or the campus IT Helpdesk to request credential amendments.
              </p>
            </div>

            {/* 4. Security Settings */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-textPrimary font-semibold text-[15px]">
                <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Security Settings</span>
              </div>

              <SecurityForm
                currentPassword={currentPassword}
                onCurrentPasswordChange={setCurrentPassword}
                newPassword={newPassword}
                onNewPasswordChange={setNewPassword}
                confirmPassword={confirmPassword}
                onConfirmPasswordChange={setConfirmPassword}
                error={passwordError}
              />
            </div>

            {/* Feedback messages */}
            {saveError && (
              <div role="alert" className="rounded-lg bg-error-soft p-3 text-[12px] font-medium text-error">
                {saveError}
              </div>
            )}

            {saveSuccess && (
              <div role="status" className="rounded-lg bg-cardBg border border-soft p-3 text-[12px] font-semibold text-deep flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>{saveSuccess}</span>
              </div>
            )}

            {/* 5. Bottom Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-deep/10 pt-4">
              <div className="flex items-center gap-2 text-[12px] text-textSecondary">
                <RefreshCw className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>
                  Last synchronized:{' '}
                  <span className="font-bold text-textPrimary">
                    {formatSyncTime(profile.lastSyncedAt)}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={!hasAnyChanges || saving}
                  className="rounded-lg px-4 py-2 text-[13px] font-semibold text-textSecondary transition-colors duration-150 hover:bg-pageBg disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Discard
                </button>

                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={!hasAnyChanges || saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-white shadow-card transition-colors duration-150 hover:bg-dark disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
  )
}

export default Profile
