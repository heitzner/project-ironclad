import { bookingDates, validateRequest } from './booking.logic.js'

// These records are a frontend demonstration, not a campus inventory or SIS feed.
export const mockRooms = [
  ['101', 1, 'General Lecture Hall', 50, 'Main Lobby', 'd6359', '6f4c7'],
  ['102', 1, 'Physics & Electronics Lab', 40, 'Science Wing', 'a03ca', '4d989'],
  ['103', 1, 'Multimedia Studio', 35, 'Media Annex', 'e0f42', '7c8fb'],
  ['104', 1, 'Seminar & Conference Room', 60, 'North Corridor', 'f3f56', 'f3f56'],
  ['201', 2, 'Computer Science Lab 1', 45, 'West Wing', 'c128c', 'c128c'],
  ['202', 2, 'Computer Science Lab 2', 40, 'West Wing', '70e47', '70e47'],
  ['203', 2, 'Network Systems Lab', 36, 'Central Hall', 'c22e4', 'c22e4'],
  ['204', 2, 'AI & Data Science Suite', 28, 'East Corridor', 'd5d3c', 'd5d3c'],
  ['301', 3, 'Advanced Robotics & AI Lab', 30, 'East Wing', '01ee1', '01ee1'],
  ['302', 3, 'Cyber Forensics Studio', 35, 'Cyber Annex', '97981', '97981'],
  ['303', 3, 'Software Engineering Hall', 45, 'North Corridor', '5163f', '5163f'],
  ['304', 3, 'Cloud Systems Research Lab', 25, 'West Wing', 'bbd73', 'bbd73'],
].map(([id, floor, name, capacity, location, icon, selectedIcon]) => ({
  id, floor, name, capacity, location: `Level ${floor}, ${location}`, icon, selectedIcon,
  blocked: id === '203' ? { label: 'Locked by Dean', reason: 'This venue is locked by the Dean. Choose another room.' }
    : id === '304' ? { label: 'Maintenance', reason: 'This venue is under maintenance. Choose another room.' } : null,
}))

export const mockRequester = {
  id: 'DEMO-STUDENT', name: 'Alex D. Reyes', studentId: 'DEMO-2026-001', program: 'BSCS 3A',
}

const timetable = {
  '101': [[480, 690, 'class', 'GEC 008 Ethics with Peace Studies · BSCS 3A', 'Prof. M. Santos'], [810, 990, 'class', 'GEC 007 Science, Technology & Society · BSCS 3A'], [1020, 1170, 'reserved', 'Open Study / CS Guild']],
  '102': [[810, 990, 'class', 'CC 125 Software Engineering 1 · BSCS 3A'], [1020, 1170, 'reserved', 'Open Study / Electronics Guild']],
  '103': [[480, 810, 'class', 'CSE 101 System Fundamentals · BSCS 3A']],
  '104': [[480, 810, 'reserved', 'Student Council Conference']],
  '201': [[480, 900, 'class', 'CC 116 Advanced Web Systems · BSCS 3A', 'Prof. M. Raby'], [990, 1140, 'class', 'CSP 111 Algorithm & Complexity · BSCS 3B'], [1140, 1290, 'reserved', 'Open Lab / CS Guild']],
  '202': [[480, 570, 'class', 'Computer Science Laboratory'], [900, 1080, 'class', 'Programming Workshop']],
  '203': [[480, 1290, 'blocked', 'Dean’s reservation · CPE 312 Exam Prep']],
  '204': [[810, 930, 'class', 'Data Science Workshop']],
  '301': [[900, 1020, 'class', 'Robotics Laboratory']],
  '302': [[480, 960, 'class', 'Cyber Forensics Laboratory']],
  '303': [],
  '304': [[480, 1290, 'blocked', 'Routine maintenance']],
}

export function createMockSchedules(now = new Date()) {
  return {
    // Explicit demo shift windows; these are not official university policy.
    windows: [{ shift: 'morning', start: 480, end: 810 }, { shift: 'evening', start: 810, end: 1290 }],
    entries: bookingDates(now).flatMap(date => Object.entries(timetable).flatMap(([roomId, entries]) =>
      entries.map(([start, end, type, title, host]) => ({ date, roomId, start, end, type, title, host })))),
  }
}

export function createMockRequestHandler({ rooms, getSchedules, clock = () => new Date(), outcome = 'success' }) {
  let sequence = 0
  const pending = []
  return async request => {
    const problem = validateRequest(request, { rooms, schedules: getSchedules(), now: clock() })
    if (problem) throw Object.assign(new Error(problem.message), { code: 'CONFLICT' })
    if (outcome === 'failure') throw new Error('The demo request could not be sent. Your details are saved here; try again.')
    if (outcome === 'conflict') throw Object.assign(new Error('The schedule changed before your demo request was sent. Review the available window and try again.'), { code: 'CONFLICT' })
    if (pending.some(item => item.roomId === request.roomId && item.date === request.date && item.start < request.end && request.start < item.end)) {
      throw Object.assign(new Error('You already have a pending demo request for this time. Choose another date or venue.'), { code: 'CONFLICT' })
    }
    const result = { id: `DEMO-${request.date.replaceAll('-', '')}-${String(++sequence).padStart(4, '0')}`, status: 'pending' }
    pending.push({ ...request, ...result })
    return result
  }
}
