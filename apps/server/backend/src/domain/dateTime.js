export function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function isTime(value) {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function timeToMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(value) {
  const hours = Math.floor(value / 60).toString().padStart(2, '0');
  const minutes = (value % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function overlapMinutes(startA, endA, startB, endB) {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

export function durationHours(startTime, endTime) {
  return Math.round(((timeToMinutes(endTime) - timeToMinutes(startTime)) / 60) * 10) / 10;
}

export function formatTime12Hour(value, includeSeconds = false) {
  const parts = value.split(':').map(Number);
  const [hours, minutes, seconds = 0] = parts;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  const base = `${String(displayHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return `${includeSeconds ? `${base}:${String(seconds).padStart(2, '0')}` : base} ${suffix}`;
}

function zonedParts(timeZone, instant = new Date()) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant).map((part) => [part.type, part.value]));
}

export function currentTimeInZone(timeZone, instant = new Date()) {
  const values = zonedParts(timeZone, instant);
  return `${values.hour}:${values.minute}`;
}

export function currentDateInZone(timeZone, instant = new Date()) {
  const values = zonedParts(timeZone, instant);
  return `${values.year}-${values.month}-${values.day}`;
}

export function displayClockInZone(timeZone, instant = new Date()) {
  return {
    display_time: new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(instant),
    display_date: new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(instant),
  };
}
