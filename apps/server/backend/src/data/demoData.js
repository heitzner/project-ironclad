const venueRows = [
  ['Room 101', 'General Lecture Hall', 1, 'Level 1, Main Lobby', 50, ['projector', 'sound system', 'whiteboard']],
  ['Room 102', 'Physics & Electronics Lab', 1, 'Level 1, Science Wing', 40, ['oscilloscopes', 'electronics kits', 'projector']],
  ['Room 103', 'Multimedia Studio', 1, 'Level 1, Media Annex', 35, ['editing workstations', 'cameras', 'audio equipment']],
  ['Room 104', 'Seminar & Conference Room', 1, 'Level 1, North Corridor', 60, ['projector', 'video conference', 'sound system']],
  ['Room 201', 'Computer Science Lab 1', 2, 'Level 2, West Wing', 45, ['desktop computers', 'projector', 'whiteboard']],
  ['Room 202', 'Computer Science Lab 2', 2, 'Level 2, West Wing', 40, ['desktop computers', 'projector', 'printer']],
  ['Room 203', 'Network Systems Lab', 2, 'Level 2, Central Hall', 36, ['network racks', 'routers', 'switches']],
  ['Room 204', 'AI & Data Science Suite', 2, 'Level 2, East Corridor', 28, ['GPU workstations', 'projector', 'smart board']],
  ['Room 301', 'Advanced Robotics & AI Lab', 3, 'Level 3, East Wing', 30, ['robotics kits', 'workstations', 'projector']],
  ['Room 302', 'Cyber Forensics Studio', 3, 'Level 3, Cyber Annex', 35, ['isolated network', 'forensics workstations', 'projector']],
  ['Room 303', 'Software Engineering Hall', 3, 'Level 3, North Corridor', 45, ['collaboration boards', 'projector', 'video conference']],
  ['Room 304', 'Cloud Systems Research Lab', 3, 'Level 3, West Wing', 25, ['cloud workstations', 'projector', 'whiteboard']],
  ['Room 401', 'Advanced Systems Lab', 4, 'Level 4, West Wing', 30, ['details unavailable']],
  ['Room 402', 'Innovation Laboratory', 4, 'Level 4, Central Hall', 30, ['details unavailable']],
  ['Room 403', 'Graduate Computing Lab', 4, 'Level 4, East Wing', 24, ['details unavailable']],
  ['Room 404', 'Simulation Laboratory', 4, 'Level 4, North Wing', 28, ['details unavailable']],
]

const schedules = {
  'Room 101': [
    ['07:00', '10:20', 'GEC 008 Ethics with Peace Studies - BSCS 3A', 'class', 'Prof. M. Santos'],
    ['13:00', '16:20', 'GEC 007 Science, Technology & Society - BSCS 3A', 'class', null],
  ],
  'Room 102': [
    ['07:00', '09:00', 'Physics and Electronics Laboratory', 'class', 'Engr. L. Cruz'],
    ['13:00', '15:05', 'CC 125 Software Engineering 1 - BSCS 3A', 'class', null],
  ],
  'Room 103': [
    ['07:00', '09:00', 'Multimedia Production Workshop', 'class', null],
    ['13:00', '15:05', 'Digital Media Laboratory', 'class', null],
  ],
  'Room 104': [
    ['07:00', '09:00', 'Student Council Conference', 'reserved', null],
    ['13:00', '15:05', 'Faculty Development Seminar', 'class', null],
  ],
  'Room 201': [
    ['07:00', '12:00', 'CC 116 Advanced Web Systems - BSCS 3A', 'class', 'Prof. M. Raby'],
    ['13:00', '16:50', 'CSP 111 Algorithm & Complexity - BSCS 3B', 'class', null],
  ],
  'Room 202': [['07:00', '10:20', 'Application Development Laboratory', 'class', 'Prof. J. Tan']],
  'Room 203': [['07:00', '18:00', 'Locked by Dean', 'locked', null]],
  'Room 204': [['13:00', '16:00', 'Data Science Workshop', 'class', null]],
  'Room 301': [['13:00', '16:00', 'Robotics Laboratory', 'class', null]],
  'Room 302': [['07:00', '11:00', 'Cyber Forensics Laboratory', 'class', null], ['13:00', '17:00', 'Network Security Practicum', 'class', null]],
  'Room 303': [],
  'Room 304': [['13:00', '15:30', 'Cloud Infrastructure Research', 'class', null]],
}

const addDays = (date, amount) => {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + amount)
  return value.toISOString().slice(0, 10)
}

export function createDemoData(weekStart) {
  const dates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  const venues = venueRows.map(([room_code, name, floor, location_label, capacity, equipment]) => ({
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
  }))

  const entries = dates.flatMap((date) => Object.entries(schedules).flatMap(([venue_id, rows]) => rows.map(
    ([start_time, end_time, title, entry_type, instructor_name]) => ({
      venue_id,
      date,
      start_time,
      end_time,
      title,
      entry_type,
      instructor_name,
      state: entry_type === 'locked' ? 'locked' : entry_type === 'reserved' ? 'reserved' : 'occupied',
      locked_by: entry_type === 'locked' ? 'Dean' : null,
      is_demo: true,
      dataset_label: 'Demo week',
    }),
  )))

  return {
    venues,
    entries,
    dates,
    students: [{
      student_id: '2022-10892',
      full_name: 'Ashley Gabrielle C. Alcantara',
      program_section: 'BSCS 3A',
      is_demo: true,
      dataset_label: 'Demo week',
    }],
    notices: [{
      notice_id: 'NOTICE-001',
      title: 'CSD Fair Badminton Tryout',
      body: 'The Social Hall is currently occupied for tryouts until 3:00 PM. Please route alternative indoor activities to available vacant rooms.',
      image_key: 'badminton_tryout',
      guidelines_available: false,
      is_demo: true,
      dataset_label: 'Demo week',
    }],
  }
}
