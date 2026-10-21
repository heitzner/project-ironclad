import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const digest = scryptSync(String(password), salt, 64).toString('hex')
  return `${salt}:${digest}`
}

export function verifyPassword(password, stored) {
  const [salt, expectedHex] = String(stored || '').split(':')
  if (!salt || !expectedHex) return false
  const actual = scryptSync(String(password), salt, 64)
  const expected = Buffer.from(expectedHex, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
