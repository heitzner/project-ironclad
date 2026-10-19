const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/

export const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))

export const isTime = (value) => timePattern.test(value)

export const timeToMinutes = (value) => {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

export const minutesToTime = (value) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`

export const overlaps = (entry, startTime, endTime) => (
  timeToMinutes(entry.start_time) < timeToMinutes(endTime)
  && timeToMinutes(startTime) < timeToMinutes(entry.end_time)
)

const busyStates = new Set(['occupied', 'reserved', 'locked'])
export const isBusy = (entry) => busyStates.has(entry.state)

export function freeWindows(entries, segments) {
  return segments.flatMap((segment) => {
    const start = timeToMinutes(segment.start)
    const end = timeToMinutes(segment.end)
    let cursor = start
    const result = []
    const busy = entries.filter(isBusy).toSorted((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
    for (const entry of busy) {
      const entryStart = Math.max(start, timeToMinutes(entry.start_time))
      const entryEnd = Math.min(end, timeToMinutes(entry.end_time))
      if (entryEnd <= cursor || entryStart >= end) continue
      if (entryStart > cursor) result.push({ start_time: minutesToTime(cursor), end_time: minutesToTime(entryStart) })
      cursor = Math.max(cursor, entryEnd)
    }
    if (cursor < end) result.push({ start_time: minutesToTime(cursor), end_time: minutesToTime(end) })
    return result
  })
}

export function utilizationPercent(venue, entries, segments) {
  if (venue.status_override || !venue.is_details_available) return 0
  const total = segments.reduce((sum, segment) => sum + timeToMinutes(segment.end) - timeToMinutes(segment.start), 0)
  const booked = segments.reduce((sum, segment) => {
    const segmentStart = timeToMinutes(segment.start)
    const segmentEnd = timeToMinutes(segment.end)
    return sum + entries.filter(isBusy).reduce((entrySum, entry) => (
      entrySum + Math.max(0, Math.min(segmentEnd, timeToMinutes(entry.end_time)) - Math.max(segmentStart, timeToMinutes(entry.start_time)))
    ), 0)
  }, 0)
  return Math.min(100, Math.round((booked / (total || 1)) * 100))
}

export function deriveStatus(venue, entries, segments) {
  if (venue.status_override || !venue.is_details_available) {
    return { status: 'unavailable', status_label: venue.status_override ?? 'Details Unavailable' }
  }
  if (freeWindows(entries, segments).length === 0) {
    return { status: 'occupied', status_label: 'Occupied' }
  }
  return { status: 'available', status_label: 'Free Window Available' }
}

export function currentEntry(entries, atTime) {
  const minute = timeToMinutes(atTime)
  return entries.find((entry) => timeToMinutes(entry.start_time) <= minute && minute < timeToMinutes(entry.end_time)) ?? null
}
