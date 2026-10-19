import { isIsoDate, isTime } from './domain/dateTime.js';

function configuredTime(name, fallback) {
  const value = process.env[name] || fallback;
  if (!isTime(value)) throw new Error(`${name} must use HH:mm 24-hour format`);
  return value;
}

function positiveInteger(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}

function connectionState(name) {
  const value = process.env[name] || 'connected';
  if (!['connected', 'not_connected'].includes(value)) {
    throw new Error(`${name} must be connected or not_connected`);
  }
  return value;
}

function demoWeekStart() {
  if (process.env.DEMO_WEEK_START) {
    if (!isIsoDate(process.env.DEMO_WEEK_START)) {
      throw new Error('DEMO_WEEK_START must use YYYY-MM-DD');
    }
    return process.env.DEMO_WEEK_START;
  }
  const date = new Date();
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function allowedOrigins() {
  return (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map((origin) => origin.trim()).filter(Boolean);
}

const morning = { start: configuredTime('MORNING_START', '07:00'), end: configuredTime('MORNING_END', '12:00') };
const evening = { start: configuredTime('EVENING_START', '13:00'), end: configuredTime('EVENING_END', '18:00') };
const operationalWindow = { start: configuredTime('BOOKING_DAY_START', '07:00'), end: configuredTime('BOOKING_DAY_END', '21:30') };
if (morning.start >= morning.end || evening.start >= evening.end || morning.end > evening.start) {
  throw new Error('Booking periods are invalid or overlap');
}
if (operationalWindow.start >= operationalWindow.end) throw new Error('Booking day range is invalid');

const adminRequestLimit = positiveInteger('ADMIN_REQUEST_LIMIT', 20);
const adminRequestLimitMax = positiveInteger('ADMIN_REQUEST_LIMIT_MAX', 100);
const councilRequestLimit = positiveInteger('COUNCIL_REQUEST_LIMIT', 20);
const councilRequestLimitMax = positiveInteger('COUNCIL_REQUEST_LIMIT_MAX', 100);
if (adminRequestLimitMax < adminRequestLimit || councilRequestLimitMax < councilRequestLimit) {
  throw new Error('Maximum request limits must be at least their defaults');
}
const vacantMaxPercent = Number(process.env.COUNCIL_VACANT_MAX_PERCENT || 25);
const allocatedMinPercent = Number(process.env.COUNCIL_ALLOCATED_MIN_PERCENT || 70);
if (![vacantMaxPercent, allocatedMinPercent].every((value) => value >= 0 && value <= 100)) {
  throw new Error('Council utilization thresholds must be between 0 and 100');
}
const councilClockIso = process.env.COUNCIL_CLOCK_ISO || null;
if (councilClockIso && Number.isNaN(Date.parse(councilClockIso))) {
  throw new Error('COUNCIL_CLOCK_ISO must be a valid ISO datetime');
}

export const config = Object.freeze({
  port: Number(process.env.PORT || 3000),
  timeZone: process.env.BOOKING_TIME_ZONE || 'Asia/Manila',
  approverRole: process.env.BOOKING_APPROVER_ROLE || 'MIS Administrator',
  purposeMaxLength: positiveInteger('BOOKING_PURPOSE_MAX_LENGTH', 200),
  minSlotMinutes: positiveInteger('BOOKING_MIN_SLOT_MINUTES', 30),
  defaultStudentId: '2022-10892',
  demoWeekStart: demoWeekStart(),
  calendar: Object.freeze({ term_label: 'Term 2', week_label: 'W6' }),
  operationalWindow: Object.freeze(operationalWindow),
  cors: Object.freeze({ allowedOrigins: Object.freeze(allowedOrigins()) }),
  periods: Object.freeze({
    morning: Object.freeze([Object.freeze(morning)]),
    evening: Object.freeze([Object.freeze(evening)]),
    all_day: Object.freeze([Object.freeze(morning), Object.freeze(evening)]),
  }),
  admin: Object.freeze({
    connectionState: connectionState('ADMIN_CONNECTION_STATE'),
    sessionHeader: process.env.ADMIN_SESSION_HEADER || 'x-ironclad-test-session',
    testSessionId: process.env.ADMIN_TEST_SESSION_ID || 'admin-demo',
    nonAdminSessionId: 'student-demo',
    requestLimit: adminRequestLimit,
    requestLimitMax: adminRequestLimitMax,
    decisionReasonMaxLength: positiveInteger('ADMIN_DECISION_REASON_MAX_LENGTH', 500),
  }),
  council: Object.freeze({
    connectionState: connectionState('COUNCIL_CONNECTION_STATE'),
    sessionHeader: process.env.COUNCIL_SESSION_HEADER || 'x-ironclad-test-session',
    testSessionId: process.env.COUNCIL_TEST_SESSION_ID || 'council-demo',
    nonCouncilSessionIds: Object.freeze(['admin-demo', 'student-demo']),
    requestLimit: councilRequestLimit,
    requestLimitMax: councilRequestLimitMax,
    endorsementMaxLength: positiveInteger('COUNCIL_ENDORSEMENT_MAX_LENGTH', 2000),
    vacantMaxPercent,
    allocatedMinPercent,
    examPrepEntryType: process.env.COUNCIL_EXAM_PREP_ENTRY_TYPE || 'exam_prep',
    clockIso: councilClockIso,
  }),
});
