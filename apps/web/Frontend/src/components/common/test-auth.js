import { useSyncExternalStore } from 'react'

// Explicitly requested demo accounts. This browser-only adapter is not server authorization.
const testAccounts = [
  { id: 'test-admin', studentId: '20240001-A', password: 'Admin@123', name: 'Test Administrator', role: 'admin', course: 'BSCS', yearLevel: '4', section: 'A' },
  { id: 'test-council', studentId: '20240002-C', password: 'Council@123', name: 'Test Council Member', role: 'council', course: 'BSCS', yearLevel: '3', section: 'B' },
  { id: 'test-student', studentId: '20241200-C', password: 'Student@123', name: 'Test Student', role: 'student', course: 'BSCS', yearLevel: '1', section: 'C' },
]
const userKey = 'ironclad-test-user-v1'
const accountsKey = 'ironclad-test-accounts-v1'
const listeners = new Set()
const normalize = value => String(value ?? '').trim().toUpperCase()

function readStored(key, fallback) {
  try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback } catch { return fallback }
}

let currentUser = readStored(userKey, null)

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function publicUser(account) {
  return {
    id: account.id, studentId: account.studentId, name: account.name,
    role: account.role, course: account.course, email: account.email, yearLevel: account.yearLevel, section: account.section,
    status: 'active', testAccount: true,
  }
}

function setUser(user) {
  if (user) sessionStorage.setItem(userKey, JSON.stringify(user))
  else sessionStorage.removeItem(userKey)
  currentUser = user
  listeners.forEach(listener => listener())
}

async function digest(password, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
}

export function useTestUser() {
  return useSyncExternalStore(subscribe, () => currentUser, () => null)
}

export async function signInTestAccount(studentId, password) {
  const username = normalize(studentId)
  const fixed = testAccounts.find(account => account.studentId === username)
  if (fixed) {
    if (fixed.password !== password) throw new Error('Incorrect username or password.')
    setUser(publicUser(fixed))
    return
  }
  const accounts = readStored(accountsKey, [])
  const account = accounts.find(item => item.studentId === username)
  if (!account || await digest(password, account.salt) !== account.passwordHash) {
    throw new Error('Incorrect username or password.')
  }
  setUser(publicUser(account))
}

export async function registerTestStudent({ studentId, name, email, course, yearLevel, section, password, confirmPassword }) {
  const username = normalize(studentId)
  if (!/^\d{8}-[A-Z]$/.test(username)) throw new Error('Use a student ID such as 20241200-C (8 digits, a hyphen, and a letter).')
  if (!name.trim()) throw new Error('Enter your full name.')
  const courseCode = normalize(course)
  const campusEmail = String(email ?? '').trim().toLowerCase()
  if (!/^[A-Z][A-Z0-9]{1,15}$/.test(courseCode)) throw new Error('Enter your course abbreviation, e.g. BSCS.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campusEmail)) throw new Error('Enter a valid campus email address.')
  if (!['1', '2', '3', '4'].includes(yearLevel) || !['A', 'B', 'C', 'D'].includes(section)) {
    throw new Error('Choose a year level from 1–4 and a section from A–D.')
  }
  if (password.length < 8) throw new Error('Use at least 8 characters for your password.')
  if (password !== confirmPassword) throw new Error('Passwords do not match.')
  const accounts = readStored(accountsKey, [])
  if ([...testAccounts, ...accounts].some(account => account.studentId === username)) {
    throw new Error('An account with this student ID already exists.')
  }
  if (accounts.some(account => account.email === campusEmail)) throw new Error('An account with this email already exists.')
  const salt = crypto.randomUUID()
  const account = {
    id: crypto.randomUUID(), studentId: username, name: name.trim(), email: campusEmail, course: courseCode, yearLevel, section,
    role: 'student', salt, passwordHash: await digest(password, salt),
  }
  sessionStorage.setItem(accountsKey, JSON.stringify([...accounts, account]))
}

export function signOutTestAccount() { setUser(null) }
