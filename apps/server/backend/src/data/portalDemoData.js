import { createDemoData } from './demoData.js';
import { addDays } from '../domain/dateTime.js';

export const portalPrograms = Object.freeze(['BSCS', 'BSIT', 'BSIS', 'BSEMC']);
export const portalPositions = Object.freeze([
  'President',
  'Vice President',
  'Secretary',
  'Treasurer',
  'Auditor',
  'Committee Member',
  'Member',
]);

const demoAccounts = [
  ['test-admin', '20240001-A', 'Admin@123', 'Test Administrator', 'admin', 'President', 'BSCS', '4', 'A', 'admin.president@campus.example.test'],
  ['test-admin-vp', '20240003-A', 'AdminVP@123', 'Alex Reyes', 'admin', 'Vice President', 'BSCS', '4', 'B', 'admin.vp@campus.example.test'],
  ['test-admin-secretary', '20240004-A', 'AdminSec@123', 'Jamie Santos', 'admin', 'Secretary', 'BSIT', '3', 'A', 'admin.secretary@campus.example.test'],
  ['test-council', '20240002-C', 'Council@123', 'Test Council Member', 'council', 'President', 'BSCS', '3', 'B', 'council.president@campus.example.test'],
  ['test-council-vp', '20240003-C', 'CouncilVP@123', 'Casey Mendoza', 'council', 'Vice President', 'BSCS', '3', 'A', 'council.vp@campus.example.test'],
  ['test-council-secretary', '20240004-C', 'CouncilSec@123', 'Riley Ramos', 'council', 'Secretary', 'BSCS', '2', 'B', 'council.secretary@campus.example.test'],
  ['test-student', '20241200-C', 'Student@123', 'Test Student', 'student', '', 'BSCS', '1', 'C', 'student.one@campus.example.test'],
  ['test-student-2', '20241201-C', 'Student2@123', 'Drew Aquino', 'student', '', 'BSIT', '2', 'A', 'student.two@campus.example.test'],
  ['test-student-3', '20241202-C', 'Student3@123', 'Robin Castillo', 'student', '', 'BSEMC', '1', 'B', 'student.three@campus.example.test'],
].map(([
  id, studentId, password, name, role, position, course, yearLevel, section, email,
]) => ({
  id,
  studentId,
  password,
  name,
  role,
  position,
  course,
  yearLevel,
  section,
  email,
  status: 'active',
  testAccount: true,
  is_demo: true,
  dataset_label: 'Demo week',
}));

function portalPost(id, kind, title, description, startsAt, endsAt, extra = {}) {
  return {
    id,
    kind,
    title,
    description,
    startsAt,
    endsAt,
    venue: 'CSD Activity Center',
    organizer: 'Computer Studies Department',
    capacity: 40,
    status: 'published',
    createdAt: startsAt,
    is_demo: true,
    dataset_label: 'Demo week',
    ...extra,
  };
}

export function createPortalDemoData(demoWeekStart) {
  const booking = createDemoData(demoWeekStart);
  const roomIcons = ['d6359', 'a03ca', 'e0f42', 'f3f56', 'c128c', '70e47', 'c22e4', 'd5d3c', '01ee1', '97981', '5163f', 'bbd73', 'c128c', 'c128c', 'c128c', 'c128c'];
  const rooms = booking.venues.map((venue) => ({
    id: venue.room_code.replace(/^Room /, ''),
    name: venue.name,
    capacity: venue.capacity,
    floor: venue.floor,
    location: venue.location_label,
    equipment: [...venue.equipment],
    icon: roomIcons[booking.venues.indexOf(venue)],
    selectedIcon: roomIcons[booking.venues.indexOf(venue)],
    blocked: venue.status_override
      ? { label: 'Unavailable', reason: venue.status_override }
      : venue.is_details_available ? null : { label: 'Unavailable', reason: 'Details unavailable' },
    is_details_available: venue.is_details_available,
    is_demo: true,
    dataset_label: 'Demo week',
  }));

  const posts = [
    portalPost(
      'badminton',
      'event',
      'Badminton Tryouts',
      'Showcase your agility and court skills! Join the official badminton team tryouts. Open to all CSD students aiming to represent the department.',
      `${addDays(demoWeekStart, 4)}T13:00:00+08:00`,
      `${addDays(demoWeekStart, 4)}T15:00:00+08:00`,
      {
        imageKey: 'badminton',
        venue: 'Social Hall',
        registrationKind: 'individual',
        categories: ['Singles', 'Doubles'],
        organizer: 'CSD Sports Committee',
      },
    ),
    portalPost(
      'valorant',
      'event',
      'Valorant Esports Tournament',
      'Assemble your squad and compete in the CSD Fair Valorant Tournament. Celebrate teamwork, strategy, and campus spirit.',
      `${addDays(demoWeekStart, 5)}T09:00:00+08:00`,
      `${addDays(demoWeekStart, 5)}T17:00:00+08:00`,
      {
        imageKey: 'esports',
        venue: 'CSD Computer Laboratory',
        capacity: 16,
        registrationKind: 'team',
        teamSize: 5,
        organizer: 'CSD Fair Committee',
      },
    ),
    ...portalPrograms.map((program, index) => portalPost(
      `council-${program}`,
      'council',
      `${program} Council Recruitment`,
      `Help shape campus life. Apply to the ${program} student council and share your ideas for the Computer Studies Department.`,
      `${addDays(demoWeekStart, 6)}T09:00:00+08:00`,
      `${addDays(demoWeekStart, 6)}T17:00:00+08:00`,
      {
        program,
        capacity: 30,
        questions: [
          'Why do you want to join the council?',
          'What skills or experience would you bring?',
        ],
        organizer: `${program} Student Council`,
        createdAt: `${addDays(demoWeekStart, index)}T08:00:00+08:00`,
      },
    )),
    portalPost(
      'csd-fair',
      'announcement',
      'CSD Fair 2026',
      'A week of creativity, friendly competition, and community. Explore department exhibits, student projects, and activities at the CSD Fair.',
      `${addDays(demoWeekStart, 3)}T09:00:00+08:00`,
      `${addDays(demoWeekStart, 3)}T17:00:00+08:00`,
    ),
  ];

  const studentAccounts = demoAccounts.filter((account) => account.role === 'student');
  const bookings = booking.reservations.map((reservation, index) => {
    const requester = studentAccounts[index % studentAccounts.length];
    return ({
    id: reservation.reservation_id,
    roomId: reservation.venue_id.replace(/^Room /, ''),
    requesterId: requester.id,
    requesterName: requester.name,
    studentId: requester.studentId,
    date: reservation.date,
    start: Number(reservation.start_time.slice(0, 2)) * 60 + Number(reservation.start_time.slice(3)),
    end: Number(reservation.end_time.slice(0, 2)) * 60 + Number(reservation.end_time.slice(3)),
    purpose: reservation.purpose,
    status: reservation.decision === 'rejected' ? 'declined' : reservation.decision,
    reason: reservation.decision_reason || '',
    createdAt: reservation.created_at,
    reviewedBy: reservation.decided_by,
    reviewedAt: reservation.decided_at,
    is_demo: true,
    dataset_label: 'Demo week',
    });
  });

  const scheduleEntries = booking.scheduleEntries.map((entry) => ({
    roomId: entry.venue_id.replace(/^Room /, ''),
    date: entry.date,
    start: Number(entry.start_time.slice(0, 2)) * 60 + Number(entry.start_time.slice(3)),
    end: Number(entry.end_time.slice(0, 2)) * 60 + Number(entry.end_time.slice(3)),
    type: entry.state === 'locked' ? 'blocked' : entry.state === 'reserved' ? 'reserved' : entry.entry_type,
    title: entry.title,
    host: entry.instructor_name,
    state: entry.state,
    is_demo: true,
    dataset_label: 'Demo week',
  }));

  const members = Object.fromEntries(demoAccounts.map((account) => [account.id, {
    role: account.role,
    position: account.position,
    scope: account.role === 'admin' ? 'ACES' : account.role === 'council' ? account.course : '',
    course: account.course,
  }]));

  const archive = [
    ['archive-hackathon', 'Technovate Hackathon', '302', 'CS 3A', 'Campus Wide'],
    ['archive-debate', 'Inter-College CS Debate Finals', '201', 'CS 3B', 'Symposium'],
    ['archive-cyber', 'Cybersecurity Workshop & CTF', '104', 'BSIT 4A', 'Workshop'],
    ['archive-robotics', 'Robotics & Embedded Systems Expo', '402', 'CS 2A', 'Exhibition'],
    ['archive-gamedev', 'GameDev Student Showcase', '403', 'BSEMC 3A', 'Showcase'],
  ].map(([id, title, roomId, courseSection, category], index) => ({
    id,
    title,
    courseSection,
    category,
    organizer: 'Computer Studies Department',
    concludedDate: addDays(demoWeekStart, -(index + 1) * 7),
    academicYear: '2026–2027',
    semester: 'Term 1',
    venue: { id: roomId, label: `Room ${roomId}`, type: 'room' },
    permitNo: `IC-2026-${101 + index}`,
    startTime: '09:00 AM',
    endTime: '05:00 PM',
    hasAsset: true,
    categoryTone: index % 2 ? 'gray' : 'green',
    is_demo: true,
    dataset_label: 'Demo week',
  }));

  return {
    version: 1,
    revision: 0,
    accounts: demoAccounts,
    rooms,
    scheduleWindows: [{ shift: 'morning', start: 420, end: 720 }, { shift: 'evening', start: 780, end: 1080 }],
    scheduleEntries,
    dateOptions: booking.dateOptions,
    posts,
    bookings,
    applications: [],
    registrations: [],
    profiles: {},
    members,
    handovers: [],
    organizationLog: [],
    closures: [],
    archive,
  };
}
