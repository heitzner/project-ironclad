import { createHmac, timingSafeEqual } from 'node:crypto'
import { HttpError } from '../http/errors.js'

const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
const decode = value => JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
const signature = (value, secret) => createHmac('sha256', secret).update(value).digest('base64url')

export function signJwt(payload, secret) {
  const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`
  return `${unsigned}.${signature(unsigned, secret)}`
}

export function verifyJwt(token, secret, now = Date.now()) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) throw new HttpError(401, 'INVALID_SESSION', 'The session token is invalid')
  const unsigned = `${parts[0]}.${parts[1]}`
  const actual = Buffer.from(parts[2])
  const expected = Buffer.from(signature(unsigned, secret))
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new HttpError(401, 'INVALID_SESSION', 'The session token is invalid')
  }
  let payload
  try { payload = decode(parts[1]) } catch { throw new HttpError(401, 'INVALID_SESSION', 'The session token is invalid') }
  if (!payload.sub || !payload.jti || !Number.isInteger(payload.exp) || payload.exp * 1000 <= now) {
    throw new HttpError(401, 'SESSION_EXPIRED', 'The session has expired')
  }
  return payload
}
