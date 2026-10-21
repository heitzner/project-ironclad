import { randomUUID } from 'node:crypto'
import { hashPassword } from '../security/password.js'

const DAY = 86_400_000
const programs = ['BSCS', 'BSIT', 'BSIS', 'BSEMC']

const accountRows = [
  ['test-admin', '20240001-A', 'Admin@123', 'Test Administrator', 'admin', 'President', 'BSCS', '4', 'A', 'admin.president@campus.example.test'],
  ['test-admin-vp', '20240003-A', 'AdminVP@123', 'Alex Reyes', 'admin', 'Vice President', 'BSCS', '4', 'B', 'admin.vp@campus.example.test'],
  ['test-admin-secretary', '20240004-A', 'AdminSec@123', 'Jamie Santos', 'admin', 'Secretary', 'BSIT', '3', 'A', 'admin.secretary@campus.example.test'],
  ['test-admin-treasurer', '20240005-A', 'AdminTreas@123', 'Morgan Cruz', 'admin', 'Treasurer', 'BSIS', '3', 'B', 'admin.treasurer@campus.example.test'],
  ['test-admin-auditor', '20240006-A', 'AdminAudit@123', 'Taylor Garcia', 'admin', 'Auditor', 'BSEMC', '3', 'C', 'admin.auditor@campus.example.test'],
  ['test-council', '20240002-C', 'Council@123', 'Test Council Member', 'council', 'President', 'BSCS', '3', 'B', 'council.president@campus.example.test'],
  ['test-council-vp', '20240003-C', 'CouncilVP@123', 'Casey Mendoza', 'council', 'Vice President', 'BSCS', '3', 'A', 'council.vp@campus.example.test'],
  ['test-council-secretary', '20240004-C', 'CouncilSec@123', 'Riley Ramos', 'council', 'Secretary', 'BSCS', '2', 'B', 'council.secretary@campus.example.test'],
  ['test-council-treasurer', '20240005-C', 'CouncilTreas@123', 'Jordan Flores', 'council', 'Treasurer', 'BSCS', '2', 'C', 'council.treasurer@campus.example.test'],
  ['test-council-auditor', '20240006-C', 'CouncilAudit@123', 'Sam Rivera', 'council', 'Auditor', 'BSCS', '2', 'D', 'council.auditor@campus.example.test'],
  ['test-student', '20241200-C', 'Student@123', 'Test Student', 'student', '', 'BSCS', '1', 'C', 'student.one@campus.example.test'],
  ['test-student-2', '20241201-C', 'Student2@123', 'Drew Aquino', 'student', '', 'BSIT', '2', 'A', 'student.two@campus.example.test'],
  ['test-student-3', '20241202-C', 'Student3@123', 'Robin Castillo', 'student', '', 'BSEMC', '1', 'B', 'student.three@campus.example.test'],
]

const roomRows = [
  ['101', 1, 'General Lecture Hall', 50, 'Main Lobby'], ['102', 1, 'Physics & Electronics Lab', 40, 'Science Wing'],
  ['103', 1, 'Multimedia Studio', 35, 'Media Annex'], ['104', 1, 'Seminar & Conference Room', 60, 'North Corridor'],
  ['201', 2, 'Computer Science Lab 1', 45, 'West Wing'], ['202', 2, 'Computer Science Lab 2', 40, 'West Wing'],
  ['203', 2, 'Network Systems Lab', 36, 'Central Hall'], ['204', 2, 'AI & Data Science Suite', 28, 'East Corridor'],
  ['301', 3, 'Advanced Robotics & AI Lab', 30, 'East Wing'], ['302', 3, 'Cyber Forensics Studio', 35, 'Cyber Annex'],
  ['303', 3, 'Software Engineering Hall', 45, 'North Corridor'], ['304', 3, 'Cloud Systems Research Lab', 25, 'West Wing'],
  ['401', 4, 'Innovation & Collaboration Lab', 40, 'Innovation Wing'], ['402', 4, 'AI Research Laboratory', 30, 'Innovation Wing'],
  ['403', 4, 'Digital Arts Studio', 35, 'Innovation Wing'], ['404', 4, 'Project Presentation Room', 50, 'Innovation Wing'],
]

const timetable = {
  101: [[480, 690, 'class', 'GEC 008 Ethics with Peace Studies · BSCS 3A', 'Prof. M. Santos'], [810, 990, 'class', 'GEC 007 Science, Technology & Society · BSCS 3A'], [1020, 1170, 'reserved', 'Open Study / CS Guild']],
  102: [[810, 990, 'class', 'CC 125 Software Engineering 1 · BSCS 3A'], [1020, 1170, 'reserved', 'Open Study / Electronics Guild']],
  103: [[480, 810, 'class', 'CSE 101 System Fundamentals · BSCS 3A']], 104: [[480, 810, 'reserved', 'Student Council Conference']],
  201: [[480, 900, 'class', 'CC 116 Advanced Web Systems · BSCS 3A', 'Prof. M. Raby'], [990, 1140, 'class', 'CSP 111 Algorithm & Complexity · BSCS 3B'], [1140, 1290, 'reserved', 'Open Lab / CS Guild']],
  202: [[480, 570, 'class', 'Computer Science Laboratory'], [900, 1080, 'class', 'Programming Workshop']],
  203: [[480, 1290, 'blocked', 'Dean’s reservation · CPE 312 Exam Prep']], 204: [[810, 930, 'class', 'Data Science Workshop']],
  301: [[900, 1020, 'class', 'Robotics Laboratory']], 302: [[480, 960, 'class', 'Cyber Forensics Laboratory']], 303: [],
  304: [[480, 1290, 'blocked', 'Routine maintenance']], 401: [], 402: [], 403: [], 404: [],
}

const manilaDate = date => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
const addDays = (date, amount) => manilaDate(new Date(`${date}T12:00:00+08:00`).getTime() + amount * DAY)

export function createSeedState(now = new Date()) {
  const today = manilaDate(now)
  const dates = Array.from({ length: 7 }, (_, index) => addDays(today, index))
  const accounts = accountRows.map(([id, studentId, password, name, role, position, course, yearLevel, section, email]) => ({
    id, studentId, passwordHash: hashPassword(password), name, role, position, course, yearLevel, section, email,
    emailVerified: true, status: 'active', disabled: false, createdAt: now.toISOString(),
  }))
  const members = Object.fromEntries(accounts.map(account => [account.id, {
    role: account.role, position: account.position, scope: account.role === 'admin' ? 'ACES' : account.role === 'council' ? account.course : '', course: account.course,
  }]))
  const rooms = roomRows.map(([id, floor, name, capacity, location]) => ({
    id, floor, name, capacity, location: `Level ${floor}, ${location}`, equipment: [], icon: randomUUID(), selectedIcon: randomUUID(),
    blocked: id === '203' ? { label: 'Locked by Dean', reason: 'This venue is locked by the Dean. Choose another room.' }
      : id === '304' ? { label: 'Maintenance', reason: 'This venue is under maintenance. Choose another room.' } : null,
  }))
  const scheduleEntries = dates.flatMap(date => Object.entries(timetable).flatMap(([roomId, rows]) => rows.map(([start, end, type, title, host]) => ({ roomId, date, start, end, type, title, host }))))
  const future = days => addDays(today, days)
  const post = (id, kind, title, description, days, extra = {}) => ({ id, kind, title, description, startsAt: `${future(days)}T09:00:00+08:00`, endsAt: `${future(days)}T17:00:00+08:00`, venue: 'CSD Activity Center', organizer: 'Computer Studies Department', capacity: 40, status: 'published', createdAt: now.toISOString(), ...extra })
  const posts = [
    post('badminton', 'event', 'Badminton Tryouts', 'Showcase your agility and court skills! Join the official badminton team tryouts. Open to all CSD students aiming to represent the department.', 7, { imageKey: 'badminton', venue: 'Social Hall', registrationKind: 'individual', categories: ['Singles', 'Doubles'], organizer: 'CSD Sports Committee' }),
    post('valorant', 'event', 'Valorant Esports Tournament', 'Assemble your squad and compete in the CSD Fair Valorant Tournament. Celebrate teamwork, strategy, and campus spirit.', 10, { imageKey: 'esports', venue: 'CSD Computer Laboratory', capacity: 16, registrationKind: 'team', teamSize: 5, organizer: 'CSD Fair Committee' }),
    ...programs.map(program => post(`council-${program}`, 'council', `${program} Council Recruitment`, `Help shape campus life. Apply to the ${program} student council and share your ideas for the Computer Studies Department.`, 14, { program, questions: ['Why do you want to join the council?', 'What skills or experience would you bring?'], organizer: `${program} Student Council` })),
    post('csd-fair', 'announcement', 'CSD Fair 2026', 'A week of creativity, friendly competition, and community. Explore department exhibits, student projects, and activities at the CSD Fair.', 12),
    post('itechtivity', 'announcement', 'ITechtivity: Build, Learn, Connect', 'Meet fellow CSD students for technology talks and hands-on activities. Watch this space for the full campus schedule.', 15),
    post('livestream', 'announcement', 'Volleyball Tournament Livestream', 'Cheer for the department! The official CSD page will carry the volleyball tournament livestream. Match details will be posted here.', 9),
  ]
  const archiveRows = [
    ['archive-hackathon', 'Technovate Hackathon', '302', 'CS 3A', 'Campus Wide'], ['archive-debate', 'Inter-College CS Debate Finals', '201', 'CS 3B', 'Symposium'],
    ['archive-cyber', 'Cybersecurity Workshop & CTF', '104', 'BSIT 4A', 'Workshop'], ['archive-robotics', 'Robotics & Embedded Systems Expo', '402', 'CS 2A', 'Exhibition'],
    ['archive-gamedev', 'GameDev Student Showcase', '403', 'BSEMC 3A', 'Showcase'], ['archive-alumni', 'Alumni Technology Summit', '101', 'CSD', 'Institutional'],
    ['archive-coding', 'Department Coding Challenge', '202', 'CS 1A', 'Competition'],
  ]
  const archive = archiveRows.map(([id, title, roomId, courseSection, category], index) => ({
    id, title, courseSection, category, organizer: 'Computer Studies Department', concludedDate: addDays(today, -(index + 1) * 7), academicYear: '2026–2027', semester: 'Term 1', venue: { id: roomId, label: `Room ${roomId}`, type: 'room' }, permitNo: `IC-2026-${101 + index}`, startTime: '09:00 AM', endTime: '05:00 PM', hasAsset: true, categoryTone: index % 2 ? 'gray' : 'green',
  }))
  return {
    version: 1, revision: 0, datasetLabel: 'Demo week', accounts, members, rooms,
    scheduleWindows: [{ shift: 'morning', start: 480, end: 810 }, { shift: 'evening', start: 810, end: 1290 }],
    scheduleEntries, dateOptions: dates, posts, bookings: [], applications: [], registrations: [], profiles: {},
    handovers: [], organizationLog: [], closures: [], archive, identityCorrections: [],
  }
}

export const seedAccountCount = accountRows.length
export { programs }
