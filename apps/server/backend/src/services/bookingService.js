import { buildTimetable, deriveStatus, findCurrentEntry, freeWindows, isBusy, overlaps, rangeInsideFreeWindow, stateLabel, upcomingEntries, utilizationPercent } from '../domain/booking.js';
import { durationHours, formatTime12Hour, timeToMinutes } from '../domain/dateTime.js';
import { HttpError } from '../http/errors.js';

function searchable(venue) { return [venue.room_code, venue.name, venue.location_label, ...venue.equipment].join(' ').toLowerCase(); }

export function reservationAsEntry(reservation) {
  return {
    venue_id: reservation.venue_id,
    date: reservation.date,
    start_time: reservation.start_time,
    end_time: reservation.end_time,
    title: reservation.purpose,
    entry_type: 'reserved',
    instructor_name: null,
    state: reservation.status === 'approved' ? 'locked' : 'reserved',
    locked_by: reservation.status === 'approved' ? (reservation.decided_by || reservation.approver_role) : null,
    reservation_id: reservation.reservation_id,
  };
}

export function reservationResponse(reservation) {
  return {
    reservation_id: reservation.reservation_id,
    room_code: reservation.venue_id,
    requested_by: reservation.requested_by,
    date: reservation.date,
    start_time: reservation.start_time,
    end_time: reservation.end_time,
    purpose: reservation.purpose,
    status: reservation.status,
    decision: reservation.decision,
    approver_role: reservation.approver_role,
    duration_hours: durationHours(reservation.start_time, reservation.end_time),
    created_at: reservation.created_at,
    decided_by: reservation.decided_by,
    decided_at: reservation.decided_at,
    decision_reason: reservation.decision_reason,
  };
}

export class BookingService {
  constructor(repository, settings) { this.repository = repository; this.settings = settings; }

  effectiveEntries(venueId, date, { excludeReservationId } = {}) {
    const schedule = this.repository.listScheduleEntries(venueId, date);
    const reservations = this.repository.listReservations(venueId, date, { activeOnly: true })
      .filter((item) => item.reservation_id !== excludeReservationId).map(reservationAsEntry);
    return [...schedule, ...reservations].toSorted((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  }

  assertUsableVenue(roomCode) {
    const venue = this.repository.findVenueByRoomCode(roomCode);
    if (!venue) throw new HttpError(404, 'VENUE_NOT_FOUND', 'Venue does not exist');
    if (venue.status_override || !venue.is_details_available) throw new HttpError(422, 'VENUE_UNAVAILABLE', 'Venue is unavailable');
    return venue;
  }

  snapshot(venue, date, period) {
    const entries = this.effectiveEntries(venue.room_code, date);
    const status = deriveStatus(venue, entries, this.settings.periods[period]);
    return {
      room_code: venue.room_code,
      name: venue.name,
      floor: venue.floor,
      location_label: venue.location_label,
      capacity: venue.capacity,
      utilization_percent: utilizationPercent(venue, entries, this.settings.periods[period]),
      status: status.status,
      status_label: status.status_label,
      is_details_available: venue.is_details_available,
    };
  }

  listVenues({ date, period, floor, q }) {
    const all = this.repository.listVenues();
    const searched = q ? all.filter((venue) => searchable(venue).includes(q.toLowerCase())) : all;
    const counts = {
      all_venues: searched.filter((venue) => venue.floor <= 3).length,
      floor_1: searched.filter((venue) => venue.floor === 1).length,
      floor_2: searched.filter((venue) => venue.floor === 2).length,
      floor_3: searched.filter((venue) => venue.floor === 3).length,
      floor_4: searched.filter((venue) => venue.floor === 4).length,
    };
    const filtered = floor ? searched.filter((venue) => venue.floor === floor) : searched.filter((venue) => venue.floor <= 3);
    const data = filtered.map((venue) => this.snapshot(venue, date, period));
    const summary = { available: 0, occupied: 0, unavailable: 0 };
    for (const venue of data) summary[venue.status] += 1;
    return { data, meta: { date, period, total_count: data.length, summary, floor_counts: counts, floor_unavailable_notice: all.some((venue) => venue.floor === 4 && !venue.is_details_available) } };
  }

  getVenue(roomCode, { date, period }) {
    const venue = this.repository.findVenueByRoomCode(roomCode);
    if (!venue) throw new HttpError(404, 'VENUE_NOT_FOUND', 'Venue does not exist');
    const entries = this.effectiveEntries(venue.room_code, date);
    return { data: { ...this.snapshot(venue, date, period), equipment: venue.equipment, status_override: venue.status_override, is_demo: venue.is_demo, dataset_label: venue.dataset_label, timetable: venue.is_details_available ? buildTimetable(entries, this.settings.periods[period]) : [] }, meta: { date, period } };
  }

  occupancyPayload(venue, date, atTime) {
    const entries = this.effectiveEntries(venue.room_code, date);
    const current = findCurrentEntry(entries, atTime);
    const calendar = this.repository.getCalendar();
    const prefix = current ? ({ occupied: 'In Session', free_window: 'Free Window', reserved: 'Reserved', locked: 'Locked' }[current.state]) : null;
    return {
      venue: { room_code: venue.room_code, name: venue.name },
      current_time: atTime,
      term_label: calendar.term_label,
      week_label: calendar.week_label,
      current_session: current ? { title: current.title, instructor_name: current.instructor_name, entry_type: current.entry_type, end_time: current.end_time, status_label: `${prefix} • Until ${formatTime12Hour(current.end_time)}` } : null,
      upcoming_schedule: upcomingEntries(entries, atTime).map((entry) => ({ start_time: entry.start_time, end_time: entry.end_time, title: entry.title, entry_type: entry.entry_type, state_label: stateLabel(entry) })),
    };
  }

  getOccupancy(roomCode, { date, atTime }) {
    const venue = this.assertUsableVenue(roomCode);
    return { data: this.occupancyPayload(venue, date, atTime), meta: { date, time_zone: this.settings.timeZone } };
  }

  vacancyPayload(venue, date, requestedStart) {
    const windows = freeWindows(this.effectiveEntries(venue.room_code, date), this.settings.operationalWindow);
    const requested = requestedStart === undefined ? null : timeToMinutes(requestedStart);
    const candidate = windows.find((window) => requested === null || timeToMinutes(window.end_time) > requested);
    let suggested = null;
    if (candidate) {
      const start = requested !== null && requested > timeToMinutes(candidate.start_time) ? requestedStart : candidate.start_time;
      suggested = { start_time: start, end_time: candidate.end_time, duration_hours: durationHours(start, candidate.end_time) };
    }
    return { free_windows: windows, full_vacancy_hours: Math.round(windows.reduce((sum, item) => sum + item.duration_hours, 0) * 10) / 10, suggested_duration: suggested };
  }

  getVacancy(roomCode, { date, requestedStart }) {
    const venue = this.assertUsableVenue(roomCode);
    return { data: this.vacancyPayload(venue, date, requestedStart), meta: { date, room_code: venue.room_code } };
  }

  getReservationConfig({ studentId }) {
    const student = this.repository.findStudent(studentId);
    if (!student) throw new HttpError(404, 'STUDENT_NOT_FOUND', 'Student does not exist');
    return { data: { requester: { full_name: student.full_name, student_id: student.student_id, program_section: student.program_section }, approval_notice: `Final approval is required from the ${this.settings.approverRole} before the venue is officially locked.`, purpose_max_length: this.settings.purposeMaxLength, minimum_slot_minutes: this.settings.minSlotMinutes } };
  }

  getDateOptions() { return { data: this.repository.listDateOptions().map((date) => ({ date, dataset_label: 'Demo week' })), meta: { dataset_label: 'Demo week' } }; }

  requestLock({ roomCode, date, startTime, endTime, purpose, studentId }) {
    const venue = this.assertUsableVenue(roomCode);
    if (!this.repository.findStudent(studentId)) throw new HttpError(404, 'STUDENT_NOT_FOUND', 'Student does not exist');
    const entries = this.effectiveEntries(venue.room_code, date);
    if (entries.some((entry) => isBusy(entry) && overlaps(entry, startTime, endTime))) throw new HttpError(409, 'SLOT_CONFLICT', 'Requested slot conflicts with an occupied, reserved, locked, or pending slot');
    if (!rangeInsideFreeWindow(startTime, endTime, freeWindows(entries, this.settings.operationalWindow))) throw new HttpError(422, 'NOT_WITHIN_FREE_WINDOW', 'Requested range must lie inside one free window');
    const reservation = this.repository.createReservation({ venueId: venue.room_code, studentId, date, startTime, endTime, purpose, approverRole: this.settings.approverRole });
    if (!reservation) throw new HttpError(409, 'SLOT_CONFLICT', 'Requested slot is no longer available');
    return { data: reservationResponse(reservation) };
  }
}
