import { HttpError } from './errors.js';
import { currentDateInZone, currentTimeInZone, isIsoDate, isTime, timeToMinutes } from '../domain/dateTime.js';

const periods = new Set(['all_day', 'morning', 'evening']);
const occupancyStates = new Set(['all', 'available', 'occupied', 'unavailable']);
const decisions = new Set(['all', 'pending', 'approved', 'rejected']);

function configuredInstant(settings, council = false) {
  return council && settings.council.clockIso ? new Date(settings.council.clockIso) : new Date();
}

function parseDate(value, settings, council = false) {
  const date = value || currentDateInZone(settings.timeZone, configuredInstant(settings, council));
  if (!isIsoDate(date)) throw new HttpError(400, 'INVALID_DATE', 'date must use YYYY-MM-DD');
  return date;
}

function parsePeriod(value) {
  const period = value || 'all_day';
  if (!periods.has(period)) throw new HttpError(400, 'INVALID_PERIOD', 'period must be all_day, morning, or evening');
  return period;
}

function parseFloor(value) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^[1-4]$/.test(value)) throw new HttpError(400, 'INVALID_FLOOR', 'floor must be 1, 2, 3, or 4');
  return Number(value);
}

function text(value, name, fallback = '') {
  const result = value ?? fallback;
  if (typeof result !== 'string') throw new HttpError(400, `INVALID_${name.toUpperCase()}`, `${name} must be text`);
  return result.trim();
}

function integer(value, name, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new HttpError(400, `INVALID_${name.toUpperCase()}`, `${name} must be a non-negative integer`);
  return Number(value);
}

function pagination(query, defaults) {
  const limit = integer(query.limit, 'limit', defaults.requestLimit);
  const offset = integer(query.offset, 'offset', 0);
  if (limit < 1 || limit > defaults.requestLimitMax) throw new HttpError(400, 'INVALID_LIMIT', `limit must be between 1 and ${defaults.requestLimitMax}`);
  return { limit, offset };
}

export function parseListQuery(query, settings) {
  return {
    date: parseDate(query.date, settings),
    period: parsePeriod(query.period),
    floor: parseFloor(query.floor),
    q: text(query.q, 'search'),
  };
}

export function parseDetailsQuery(query, settings) {
  const parsed = parseListQuery(query, settings);
  return { date: parsed.date, period: parsed.period };
}

export function parseOccupancyQuery(query, settings) {
  const date = parseDate(query.date, settings);
  const atTime = query.at_time || currentTimeInZone(settings.timeZone);
  if (!isTime(atTime)) throw new HttpError(400, 'INVALID_TIME', 'at_time must use HH:mm');
  return { date, atTime };
}

export function parseVacancyQuery(query, settings) {
  const date = parseDate(query.date, settings);
  const requestedStart = query.requested_start;
  if (requestedStart !== undefined && !isTime(requestedStart)) throw new HttpError(400, 'INVALID_TIME', 'requested_start must use HH:mm');
  return { date, requestedStart };
}

export function parseReservationConfigQuery(query, settings) {
  return { studentId: text(query.student_id, 'student_id', settings.defaultStudentId) };
}

function parseReservationFields(body, settings, includeStudent) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'INVALID_BODY', 'Request body must be a JSON object');
  const required = ['room_code', 'date', 'start_time', 'end_time', 'purpose'];
  if (includeStudent) required.push('student_id');
  const missing = required.filter((field) => typeof body[field] !== 'string' || !body[field].trim());
  if (missing.length) throw new HttpError(400, 'MISSING_FIELDS', 'Required reservation fields are missing', { missing });
  const roomCode = body.room_code.trim();
  const date = body.date.trim();
  const startTime = body.start_time.trim();
  const endTime = body.end_time.trim();
  const purpose = body.purpose.trim();
  if (!isIsoDate(date)) throw new HttpError(400, 'INVALID_DATE', 'date must use YYYY-MM-DD');
  if (!isTime(startTime) || !isTime(endTime)) throw new HttpError(400, 'INVALID_TIME', 'times must use HH:mm');
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start >= end) throw new HttpError(400, 'INVALID_TIME_RANGE', 'start_time must be earlier than end_time');
  if (start % settings.minSlotMinutes || end % settings.minSlotMinutes || end - start < settings.minSlotMinutes) {
    throw new HttpError(400, 'INVALID_SLOT_INCREMENT', `Times must use ${settings.minSlotMinutes}-minute increments`);
  }
  if ([...purpose].length > settings.purposeMaxLength) throw new HttpError(400, 'PURPOSE_TOO_LONG', `purpose must not exceed ${settings.purposeMaxLength} characters`);
  return { roomCode, date, startTime, endTime, purpose, studentId: includeStudent ? body.student_id.trim() : undefined };
}

export function parseLockBody(body, settings) { return parseReservationFields(body, settings, true); }
export function parseCouncilReservationBody(body, settings) { return parseReservationFields(body, settings, false); }

export function parseAdminVenueQuery(query, settings) {
  const base = parseListQuery(query, settings);
  const occupancy = query.occupancy || 'all';
  if (!occupancyStates.has(occupancy)) throw new HttpError(400, 'INVALID_OCCUPANCY', 'Invalid occupancy filter');
  return { date: base.date, period: base.period, q: base.q, occupancy };
}

function parseRequestQuery(query, defaults, includeOccupancy = false) {
  const decision = query.decision || 'all';
  if (!decisions.has(decision)) throw new HttpError(400, 'INVALID_DECISION', 'Invalid decision filter');
  const sort = query.sort || 'created_at';
  if (!['created_at', 'date'].includes(sort)) throw new HttpError(400, 'INVALID_SORT', 'sort must be created_at or date');
  const result = {
    q: text(query.q, 'search'),
    decision,
    roomCode: query.room_code === undefined ? undefined : text(query.room_code, 'room_code'),
    sort,
    ...pagination(query, defaults),
  };
  if (includeOccupancy) {
    result.occupancy = query.occupancy || 'all';
    if (!occupancyStates.has(result.occupancy)) throw new HttpError(400, 'INVALID_OCCUPANCY', 'Invalid occupancy filter');
  }
  return result;
}

export function parseAdminRequestQuery(query, settings) { return parseRequestQuery(query, settings.admin, true); }

export function parseDecisionBody(body, settings) {
  if (body === undefined || body === null) return { reason: null };
  if (typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'INVALID_BODY', 'Request body must be a JSON object');
  const reason = body.reason === undefined || body.reason === null ? null : text(body.reason, 'reason') || null;
  if (reason && [...reason].length > settings.admin.decisionReasonMaxLength) throw new HttpError(400, 'REASON_TOO_LONG', 'Decision reason is too long');
  return { reason };
}

export function parseCouncilVenueQuery(query, settings) {
  const date = parseDate(query.date, settings, true);
  return {
    date,
    period: parsePeriod(query.period),
    floor: parseFloor(query.floor),
    q: text(query.q, 'search'),
    selectedRoomCode: query.selected_room_code === undefined ? undefined : text(query.selected_room_code, 'selected_room_code'),
    atTime: currentTimeInZone(settings.timeZone, configuredInstant(settings, true)),
  };
}

export function parseCouncilSidebarQuery(query, settings) {
  const instant = configuredInstant(settings, true);
  const atTime = query.at_time || currentTimeInZone(settings.timeZone, instant);
  if (!isTime(atTime)) throw new HttpError(400, 'INVALID_TIME', 'at_time must use HH:mm');
  return { date: parseDate(query.date, settings, true), atTime };
}

export function parseCouncilRequestQuery(query, settings) {
  return {
    ...parseRequestQuery(query, settings.council, false),
    selectedReservationId: query.selected_reservation_id === undefined
      ? undefined : text(query.selected_reservation_id, 'selected_reservation_id'),
  };
}

export function parseEndorsementBody(body, settings) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'INVALID_BODY', 'Request body must be a JSON object');
  const message = text(body.message, 'message');
  if (!message) throw new HttpError(400, 'ENDORSEMENT_MESSAGE_REQUIRED', 'message is required');
  if ([...message].length > settings.council.endorsementMaxLength) throw new HttpError(400, 'ENDORSEMENT_TOO_LONG', 'Endorsement message is too long');
  return { message };
}
