const iconByRoom = {
  '101': 'd6359', '102': 'a03ca', '103': 'e0f42', '104': 'f3f56',
  '201': 'c128c', '202': '70e47', '203': 'c22e4', '204': 'd5d3c',
  '301': '01ee1', '302': '97981', '303': '5163f', '304': 'bbd73',
}

export const timeToMinute = (value) => {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

const toRoom = (venue) => {
  const id = venue.room_code.replace(/^Room\s+/i, '')
  const blocked = venue.status === 'unavailable' ? {
    label: venue.status_label,
    reason: venue.status_override
      ? `This venue is ${venue.status_override.toLowerCase()}. Choose another room.`
      : 'This venue is unavailable. Choose another room.',
  } : null
  return {
    id,
    floor: venue.floor,
    name: venue.name,
    capacity: venue.capacity,
    location: venue.location_label,
    equipment: venue.equipment,
    icon: iconByRoom[id] ?? 'd6359',
    selectedIcon: iconByRoom[id] ?? 'd6359',
    blocked,
  }
}

const toEntry = (entry) => ({
  date: entry.date,
  roomId: entry.venue_id.replace(/^Room\s+/i, ''),
  start: timeToMinute(entry.start_time),
  end: timeToMinute(entry.end_time),
  type: entry.entry_type === 'reserved' ? 'reserved' : entry.state === 'locked' ? 'blocked' : 'class',
  title: entry.title,
  host: entry.instructor_name,
})

const operatingWindow = (segments = []) => segments.length ? {
  start: Math.min(...segments.map((segment) => timeToMinute(segment.start))),
  end: Math.max(...segments.map((segment) => timeToMinute(segment.end))),
} : null

export function catalogVenueToView(venue, segments) {
  return {
    room: toRoom(venue),
    entries: [],
    windows: venue.next_free_window ? [{ start: timeToMinute(venue.next_free_window.start_time), end: timeToMinute(venue.next_free_window.end_time) }] : [],
    operatingWindow: operatingWindow(segments),
    active: null,
    status: venue.status,
    label: venue.status_label,
    utilization: venue.utilization_percent,
  }
}

export function venueDetailsToView(response) {
  const venue = response.data
  const entries = venue.timetable.map(toEntry)
  const active = venue.current_occupancy ? toEntry(venue.current_occupancy) : null
  return {
    view: {
      room: toRoom(venue),
      entries,
      windows: venue.free_windows.map((window) => ({ start: timeToMinute(window.start_time), end: timeToMinute(window.end_time) })),
      operatingWindow: operatingWindow(response.meta.period_windows),
      active,
      status: venue.status,
      label: venue.status_label,
      utilization: venue.utilization_percent,
    },
    schedules: {
      windows: response.meta.period_windows.map((window) => ({
        shift: timeToMinute(window.start) < 12 * 60 ? 'morning' : 'evening',
        start: timeToMinute(window.start),
        end: timeToMinute(window.end),
      })),
      entries,
    },
    now: new Date(`${response.meta.date}T${response.meta.current_time}:00+08:00`),
  }
}

export const shiftToPeriod = (shift) => shift === 'all' ? 'all_day' : shift
