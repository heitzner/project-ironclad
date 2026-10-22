import { useSyncExternalStore } from 'react'
import { frontendAccounts as testAccounts } from '../../data/frontend-accounts.js'

// Explicitly requested demo accounts. This browser-only adapter is not server authorization.
const userKey = 'ironclad-test-user-v1'
const accountsKey = 'ironclad-test-accounts-v1'
const listeners = new Set()
const normalize = (value) =>
  String(value ?? '')
    .trim()
    .toUpperCase()

function readStored(key, fallback, persistent = false) {
  try {
    return JSON.parse((persistent ? localStorage : sessionStorage).getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

let currentUser = readStored(userKey, null) ?? readStored(userKey, null, true)

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function publicUser(account) {
  return {
    id: account.id,
    studentId: account.studentId,
    name: account.name,
    role: account.role,
    position: account.position,
    course: account.course,
    email: account.email,
    yearLevel: account.yearLevel,
    section: account.section,
    status: 'active',
    testAccount: true,
  }
}

function setUser(user, remember = false) {
  // Persist only the demo profile, never the entered password.
  try {
    localStorage.removeItem(userKey)
    sessionStorage.removeItem(userKey)
    if (user) (remember ? localStorage : sessionStorage).setItem(userKey, JSON.stringify(user))
  } catch {
    // Preview access still works in memory when browser storage is unavailable.
  }
  currentUser = user
  listeners.forEach((listener) => listener())
  return user
}

export const getTestUser = () => currentUser

async function digest(password, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function useTestUser() {
  return useSyncExternalStore(
    subscribe,
    () => currentUser,
    () => null,
  )
}

export async function signInTestAccount(studentId, password, remember = false) {
  const username = normalize(studentId)
  const fixed = testAccounts.find((account) => account.studentId === username)
  if (fixed) {
    if (fixed.password !== password) throw new Error('Incorrect username or password.')
    return setUser(publicUser(fixed), remember)
  }
  const accounts = readStored(accountsKey, [])
  const account = accounts.find((item) => item.studentId === username)
  if (!account || (await digest(password, account.salt)) !== account.passwordHash) {
    throw new Error('Incorrect username or password.')
  }
  return setUser(publicUser(account), remember)
}

export async function registerTestStudent({
  studentId,
  name,
  email,
  course,
  yearLevel,
  section,
  password,
  confirmPassword,
}) {
  const username = normalize(studentId)
  if (!/^\d{8}-[A-Z]$/.test(username))
    throw new Error('Use a student ID such as 20241200-C (8 digits, a hyphen, and a letter).')
  if (!name.trim()) throw new Error('Enter your full name.')
  const courseCode = normalize(course)
  const campusEmail = String(email ?? '')
    .trim()
    .toLowerCase()
  if (!/^[A-Z][A-Z0-9]{1,15}$/.test(courseCode))
    throw new Error('Enter your course abbreviation, e.g. BSCS.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campusEmail))
    throw new Error('Enter a valid campus email address.')
  if (!['1', '2', '3', '4'].includes(yearLevel) || !['A', 'B', 'C', 'D'].includes(section)) {
    throw new Error('Choose a year level from 1–4 and a section from A–D.')
  }
  if (password.length < 8) throw new Error('Use at least 8 characters for your password.')
  if (password !== confirmPassword) throw new Error('Passwords do not match.')
  const accounts = readStored(accountsKey, [])
  if ([...testAccounts, ...accounts].some((account) => account.studentId === username)) {
    throw new Error('An account with this student ID already exists.')
  }
  if ([...testAccounts, ...accounts].some((account) => account.email === campusEmail))
    throw new Error('An account with this email already exists.')
  const salt = crypto.randomUUID()
  const account = {
    id: crypto.randomUUID(),
    studentId: username,
    name: name.trim(),
    email: campusEmail,
    course: courseCode,
    yearLevel,
    section,
    role: 'student',
    salt,
    passwordHash: await digest(password, salt),
  }
  sessionStorage.setItem(accountsKey, JSON.stringify([...accounts, account]))
}

export function signOutTestAccount() {
  setUser(null)
}

// Keep the supplied frontend accounts available with their documented credentials.
export async function changeTestPassword(user, currentPassword, newPassword) {
  if (!user?.id) throw new Error('Sign in before changing your password.')
  if (testAccounts.some(account => account.id === user.id)) throw new Error('The supplied frontend account credentials are fixed. Their passwords cannot be changed.')
  if (newPassword.length < 8) throw new Error('Use at least 8 characters for your new password.')
  const accounts = readStored(accountsKey, [])
  const account = accounts.find(item => item.id === user.id)
  if (!account || await digest(currentPassword, account.salt) !== account.passwordHash) throw new Error('The current password is incorrect.')
  account.passwordHash = await digest(newPassword, account.salt)
  sessionStorage.setItem(accountsKey, JSON.stringify(accounts))
}

// Public directory metadata for the browser-local organization controls.
export const getFrontendDirectory = () => [...testAccounts, ...readStored(accountsKey, [])].map(publicUser)
