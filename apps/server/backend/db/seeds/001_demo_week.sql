

BEGIN;

INSERT INTO booking_venues (
  room_code,
  name,
  floor,
  location_label,
  capacity,
  equipment,
  status_override,
  is_details_available,
  is_demo,
  dataset_label
)
VALUES
  ('Room 101', 'General Lecture Hall', 1, 'Level 1, Main Lobby', 80, ARRAY['projector', 'sound system', 'whiteboard'], NULL, TRUE, TRUE, 'Demo week'),
  ('Room 102', 'Multimedia Classroom', 1, 'Level 1, Main Lobby', 45, ARRAY['projector', 'smart board', 'speakers'], NULL, TRUE, TRUE, 'Demo week'),
  ('Room 103', 'Programming Laboratory', 1, 'Level 1, Main Lobby', 40, ARRAY['desktop computers', 'projector', 'whiteboard'], NULL, TRUE, TRUE, 'Demo week'),
  ('Room 104', 'Faculty Training Room', 1, 'Level 1, Main Lobby', 30, ARRAY['laptops', 'projector', 'video conference'], NULL, TRUE, TRUE, 'Demo week'),
  ('Room 201', 'Computer Laboratory 1', 2, 'Level 2, Main Building', 40, ARRAY['desktop computers', 'projector', 'printer'], NULL, TRUE, TRUE, 'Demo week'),
  ('Room 202', 'Computer Laboratory 2', 2, 'Level 2, Main Building', 40, ARRAY['desktop computers', 'projector', 'printer'], NULL, TRUE, TRUE, 'Demo week'),
  ('Room 203', 'Network Systems Lab', 2, 'Level 2, Main Building', 32, ARRAY['network racks', 'routers', 'switches'], 'Locked by Dean', TRUE, TRUE, 'Demo week'),
  ('Room 204', 'Hardware Laboratory', 2, 'Level 2, Main Building', 32, ARRAY['workbenches', 'tool kits', 'projector'], NULL, TRUE, TRUE, 'Demo week'),
  ('Room 301', 'Research Laboratory', 3, 'Level 3, Main Building', 24, ARRAY['research workstations', 'projector', 'printer'], NULL, TRUE, TRUE, 'Demo week'),
  ('Room 302', 'Data Science Lab', 3, 'Level 3, Main Building', 36, ARRAY['GPU workstations', 'projector', 'smart board'], NULL, TRUE, TRUE, 'Demo week'),
  ('Room 303', 'Cybersecurity Lab', 3, 'Level 3, Main Building', 36, ARRAY['isolated network', 'desktop computers', 'projector'], NULL, TRUE, TRUE, 'Demo week'),
  ('Room 304', 'Capstone Studio', 3, 'Level 3, Main Building', 50, ARRAY['collaboration boards', 'projector', 'video conference'], NULL, TRUE, TRUE, 'Demo week'),
  ('Room 401', 'Advanced Systems Lab', 4, 'Level 4, Main Building', 30, ARRAY['details unavailable'], NULL, FALSE, TRUE, 'Demo week'),
  ('Room 402', 'Innovation Laboratory', 4, 'Level 4, Main Building', 30, ARRAY['details unavailable'], NULL, FALSE, TRUE, 'Demo week'),
  ('Room 403', 'Graduate Computing Lab', 4, 'Level 4, Main Building', 24, ARRAY['details unavailable'], NULL, FALSE, TRUE, 'Demo week'),
  ('Room 404', 'Simulation Laboratory', 4, 'Level 4, Main Building', 28, ARRAY['details unavailable'], NULL, FALSE, TRUE, 'Demo week');

WITH demo_week AS (
  SELECT (date_trunc('week', CURRENT_DATE)::date + day_offset) AS date
  FROM generate_series(0, 6) AS day_offset
)
INSERT INTO booking_date_options (date, is_demo, dataset_label)
SELECT date, TRUE, 'Demo week'
FROM demo_week;

WITH schedule(room_code, start_time, end_time, state, locked_by) AS (
  VALUES
    ('Room 101', TIME '08:00', TIME '10:00', 'occupied', NULL),
    ('Room 102', TIME '07:00', TIME '12:00', 'occupied', NULL),
    ('Room 102', TIME '13:00', TIME '18:00', 'occupied', NULL),
    ('Room 104', TIME '15:00', TIME '16:00', 'locked', 'Demo scheduler'),
    ('Room 201', TIME '09:00', TIME '11:00', 'occupied', NULL),
    ('Room 202', TIME '13:00', TIME '15:00', 'occupied', NULL),
    ('Room 301', TIME '07:30', TIME '09:00', 'occupied', NULL),
    ('Room 302', TIME '14:00', TIME '17:00', 'occupied', NULL),
    ('Room 303', TIME '10:00', TIME '12:00', 'occupied', NULL),
    ('Room 304', TIME '13:00', TIME '14:30', 'occupied', NULL)
),
demo_week AS (
  SELECT (date_trunc('week', CURRENT_DATE)::date + day_offset) AS date
  FROM generate_series(0, 6) AS day_offset
)
INSERT INTO booking_time_slots (
  venue_id,
  date,
  start_time,
  end_time,
  state,
  locked_by,
  is_demo,
  dataset_label
)
SELECT
  venue.id,
  demo_week.date,
  schedule.start_time,
  schedule.end_time,
  schedule.state,
  schedule.locked_by,
  TRUE,
  'Demo week'
FROM schedule
JOIN booking_venues AS venue ON venue.room_code = schedule.room_code
CROSS JOIN demo_week;

COMMIT;
