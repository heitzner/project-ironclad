import { addDays } from '../domain/dateTime.js';

const venueDefinitions = [
  ['Room 101', 'General Lecture Hall', 1, 'Level 1, Main Lobby', 50, ['projector', 'sound system', 'whiteboard']],
  ['Room 102', 'Physics & Electronics Lab', 1, 'Level 1, Science Wing', 40, ['oscilloscopes', 'electronics kits', 'projector']],
  ['Room 103', 'Multimedia Studio', 1, 'Level 1, Media Annex', 35, ['editing workstations', 'cameras', 'audio equipment']],
  ['Room 104', 'Seminar & Conference Room', 1, 'Level 1, North Corridor', 60, ['projector', 'video conference', 'sound system']],
  ['Room 201', 'Computer Science Lab 1', 2, 'Level 2, West Wing', 45, ['desktop computers', 'projector', 'whiteboard']],
  ['Room 202', 'Computer Science Lab 2', 2, 'Level 2, West Wing', 40, ['desktop computers', 'projector', 'printer']],
  ['Room 203', 'Network Systems Lab', 2, 'Level 2, Central Hall', 36, ['network racks', 'routers', 'switches']],
  ['Room 204', 'Hardware Laboratory', 2, 'Level 2, East Wing', 32, ['workbenches', 'tool kits', 'projector']],
  ['Room 301', 'Research Laboratory', 3, 'Level 3, West Wing', 24, ['research workstations', 'projector', 'printer']],
  ['Room 302', 'Data Science Lab', 3, 'Level 3, Central Hall', 36, ['GPU workstations', 'projector', 'smart board']],
  ['Room 303', 'Cybersecurity Lab', 3, 'Level 3, East Wing', 36, ['isolated network', 'desktop computers', 'projector']],
  ['Room 304', 'Capstone Studio', 3, 'Level 3, North Wing', 50, ['collaboration boards', 'projector', 'video conference']],
  ['Room 401', 'Advanced Systems Lab', 4, 'Level 4, West Wing', 30, ['details unavailable']],
  ['Room 402', 'Innovation Laboratory', 4, 'Level 4, Central Hall', 30, ['details unavailable']],
  ['Room 403', 'Graduate Computing Lab', 4, 'Level 4, East Wing', 24, ['details unavailable']],
  ['Room 404', 'Simulation Laboratory', 4, 'Level 4, North Wing', 28, ['details unavailable']],
];

const schedulesByRoom = {
  'Room 101': [
    ['07:00', '11:00', 'CS General Lecture - BSCS 2A', 'class', null, 'occupied'],
    ['13:00', '15:40', 'Department Lecture Series', 'class', 'Prof. A. Santos', 'occupied'],
  ],
  'Room 102': [
    ['07:00', '11:05', 'Electronics Laboratory - BSIT 2A', 'lab_activity', 'Engr. L. Cruz', 'occupied'],
  ],
  'Room 103': [
    ['13:00', '17:05', 'Digital Media Production', 'lab_activity', 'Prof. C. Reyes', 'occupied'],
  ],
  'Room 104': [
    ['07:00', '11:05', 'Faculty Development Seminar', 'class', 'Dr. P. Lim', 'occupied'],
  ],
  'Room 201': [
    ['07:00', '15:00', 'CC 116 Advanced Web Systems - BSCS 3A', 'lab_activity', 'Prof. M. Raby', 'occupied'],
    ['15:00', '16:30', 'Vacant / Reserved Prep', 'vacant', null, 'free_window'],
    ['16:30', '19:00', 'CSP 111 Algorithm & Complexity - BSCS 3B', 'class', null, 'occupied'],
    ['19:00', '21:30', 'Open Lab / CS Guild', 'open_lab', null, 'reserved'],
  ],
  'Room 202': [
    ['07:00', '10:20', 'Application Development Laboratory', 'lab_activity', 'Prof. J. Tan', 'occupied'],
  ],
  'Room 203': [
    ['07:00', '21:30', 'Locked by Dean', 'reserved', null, 'locked'],
  ],
  'Room 204': [
    ['13:00', '15:00', 'Computer Hardware Servicing', 'lab_activity', 'Prof. E. Diaz', 'occupied'],
  ],
  'Room 301': [
    ['07:30', '09:00', 'Undergraduate Research Consultation', 'class', 'Dr. N. Yu', 'occupied'],
  ],
  'Room 302': [
    ['14:00', '17:00', 'Machine Learning Workshop', 'lab_activity', 'Prof. R. Go', 'occupied'],
  ],
  'Room 303': [
    ['10:00', '12:00', 'Security Operations Exercise', 'lab_activity', 'Prof. S. Ong', 'occupied'],
  ],
  'Room 304': [
    ['13:00', '14:30', 'Capstone Project Consultation', 'class', 'Prof. V. Lee', 'occupied'],
  ],
};

export function createDemoData(demoWeekStart) {
  const venues = venueDefinitions.map(([
    room_code,
    name,
    floor,
    location_label,
    capacity,
    equipment,
  ]) => ({
    room_code,
    name,
    floor,
    location_label,
    capacity,
    equipment,
    status_override: room_code === 'Room 203' ? 'Locked by Dean' : null,
    is_details_available: floor !== 4,
    is_demo: true,
    dataset_label: 'Demo week',
  }));

  const scheduleEntries = [];
  for (let day = 0; day < 7; day += 1) {
    const date = addDays(demoWeekStart, day);
    for (const [venue_id, schedule] of Object.entries(schedulesByRoom)) {
      for (const [start_time, end_time, title, entry_type, instructor_name, state] of schedule) {
        scheduleEntries.push({
          venue_id,
          date,
          start_time,
          end_time,
          title,
          entry_type,
          instructor_name,
          state,
          locked_by: null,
          is_demo: true,
          dataset_label: 'Demo week',
        });
      }
    }
  }

  const students = [
    {
      full_name: 'Ashley Gabrielle C. Alcantara',
      student_id: '2022-10892',
      program_section: 'BSCS 3A',
      is_demo: true,
      dataset_label: 'Demo week',
    },
    {
      full_name: 'Miguel Antonio D. Santos',
      student_id: '2021-10417',
      program_section: 'BSIT 4B',
      is_demo: true,
      dataset_label: 'Demo week',
    },
    {
      full_name: 'Bianca Marie R. Cruz',
      student_id: '2023-11208',
      program_section: 'BSCS 2B',
      is_demo: true,
      dataset_label: 'Demo week',
    },
  ];

  const reservationDefinitions = [
    ['RES-DEMO-0001', 'Room 201', '2022-10892', 1, '15:00', '16:30', 'Ethics with Peace Studies Filming', 'pending_approval', 'pending', null, null, null],
    ['RES-DEMO-0002', 'Room 102', '2021-10417', 2, '13:00', '14:00', 'Electronics Society Planning', 'approved', 'approved', 'Test Administrator', `${addDays(demoWeekStart, 1)}T17:00:00.000Z`, 'Schedule verified'],
    ['RES-DEMO-0003', 'Room 103', '2023-11208', 3, '10:00', '11:00', 'Multimedia Club Orientation', 'rejected', 'rejected', 'Test Administrator', `${addDays(demoWeekStart, 2)}T17:00:00.000Z`, 'Requested equipment unavailable'],
    ['RES-DEMO-0004', 'Room 104', '2021-10417', 4, '13:00', '14:30', 'Student Leadership Seminar', 'pending_approval', 'pending', null, null, null],
    ['RES-DEMO-0005', 'Room 202', '2023-11208', 5, '13:00', '14:00', 'Programming Contest Practice', 'approved', 'approved', 'Test Administrator', `${addDays(demoWeekStart, 4)}T17:00:00.000Z`, null],
    ['RES-DEMO-0006', 'Room 204', '2022-10892', 6, '09:00', '10:00', 'Hardware Workshop Preparation', 'rejected', 'rejected', 'Test Administrator', `${addDays(demoWeekStart, 5)}T17:00:00.000Z`, 'Room setup conflict'],
  ];
  const reservations = reservationDefinitions.map(([
    reservation_id,
    venue_id,
    requested_by,
    day,
    start_time,
    end_time,
    purpose,
    status,
    decision,
    decided_by,
    decided_at,
    decision_reason,
  ], index) => ({
    reservation_id,
    venue_id,
    requested_by,
    date: addDays(demoWeekStart, day),
    start_time,
    end_time,
    purpose,
    status,
    decision,
    approver_role: 'MIS Administrator',
    created_at: `${addDays(demoWeekStart, Math.max(0, day - 1))}T${String(8 + index).padStart(2, '0')}:00:00.000Z`,
    decided_by,
    decided_at,
    decision_reason,
    is_demo: true,
    dataset_label: 'Demo week',
  }));

  const decisionLogs = reservations
    .filter((reservation) => reservation.decision !== 'pending')
    .map((reservation) => ({
      reservation_id: reservation.reservation_id,
      action: reservation.decision,
      performed_by: reservation.decided_by,
      performed_at: reservation.decided_at,
      reason: reservation.decision_reason,
      is_demo: true,
      dataset_label: 'Demo week',
    }));

  const councilRoles = [
    ['ROLE-001', 'Council President'],
    ['ROLE-002', 'Council Secretary'],
    ['ROLE-003', 'Events Coordinator'],
  ].map(([role_id, name]) => ({
    role_id,
    name,
    scope: 'council',
    is_demo: true,
    dataset_label: 'Demo week',
  }));

  const members = students.map((student, index) => ({
    member_id: student.student_id,
    student_id: student.student_id,
    full_name: student.full_name,
    program_section: student.program_section,
    status: 'active',
    role: index === 1 ? 'student' : 'council',
    council_role_id: index === 0 ? 'ROLE-001' : index === 2 ? 'ROLE-003' : null,
    disabled: false,
    version: 1,
    is_demo: true,
    dataset_label: 'Demo week',
  }));

  const events = [
    {
      event_id: 'EVENT-DEMO-0001',
      title: 'CSD Fair Badminton Tryout',
      description: 'Open tryouts for students joining the CSD Fair badminton team.',
      category: 'Sports',
      venue_id: 'Room 104',
      starts_at: `${addDays(demoWeekStart, 3)}T13:00:00+08:00`,
      ends_at: `${addDays(demoWeekStart, 3)}T15:00:00+08:00`,
      status: 'scheduled',
      registered: 28,
      capacity: 60,
      banner_url: null,
      version: 1,
      created_by: 'Test Administrator',
      is_demo: true,
      dataset_label: 'Demo week',
    },
    {
      event_id: 'EVENT-DEMO-0002',
      title: 'Student Technology Forum',
      description: 'A campus forum on emerging computing technologies and student projects.',
      category: 'Academic',
      venue_id: 'Room 101',
      starts_at: `${addDays(demoWeekStart, 5)}T16:00:00+08:00`,
      ends_at: `${addDays(demoWeekStart, 5)}T18:00:00+08:00`,
      status: 'scheduled',
      registered: 34,
      capacity: 50,
      banner_url: null,
      version: 1,
      created_by: 'Test Administrator',
      is_demo: true,
      dataset_label: 'Demo week',
    },
  ];

  return {
    venues,
    scheduleEntries,
    reservations,
    students,
    members,
    councilRoles,
    events,
    adminSession: {
      full_name: 'Test Administrator',
      role: 'ADMIN',
      session_label: 'Test session',
      session_id: 'admin-demo',
      is_demo: true,
      dataset_label: 'Demo week',
    },
    decisionLogs,
    calendar: {
      term_label: 'Term 2',
      week_label: 'W6',
      is_demo: true,
      dataset_label: 'Demo week',
    },
    dateOptions: Array.from({ length: 7 }, (_, day) => addDays(demoWeekStart, day)),
  };
}
