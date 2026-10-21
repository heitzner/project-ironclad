import { formatTime as baseFormatTime, bookingDates, getSlotOptions as presets, roomView as baseRoomView } from '../features/student-booking/booking.logic.js'

export function getSlotOptions(windows) {
  // Keep every free interval available, including periods after an occupied block.
  return windows.flatMap(window => presets([window]))
}

export function updateDraft(previous, patch, { rooms, schedules, now }) {
  const next = { ...previous, ...patch }
  if (!bookingDates(now).includes(next.date)) next.date = bookingDates(now)[0]
  const room = rooms.find(room => room.id === next.roomId)
  if (!room) next.roomId = null
  // Floor/search/status filters affect the catalog, not the selected room.
  const windows = room ? roomView(room, next.date, next.shift, schedules, now).windows : []
  if (next.date !== previous.date || next.shift !== previous.shift || next.roomId !== previous.roomId) { next.slotId = ''; next.from = ''; next.to = '' }
  if (next.slotId && next.slotId !== 'custom' && !getSlotOptions(windows).some(slot => slot.id === next.slotId)) next.slotId = ''
  if (patch.from !== undefined) { next.to = ''; next.slotId = 'custom' }
  if (patch.to !== undefined) next.slotId = 'custom'
  return next
}

export function customTimeOptions(windows, from = '') {
  const starts = []
  for (const window of windows) for (let m = Math.ceil(window.start / 15) * 15; m < window.end; m += 15) starts.push(m)
  const window = from === '' ? null : windows.find(w => Number(from) >= w.start && Number(from) < w.end)
  const ends = []
  if (window) for (let m = Number(from) + 15; m <= window.end; m += 15) ends.push(m)
  return { starts, ends }
}

export function roomView(...args) {
  const view = baseRoomView(...args)
  const closure = view.active?.type === 'closure' ? view.active : !view.windows.length && view.entries.find(entry => entry.type === 'closure' && entry.start <= (view.operatingWindow?.start ?? 0) && entry.end >= (view.operatingWindow?.end ?? 1440))
  return closure ? { ...view, closure, status: 'unavailable', label: 'Scheduled closure' } : view
}

export const timeRange = (start, end) => `${baseFormatTime(start)} – ${end === 1440 ? '12:00 AM (next day)' : baseFormatTime(end)}`
