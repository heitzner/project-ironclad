export const TIME_ZONE = 'Asia/Manila'
export const SHIFTS = ['all', 'morning', 'evening']

export function clockParts(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(({ type, value }) => [type, value]))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) }
}

export function addDays(date, count) {
  const day = new Date(`${date}T12:00:00+08:00`)
  day.setUTCDate(day.getUTCDate() + count)
  return clockParts(day).date
}

export function bookingDates(now) {
  const today = clockParts(now).date
  return Array.from({ length: 7 }, (_, index) => addDays(today, index))
}

export function formatDate(date, short = false) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE, weekday: short ? 'short' : 'long', month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(`${date}T12:00:00+08:00`))
}

export function formatTime(minute) {
  const hour = Math.floor(minute / 60)
  return `${String(hour % 12 || 12).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
}

export function timeRange(start, end) {
  return `${formatTime(start)} – ${formatTime(end)}`
}

export function durationLabel(start, end) {
  return `${Number(((end - start) / 60).toFixed(2))} hrs`
}

export function overlaps(a, b) {
  return a.start < b.end && b.start < a.end
}

export function roomSchedule(schedules, roomId, date) {
  return schedules.entries.filter(entry => entry.roomId === roomId && entry.date === date)
    .toSorted((a, b) => a.start - b.start)
}

export function getFreeWindows(room, date, shift, schedules, now) {
  const current = clockParts(now)
  if (room.blocked || !bookingDates(now).includes(date) || !SHIFTS.includes(shift)) return []
  const blocks = roomSchedule(schedules, room.id, date)
  // Always start at a future quarter hour, including when the clock is exactly on one.
  const earliest = date === current.date ? (Math.floor(current.minute / 15) + 1) * 15 : 0
  const windows = schedules.windows.filter(window => shift === 'all' || window.shift === shift)
  // Adjacent shift windows are one interval in the All Day view.
  const merged = []
  for (const window of windows.toSorted((a, b) => a.start - b.start)) {
    const last = merged.at(-1)
    if (last && window.start <= last.end) last.end = Math.max(last.end, window.end)
    else merged.push({ start: window.start, end: window.end })
  }
  return merged.flatMap(window => {
    let cursor = Math.max(window.start, earliest)
    const free = []
    for (const block of blocks) {
      if (block.end <= cursor || block.start >= window.end) continue
      if (block.start > cursor) free.push({ start: cursor, end: Math.min(block.start, window.end) })
      cursor = Math.max(cursor, block.end)
    }
    if (cursor < window.end) free.push({ start: cursor, end: window.end })
    return free
  })
}

export function getSlotOptions(windows) {
  // The form offers the next free window, with a shorter preset only when it fits.
  const window = windows[0]
  if (!window) return []
  const choices = []
  if (window.end - window.start > 150) choices.push({ start: window.start, end: window.start + 150, preset: true })
  choices.push({ ...window, preset: false })
  return choices.map(slot => ({ ...slot, id: `${slot.start}-${slot.end}` }))
}

export function roomView(room, date, shift, schedules, now) {
  const current = clockParts(now)
  const entries = roomSchedule(schedules, room.id, date)
  const windows = getFreeWindows(room, date, shift, schedules, now)
  const shiftWindows = schedules.windows.filter(window => shift === 'all' || window.shift === shift)
  const operatingWindow = shiftWindows.length ? { start: Math.min(...shiftWindows.map(window => window.start)), end: Math.max(...shiftWindows.map(window => window.end)) } : null
  const inShift = shiftWindows.some(window => window.start <= current.minute && current.minute < window.end)
  const active = date === current.date && inShift && entries.find(entry => entry.start <= current.minute && current.minute < entry.end)
  const minutes = shiftWindows.reduce((total, window) => total + window.end - window.start, 0)
  const allocated = shiftWindows.reduce((total, window) => total + entries.reduce((sum, entry) => sum + Math.max(0, Math.min(entry.end, window.end) - Math.max(entry.start, window.start)), 0), 0)
  const status = room.blocked ? 'unavailable' : active ? (active.type === 'reserved' ? 'reserved' : 'occupied') : windows.length ? 'available' : 'unavailable'
  const label = room.blocked?.label || { available: date === current.date && inShift ? 'Available Now' : 'Free Window Available', occupied: 'In Session', reserved: 'Reserved', unavailable: 'No Availability' }[status]
  return { room, entries, windows, operatingWindow, active, status, label, utilization: room.blocked ? 0 : Math.min(100, Math.round(allocated / (minutes || 1) * 100)) }
}

export function filterVenues(views, { floor, search, statusFilter }) {
  const query = search.trim().toLowerCase().replace(/\s+/g, ' ')
  return views.filter(({ room, status }) =>
    (floor === 'all' || String(room.floor) === floor) &&
    (statusFilter === 'all' || status === statusFilter) &&
    [`Room ${room.id}`, room.name, room.location, ...(room.equipment || [])].join(' ').toLowerCase().replace(/\s+/g, ' ').includes(query))
}

export function updateDraft(previous, patch, { rooms, schedules, now }) {
  const next = { ...previous, ...patch }
  if (!bookingDates(now).includes(next.date)) next.date = bookingDates(now)[0]
  const views = rooms.map(room => roomView(room, next.date, next.shift, schedules, now))
  const selected = filterVenues(views, next).find(view => view.room.id === next.roomId)
  if (!selected) next.roomId = null
  if (next.date !== previous.date || next.shift !== previous.shift || next.roomId !== previous.roomId ||
    !getSlotOptions(selected?.windows || []).some(slot => slot.id === next.slotId)) next.slotId = ''
  return next
}

export function validateRequest(request, { rooms, schedules, now }) {
  if (!request.purpose?.trim()) return { field: 'purpose', message: 'Enter an activity purpose or organization.' }
  const room = rooms.find(item => item.id === request.roomId)
  if (!room) return { field: 'slot', message: 'Select a venue before requesting a reservation.' }
  if (!bookingDates(now).includes(request.date)) return { field: 'slot', message: 'Choose a date within the next seven days.' }
  if (!SHIFTS.includes(request.shift)) return { field: 'slot', message: 'Choose a valid booking shift.' }
  if (!Number.isInteger(request.start) || !Number.isInteger(request.end) || request.start >= request.end) return { field: 'slot', message: 'Select a valid requested duration.' }
  const current = clockParts(now)
  if (request.date === current.date && request.start <= current.minute) return { field: 'slot', message: 'This time has passed. Choose a new available window.' }
  const windows = getFreeWindows(room, request.date, request.shift, schedules, now)
  if (!windows.some(window => request.start >= window.start && request.end <= window.end)) return { field: 'slot', message: room.blocked?.reason || 'This window is no longer available. Choose another time.' }
  return null
}
