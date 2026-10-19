import { HttpError } from './errors.js';
import {
  currentDateInZone,
  currentTimeInZone,
  isIsoDate,
  isTime,
  timeToMinutes,
} from '../domain/dateTime.js';

const validPeriods = new Set(['all_day', 'morning', 'evening']);
const validOccupancyStates = new Set(['all', 'available', 'occupied', 'unavailable']);
const validDecisions = new Set(['all', 'pending', 'approved', 'rejected']);

function parseDate(value, settings) {
  const date = value || currentDateInZone(settings.timeZone);
  if (!isIsoDate(date)) {
    throw new HttpError(400, 'INVALID_DATE', 'date must be a valid ISO date (YYYY-MM-DD)');
  }
  return date;
}

export function parseListQuery(query, settings) {
  const date = parseDate(query.date, settings);
  const period = query.period || 'all_day';
  if (!validPeriods.has(period)) {
    throw new HttpError(400, 'INVALID_PERIOD', 'period must be all_day, morning, or evening');
  }

  let floor;
  if (query.floor !== undefined) {
    if (typeof query.floor !== 'string' || !/^[1-4]$/.test(query.floor)) {
      throw new HttpError(400, 'INVALID_FLOOR', 'floor must be 1, 2, 3, or 4');
    }
    floor = Number(query.floor);
  }

  if (query.q !== undefined && typeof query.q !== 'string') {
    throw new HttpError(400, 'INVALID_SEARCH', 'q must be text');
  }
  return { date, period, floor, q: String(query.q || '').trim() };
}

export function parseDetailsQuery(query, settings) {
  const { date, period } = parseListQuery(query, settings);
  return { date, period };
}

export function parseOccupancyQuery(query, settings) {
  const date = parseDate(query.date, settings);
  const atTime = query.at_time || currentTimeInZone(settings.timeZone);
  if (!isTime(atTime)) {
    throw new HttpError(400, 'INVALID_TIME', 'at_time must use HH:mm 24-hour format');
  }
  return { date, atTime };
}

export function parseVacancyQuery(query, settings) {
  const date = parseDate(query.date, settings);
  let requestedStart;
  if (query.requested_start !== undefined) {
    if (!isTime(query.requested_start)) {
      throw new HttpError(400, 'INVALID_TIME', 'requested_start must use HH:mm 24-hour format');
    }
    requestedStart = query.requested_start;
  }
  return { date, requestedStart };
}

export function parseReservationConfigQuery(query, settings) {
  const studentId = query.student_id || settings.defaultStudentId;
  if (typeof studentId !== 'string' || !studentId.trim()) {
    throw new HttpError(400, 'INVALID_STUDENT_ID', 'student_id must be text');
  }
  return { studentId: studentId.trim() };
}

export function parseLockBody(body, settings) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'INVALID_BODY', 'Request body must be a JSON object');
  }
  const fields = ['room_code', 'date', 'start_time', 'end_time', 'purpose', 'student_id'];
  const missing = fields.filter((field) => typeof body[field] !== 'string' || !body[field].trim());
  if (missing.length > 0) {
    throw new HttpError(400, 'MISSING_FIELDS', 'Required reservation fields are missing', { missing });
  }

  const roomCode = body.room_code.trim();
  const date = body.date.trim();
  const startTime = body.start_time.trim();
  const endTime = body.end_time.trim();
  const purpose = body.purpose.trim();
  const studentId = body.student_id.trim();
  if (!isIsoDate(date)) {
    throw new HttpError(400, 'INVALID_DATE', 'date must be a valid ISO date (YYYY-MM-DD)');
  }
  if (!isTime(startTime) || !isTime(endTime)) {
    throw new HttpError(400, 'INVALID_TIME', 'start_time and end_time must use HH:mm 24-hour format');
  }
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start >= end) {
    throw new HttpError(400, 'INVALID_TIME_RANGE', 'start_time must be earlier than end_time');
  }
  if (start % settings.minSlotMinutes !== 0
    || end % settings.minSlotMinutes !== 0
    || end - start < settings.minSlotMinutes) {
    throw new HttpError(
      400,
      'INVALID_SLOT_INCREMENT',
      `Requested times must use ${settings.minSlotMinutes}-minute increments`,
    );
  }
  if ([...purpose].length > settings.purposeMaxLength) {
    throw new HttpError(
      400,
      'PURPOSE_TOO_LONG',
      `purpose must not exceed ${settings.purposeMaxLength} characters`,
    );
  }
  return { roomCode, date, startTime, endTime, purpose, studentId };
}

export function parseAdminVenueQuery(query, settings) {
  const parsed = parseListQuery(query, settings);
  const occupancy = query.occupancy || 'all';
  if (!validOccupancyStates.has(occupancy)) {
    throw new HttpError(
      400,
      'INVALID_OCCUPANCY',
      'occupancy must be all, available, occupied, or unavailable',
    );
  }
  return {
    date: parsed.date,
    period: parsed.period,
    q: parsed.q,
    occupancy,
  };
}

function nonNegativeInteger(value, name, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new HttpError(400, `INVALID_${name.toUpperCase()}`, `${name} must be a non-negative integer`);
  }
  return Number(value);
}

export function parseAdminRequestQuery(query, settings) {
  const q = query.q || '';
  const decision = query.decision || 'all';
  const occupancy = query.occupancy || 'all';
  const sort = query.sort || 'created_at';
  if (typeof q !== 'string') {
    throw new HttpError(400, 'INVALID_SEARCH', 'q must be text');
  }
  if (!validDecisions.has(decision)) {
    throw new HttpError(400, 'INVALID_DECISION', 'decision must be all, pending, approved, or rejected');
  }
  if (!validOccupancyStates.has(occupancy)) {
    throw new HttpError(
      400,
      'INVALID_OCCUPANCY',
      'occupancy must be all, available, occupied, or unavailable',
    );
  }
  if (!['created_at', 'date'].includes(sort)) {
    throw new HttpError(400, 'INVALID_SORT', 'sort must be created_at or date');
  }
  if (query.room_code !== undefined && typeof query.room_code !== 'string') {
    throw new HttpError(400, 'INVALID_ROOM_CODE', 'room_code must be text');
  }
  const limit = nonNegativeInteger(query.limit, 'limit', settings.admin.requestLimit);
  const offset = nonNegativeInteger(query.offset, 'offset', 0);
  if (limit < 1 || limit > settings.admin.requestLimitMax) {
    throw new HttpError(
      400,
      'INVALID_LIMIT',
      `limit must be between 1 and ${settings.admin.requestLimitMax}`,
    );
  }
  return {
    q: q.trim(),
    decision,
    occupancy,
    roomCode: query.room_code?.trim(),
    sort,
    limit,
    offset,
  };
}

export function parseDecisionBody(body, settings) {
  if (body === undefined || body === null) return { reason: null };
  if (typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'INVALID_BODY', 'Request body must be a JSON object');
  }
  if (body.reason !== undefined && body.reason !== null && typeof body.reason !== 'string') {
    throw new HttpError(400, 'INVALID_REASON', 'reason must be text');
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() || null : null;
  if (reason && [...reason].length > settings.admin.decisionReasonMaxLength) {
    throw new HttpError(
      400,
      'REASON_TOO_LONG',
      `reason must not exceed ${settings.admin.decisionReasonMaxLength} characters`,
    );
  }
  return { reason };
}
