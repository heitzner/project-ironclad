import { isIsoDate, isTime, timeToMinutes } from '../domain/booking.js'
import { HttpError } from './errors.js'

const periods = new Set(['all_day', 'morning', 'evening'])

const text = (value, name, fallback = '') => {
  if (value === undefined) return fallback
  if (typeof value !== 'string') throw new HttpError(400, 'INVALID_QUERY', `${name} must be text.`)
  return value.trim()
}

const parseDate = (value, settings) => {
  const date = text(value, 'date', settings.demoNow.slice(0, 10))
  if (!isIsoDate(date)) throw new HttpError(400, 'INVALID_DATE', 'date must use YYYY-MM-DD.')
  return date
}

export function parseListQuery(query, settings) {
  const period = text(query.period, 'period', 'all_day')
  if (!periods.has(period)) throw new HttpError(400, 'INVALID_PERIOD', 'period must be all_day, morning, or evening.')

  let floor
  if (query.floor !== undefined && query.floor !== '') {
    floor = Number(query.floor)
    if (![1, 2, 3, 4].includes(floor)) throw new HttpError(400, 'INVALID_FLOOR', 'floor must be 1, 2, 3, or 4.')
  }

  const q = text(query.q, 'q')
  if (q.length > 100) throw new HttpError(400, 'INVALID_QUERY', 'q must not exceed 100 characters.')
  return { date: parseDate(query.date, settings), period, floor, q }
}

export function parseDetailsQuery(query, settings) {
  const { date, period } = parseListQuery(query, settings)
  return { date, period }
}

export function parseReservationConfigQuery(query, settings) {
  return { studentId: text(query.student_id, 'student_id', settings.defaultStudentId) }
}

export function parseLockBody(body, settings) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'INVALID_BODY', 'Request body must be a JSON object.')
  }
  const required = ['room_code', 'date', 'start_time', 'end_time', 'purpose', 'student_id']
  const missing = required.filter((field) => typeof body[field] !== 'string' || !body[field].trim())
  if (missing.length) throw new HttpError(400, 'MISSING_FIELDS', 'Required reservation fields are missing.', { missing })

  const date = body.date.trim()
  const startTime = body.start_time.trim()
  const endTime = body.end_time.trim()
  const purpose = body.purpose.trim()
  if (!isIsoDate(date)) throw new HttpError(400, 'INVALID_DATE', 'date must use YYYY-MM-DD.')
  if (!isTime(startTime) || !isTime(endTime)) throw new HttpError(400, 'INVALID_TIME', 'times must use HH:mm.')
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) throw new HttpError(400, 'INVALID_TIME_RANGE', 'start_time must be earlier than end_time.')
  if (purpose.length > settings.purposeMaxLength) throw new HttpError(400, 'PURPOSE_TOO_LONG', `purpose must not exceed ${settings.purposeMaxLength} characters.`)
  return {
    roomCode: body.room_code.trim(),
    date,
    startTime,
    endTime,
    purpose,
    studentId: body.student_id.trim(),
  }
}
