import nodemailer from 'nodemailer'

const purposeLabels = Object.freeze({
  signup: 'account registration',
  'password-change': 'password change',
  'email-change': 'school email change',
})

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

export function createEmailVerificationService({
  user,
  pass,
  fromName = 'Project IronClad',
  createTransport = options => nodemailer.createTransport(options),
} = {}) {
  const deliveryEnabled = Boolean(String(user || '').trim() && String(pass || '').trim())
  const transporter = deliveryEnabled ? createTransport({
    service: 'gmail',
    auth: { user: String(user).trim(), pass: String(pass).trim() },
  }) : null

  return Object.freeze({
    deliveryEnabled,
    async sendVerificationCode({ email, purpose, code, expiresInMinutes }) {
      if (!deliveryEnabled) return { delivered: false }
      const label = purposeLabels[purpose] || 'verification'
      const safeLabel = escapeHtml(label)
      const safeCode = escapeHtml(code)
      const result = await transporter.sendMail({
        from: { name: fromName, address: String(user).trim() },
        to: email,
        subject: `[IronClad] Your ${label} verification code`,
        text: `Your IronClad ${label} verification code is ${code}. It expires in ${expiresInMinutes} minutes. If you did not request this code, you can ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;padding:20px;border:1px solid #e5e7eb;border-radius:8px">
          <h2 style="margin-top:0">Project IronClad Verification</h2>
          <p>Use the verification code below to complete your <strong>${safeLabel}</strong> request:</p>
          <div style="font-size:28px;font-weight:bold;letter-spacing:6px;padding:12px;background:#f3f4f6;text-align:center;border-radius:6px">${safeCode}</div>
          <p style="color:#6b7280;font-size:12px;margin-top:16px">This code expires in ${expiresInMinutes} minutes. If you did not request it, you can ignore this email.</p>
        </div>`,
      })
      return { delivered: true, messageId: result.messageId }
    },
  })
}
