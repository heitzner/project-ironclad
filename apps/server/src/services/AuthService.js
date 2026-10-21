import { randomUUID } from 'node:crypto'
import { config } from '../config.js'
import { HttpError } from '../http/errors.js'
import { signJwt, verifyJwt } from '../security/jwt.js'
import { hashPassword, verifyPassword } from '../security/password.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const studentIdPattern = /^\d{8}-[A-Z]$/
const allowedPurposes = new Set(['signup', 'email-change', 'password-change'])
const required = (value, label, max = 500) => {
  const result = String(value ?? '').trim()
  if (!result || result.length > max) throw new HttpError(422, 'VALIDATION_ERROR', `Enter ${label}.`)
  return result
}

export class AuthService {
  constructor(repository, { clock = () => new Date(), jwtSecret = config.jwtSecret } = {}) {
    this.repository = repository
    this.clock = clock
    this.jwtSecret = jwtSecret
  }

  currentUser(account) {
    if (!account) return null
    const state = this.repository.readState()
    const membership = state.members[account.id] || {}
    const profile = state.profiles[account.id] || {}
    return {
      id: account.id, studentId: account.studentId, name: profile.displayName || account.name,
      role: membership.role || account.role, position: membership.position || '', scope: membership.scope || '',
      course: account.course, yearLevel: account.yearLevel, section: account.section,
      email: profile.email || account.email, avatarUrl: profile.avatarUrl || '', disabled: account.disabled, status: account.status,
    }
  }

  capabilities(user) {
    const topThree = ['President', 'Vice President', 'Secretary'].includes(user?.position)
    return {
      publish: ['admin', 'council'].includes(user?.role), reviewApplications: ['admin', 'council'].includes(user?.role),
      approveBookings: user?.role === 'admin', manageRooms: user?.role === 'admin',
      manageOrganization: ['admin', 'council'].includes(user?.role) && topThree,
      viewDashboard: user?.role === 'admin', bookRooms: Boolean(user), updateProfile: Boolean(user),
    }
  }

  sessionPayload(account) {
    const user = this.currentUser(account)
    return { user, capabilities: this.capabilities(user) }
  }

  signIn({ studentId, password }) {
    const account = this.repository.findAccountByStudentId(studentId)
    if (!account || !verifyPassword(password, account.passwordHash)) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Student ID or password is incorrect')
    if (account.disabled || account.status !== 'active') throw new HttpError(403, 'ACCOUNT_DISABLED', 'This account is not active')
    const issuedAt = Math.floor(this.clock().getTime() / 1000)
    const session = { id: randomUUID(), accountId: account.id, issuedAt, expiresAt: issuedAt + config.jwtTtlSeconds }
    this.repository.createSession(session)
    return { ...this.sessionPayload(account), token: signJwt({ sub: account.id, jti: session.id, iat: issuedAt, exp: session.expiresAt }, this.jwtSecret) }
  }

  authenticate(token) {
    const claims = verifyJwt(token, this.jwtSecret, this.clock().getTime())
    const session = this.repository.findSession(claims.jti)
    if (!session || session.accountId !== claims.sub) throw new HttpError(401, 'INVALID_SESSION', 'The session is no longer active')
    const account = this.repository.findAccountById(claims.sub)
    if (!account) throw new HttpError(401, 'INVALID_SESSION', 'The account no longer exists')
    if (account.disabled || account.status !== 'active') throw new HttpError(403, 'ACCOUNT_DISABLED', 'This account is not active')
    return { account, user: this.currentUser(account), claims }
  }

  signOut(claims) { this.repository.deleteSession(claims.jti); return { signedOut: true } }

  requestVerification({ email, purpose }, actor = null) {
    const cleanEmail = required(email, 'a valid email address', 254).toLowerCase()
    if (!emailPattern.test(cleanEmail) || !allowedPurposes.has(purpose)) throw new HttpError(422, 'VALIDATION_ERROR', 'Enter a valid verification request')
    if (purpose !== 'signup' && !actor) throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to verify this change')
    const challenge = { id: randomUUID(), email: cleanEmail, purpose, accountId: actor?.id || null, code: '123456', expiresAt: this.clock().getTime() + config.otpTtlSeconds * 1000 }
    this.repository.createChallenge(challenge)
    return { id: challenge.id, sent: true, expiresInSeconds: config.otpTtlSeconds, mockCode: config.production ? undefined : '123456' }
  }

  verifyEmail({ challengeId, code, email, purpose }, actor = null) {
    const challenge = this.repository.findChallenge(challengeId)
    if (!challenge || challenge.expiresAt <= this.clock().getTime()) throw new HttpError(422, 'VERIFICATION_EXPIRED', 'This verification code is invalid or expired')
    if (challenge.code !== String(code) || challenge.email !== String(email).trim().toLowerCase() || challenge.purpose !== purpose || challenge.accountId !== (actor?.id || null)) {
      throw new HttpError(422, 'INVALID_VERIFICATION', 'This verification code is invalid or expired')
    }
    this.repository.consumeChallenge(challengeId)
    const receipt = { id: randomUUID(), email: challenge.email, purpose, accountId: challenge.accountId, expiresAt: this.clock().getTime() + config.otpTtlSeconds * 1000 }
    this.repository.createReceipt(receipt)
    return { verified: true, receipt: receipt.id }
  }

  consumeReceipt(receiptId, { purpose, email, accountId = null }) {
    const receipt = this.repository.consumeReceipt(receiptId)
    if (!receipt || receipt.expiresAt <= this.clock().getTime() || receipt.purpose !== purpose || receipt.email !== String(email).trim().toLowerCase() || receipt.accountId !== accountId) {
      throw new HttpError(422, 'INVALID_VERIFICATION', 'Email verification is missing, invalid, or expired')
    }
    return receipt
  }

  register(input) {
    const studentId = required(input.studentId, 'a valid student ID', 10).toUpperCase()
    const email = required(input.email, 'a valid email address', 254).toLowerCase()
    if (!studentIdPattern.test(studentId) || !emailPattern.test(email) || String(input.password || '').length < 8) throw new HttpError(422, 'VALIDATION_ERROR', 'Provide a valid student ID, email, and password of at least 8 characters')
    if (this.repository.findAccountByStudentId(studentId) || this.repository.findAccountByEmail(email)) throw new HttpError(409, 'ACCOUNT_EXISTS', 'An account already uses this student ID or email')
    this.consumeReceipt(input.verificationReceipt, { purpose: 'signup', email })
    const account = {
      id: this.repository.nextId('USER'), studentId, passwordHash: hashPassword(input.password),
      name: required(input.name, 'your full name', 120), role: 'student', position: '',
      course: required(input.course, 'your course', 16).toUpperCase(), yearLevel: required(input.yearLevel, 'your year level', 1),
      section: required(input.section, 'your section', 1).toUpperCase(), email, emailVerified: true, status: 'active', disabled: false, createdAt: this.clock().toISOString(),
    }
    this.repository.createAccount(account)
    return { confirmed: true, id: account.id, message: 'Your account is ready. Sign in with your student ID and password.' }
  }

  resetPassword({ email }) {
    const clean = String(email || '').trim().toLowerCase()
    if (clean && !emailPattern.test(clean)) throw new HttpError(422, 'VALIDATION_ERROR', 'Enter a valid email address')
    return { confirmed: true, message: 'If that campus email is registered, reset instructions have been issued for this mock environment.' }
  }

  changePassword(account, { currentPassword, newPassword, verificationReceipt }) {
    if (!verifyPassword(currentPassword, account.passwordHash)) throw new HttpError(422, 'INVALID_PASSWORD', 'The current password is incorrect')
    if (String(newPassword || '').length < 8 || newPassword === currentPassword) throw new HttpError(422, 'VALIDATION_ERROR', 'Choose a different password of at least 8 characters')
    this.consumeReceipt(verificationReceipt, { purpose: 'password-change', email: account.email, accountId: account.id })
    this.repository.updateAccount(account.id, { passwordHash: hashPassword(newPassword) })
    return { confirmed: true, id: account.id }
  }
}
