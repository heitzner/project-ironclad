import { durationHours, minutesToTime, overlapMinutes, timeToMinutes } from './dateTime.js';

const busyStates = new Set(['occupied', 'reserved', 'locked']);
export function isBusy(entry) { return busyStates.has(entry.state); }

export function periodTotalMinutes(windows) {
  return windows.reduce((total, window) => total + timeToMinutes(window.end) - timeToMinutes(window.start), 0);
}

function clippedBusyIntervals(entries, windows) {
  const intervals = [];
  for (const entry of entries) {
    if (!isBusy(entry)) continue;
    const start = timeToMinutes(entry.start_time);
    const end = timeToMinutes(entry.end_time);
    for (const window of windows) {
      const windowStart = timeToMinutes(window.start);
      const windowEnd = timeToMinutes(window.end);
      if (overlapMinutes(start, end, windowStart, windowEnd) > 0) {
        intervals.push([Math.max(start, windowStart), Math.min(end, windowEnd)]);
      }
    }
  }
  return intervals;
}

function mergeIntervals(intervals) {
  if (!intervals.length) return [];
  const sorted = intervals.toSorted((a, b) => a[0] - b[0]);
  const merged = [structuredClone(sorted[0])];
  for (const [start, end] of sorted.slice(1)) {
    const current = merged.at(-1);
    if (start <= current[1]) current[1] = Math.max(current[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

export function utilizationPercent(venue, entries, windows) {
  if (venue.status_override || !venue.is_details_available) return 0;
  const booked = mergeIntervals(clippedBusyIntervals(entries, windows))
    .reduce((total, [start, end]) => total + end - start, 0);
  return Math.round((booked / periodTotalMinutes(windows)) * 100);
}

export function deriveStatus(venue, entries, windows) {
  if (venue.status_override) return { status: 'unavailable', status_label: venue.status_override };
  if (!venue.is_details_available) return { status: 'unavailable', status_label: 'Details Unavailable' };
  const booked = mergeIntervals(clippedBusyIntervals(entries, windows))
    .reduce((total, [start, end]) => total + end - start, 0);
  if (booked >= periodTotalMinutes(windows)) return { status: 'occupied', status_label: 'Occupied' };
  return { status: 'available', status_label: 'Free Window Available' };
}

export function buildTimetable(entries, windows) {
  const slots = [];
  for (const window of windows) {
    const windowStart = timeToMinutes(window.start);
    const windowEnd = timeToMinutes(window.end);
    const relevant = entries.filter(isBusy).map((entry) => ({
      start: Math.max(timeToMinutes(entry.start_time), windowStart),
      end: Math.min(timeToMinutes(entry.end_time), windowEnd),
      state: entry.state,
    })).filter((entry) => entry.start < entry.end).toSorted((a, b) => a.start - b.start);
    let cursor = windowStart;
    for (const entry of relevant) {
      if (entry.start > cursor) slots.push({ start_time: minutesToTime(cursor), end_time: minutesToTime(entry.start), state: 'free_window' });
      if (entry.end > cursor) {
        slots.push({ start_time: minutesToTime(Math.max(cursor, entry.start)), end_time: minutesToTime(entry.end), state: entry.state });
        cursor = entry.end;
      }
    }
    if (cursor < windowEnd) slots.push({ start_time: minutesToTime(cursor), end_time: minutesToTime(windowEnd), state: 'free_window' });
  }
  return slots;
}

export function overlaps(entry, startTime, endTime) {
  return overlapMinutes(timeToMinutes(entry.start_time), timeToMinutes(entry.end_time), timeToMinutes(startTime), timeToMinutes(endTime)) > 0;
}

export function freeWindows(entries, operationalWindow) {
  const start = timeToMinutes(operationalWindow.start);
  const end = timeToMinutes(operationalWindow.end);
  const busy = mergeIntervals(clippedBusyIntervals(entries, [operationalWindow]));
  const windows = [];
  let cursor = start;
  for (const [busyStart, busyEnd] of busy) {
    if (busyStart > cursor) windows.push({ start_time: minutesToTime(cursor), end_time: minutesToTime(busyStart), duration_hours: durationHours(minutesToTime(cursor), minutesToTime(busyStart)) });
    cursor = Math.max(cursor, busyEnd);
  }
  if (cursor < end) windows.push({ start_time: minutesToTime(cursor), end_time: minutesToTime(end), duration_hours: durationHours(minutesToTime(cursor), minutesToTime(end)) });
  return windows;
}

export function rangeInsideFreeWindow(startTime, endTime, windows) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return windows.some((window) => start >= timeToMinutes(window.start_time) && end <= timeToMinutes(window.end_time));
}

function entriesForScheduleDisplay(entries) {
  const busy = entries.filter(isBusy);
  const free = entries.filter((entry) => !isBusy(entry)).flatMap((entry) => {
    let intervals = [[timeToMinutes(entry.start_time), timeToMinutes(entry.end_time)]];
    for (const blocker of busy) {
      const blockingStart = timeToMinutes(blocker.start_time);
      const blockingEnd = timeToMinutes(blocker.end_time);
      intervals = intervals.flatMap(([start, end]) => {
        if (blockingEnd <= start || blockingStart >= end) return [[start, end]];
        const remaining = [];
        if (blockingStart > start) remaining.push([start, blockingStart]);
        if (blockingEnd < end) remaining.push([blockingEnd, end]);
        return remaining;
      });
    }
    return intervals.map(([start, end]) => ({ ...entry, start_time: minutesToTime(start), end_time: minutesToTime(end) }));
  });
  const priority = { locked: 3, reserved: 2, occupied: 1, free_window: 0 };
  return [...busy, ...free].toSorted((left, right) => {
    const difference = timeToMinutes(left.start_time) - timeToMinutes(right.start_time);
    return difference || (priority[right.state] || 0) - (priority[left.state] || 0);
  });
}

export function findCurrentEntry(entries, atTime) {
  const at = timeToMinutes(atTime);
  return entriesForScheduleDisplay(entries).find((entry) => timeToMinutes(entry.start_time) <= at && at < timeToMinutes(entry.end_time)) || null;
}

export function upcomingEntries(entries, atTime) {
  const at = timeToMinutes(atTime);
  return entriesForScheduleDisplay(entries).filter((entry) => timeToMinutes(entry.start_time) >= at);
}

export function stateLabel(entry) {
  if (entry.state === 'free_window' || entry.entry_type === 'vacant') return 'Free Window';
  if (entry.entry_type === 'class') return 'Class';
  if (entry.state === 'locked') return 'Locked';
  return 'Reserved';
}
