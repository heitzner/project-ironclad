import { PasswordField } from './FormField.jsx'

export function SecurityForm({
  currentPassword,
  onCurrentPasswordChange,
  newPassword,
  onNewPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  error,
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl bg-white p-3 shadow-card border border-track/30">
          <PasswordField
            id="profile-current-password"
            name="currentPassword"
            label="Current Password"
            value={currentPassword}
            onChange={(e) => onCurrentPasswordChange(e.target.value)}
            placeholder="••••••••••••"
            autoComplete="current-password"
          />
        </div>

        <div className="rounded-xl bg-white p-3 shadow-card border border-track/30">
          <PasswordField
            id="profile-new-password"
            name="newPassword"
            label="New Password"
            value={newPassword}
            onChange={(e) => onNewPasswordChange(e.target.value)}
            placeholder="Enter new password"
            autoComplete="new-password"
          />
        </div>

        <div className="rounded-xl bg-white p-3 shadow-card border border-track/30">
          <PasswordField
            id="profile-confirm-password"
            name="confirmPassword"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-selectBg/80 p-2.5 text-[12px] font-medium text-textPrimary">
          {error}
        </div>
      )}
    </div>
  )
}

export default SecurityForm
