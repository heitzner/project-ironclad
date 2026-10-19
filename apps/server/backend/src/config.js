import { isIsoDate, isTime } from './domain/dateTime.js';

function configuredTime(name, fallback) {
  const value = process.env[name] || fallback;
  if (!isTime(value)) {
    throw new Error(`${name} must use HH:mm 24-hour format`);
  }
  return value;
}

function configuredDemoWeekStart() {
  if (process.env.DEMO_WEEK_START) {
    if (!isIsoDate(process.env.DEMO_WEEK_START)) {
      throw new Error('DEMO_WEEK_START must be an ISO date (YYYY-MM-DD)');
    }
    return process.env.DEMO_WEEK_START;
  }

  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7;
  today.setDate(today.getDate() - mondayOffset);
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const morning = {
  start: configuredTime('MORNING_START', '07:00'),
  end: configuredTime('MORNING_END', '12:00'),
};
const evening = {
  start: configuredTime('EVENING_START', '13:00'),
  end: configuredTime('EVENING_END', '18:00'),
};

if (morning.start >= morning.end || evening.start >= evening.end) {
  throw new Error('Each booking period start must be earlier than its end');
}
if (morning.end > evening.start) {
  throw new Error('Morning and evening booking periods must not overlap');
}

const operationalWindow = {
  start: configuredTime('BOOKING_DAY_START', '07:00'),
  end: configuredTime('BOOKING_DAY_END', '21:30'),
};
if (operationalWindow.start >= operationalWindow.end) {
  throw new Error('BOOKING_DAY_START must be earlier than BOOKING_DAY_END');
}

const purposeMaxLength = Number(process.env.BOOKING_PURPOSE_MAX_LENGTH || 200);
const minSlotMinutes = Number(process.env.BOOKING_MIN_SLOT_MINUTES || 30);
const adminRequestLimit = Number(process.env.ADMIN_REQUEST_LIMIT || 20);
const adminRequestLimitMax = Number(process.env.ADMIN_REQUEST_LIMIT_MAX || 100);
const decisionReasonMaxLength = Number(process.env.ADMIN_DECISION_REASON_MAX_LENGTH || 500);
if (!Number.isInteger(purposeMaxLength) || purposeMaxLength < 1) {
  throw new Error('BOOKING_PURPOSE_MAX_LENGTH must be a positive integer');
}
if (!Number.isInteger(minSlotMinutes) || minSlotMinutes < 1) {
  throw new Error('BOOKING_MIN_SLOT_MINUTES must be a positive integer');
}
if (!Number.isInteger(adminRequestLimit) || adminRequestLimit < 1) {
  throw new Error('ADMIN_REQUEST_LIMIT must be a positive integer');
}
if (!Number.isInteger(adminRequestLimitMax) || adminRequestLimitMax < adminRequestLimit) {
  throw new Error('ADMIN_REQUEST_LIMIT_MAX must be an integer at least as large as the default limit');
}
if (!Number.isInteger(decisionReasonMaxLength) || decisionReasonMaxLength < 1) {
  throw new Error('ADMIN_DECISION_REASON_MAX_LENGTH must be a positive integer');
}

const adminConnectionState = process.env.ADMIN_CONNECTION_STATE || 'connected';
if (!['connected', 'not_connected'].includes(adminConnectionState)) {
  throw new Error('ADMIN_CONNECTION_STATE must be connected or not_connected');
}

const corsAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS
  || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean);

export const config = Object.freeze({
  port: Number(process.env.PORT || 3000),
  timeZone: process.env.BOOKING_TIME_ZONE || 'Asia/Manila',
  approverRole: process.env.BOOKING_APPROVER_ROLE || 'MIS Administrator',
  purposeMaxLength,
  minSlotMinutes,
  defaultStudentId: '2022-10892',
  cors: Object.freeze({
    allowedOrigins: Object.freeze(corsAllowedOrigins),
    allowLocalDevelopmentOrigins: process.env.CORS_ALLOW_LOCAL_DEVELOPMENT_ORIGINS !== 'false',
  }),
  admin: Object.freeze({
    connectionState: adminConnectionState,
    sessionHeader: process.env.ADMIN_SESSION_HEADER || 'x-ironclad-test-session',
    testSessionId: process.env.ADMIN_TEST_SESSION_ID || 'admin-demo',
    nonAdminSessionId: 'student-demo',
    requestLimit: adminRequestLimit,
    requestLimitMax: adminRequestLimitMax,
    decisionReasonMaxLength,
  }),
  demoWeekStart: configuredDemoWeekStart(),
  calendar: Object.freeze({ term_label: 'Term 2', week_label: 'W6' }),
  operationalWindow: Object.freeze(operationalWindow),
  periods: Object.freeze({
    morning: Object.freeze([Object.freeze(morning)]),
    evening: Object.freeze([Object.freeze(evening)]),
    all_day: Object.freeze([Object.freeze(morning), Object.freeze(evening)]),
  }),
});
