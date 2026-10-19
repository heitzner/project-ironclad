import { isBusy, overlaps } from '../domain/booking.js';

const activeReservationStatuses = new Set(['pending_approval', 'approved']);

export class InMemoryBookingRepository {
  constructor({
    venues,
    scheduleEntries,
    reservations,
    students,
    adminSession,
    decisionLogs,
    calendar,
    dateOptions,
  }) {
    this.venues = structuredClone(venues);
    this.scheduleEntries = structuredClone(scheduleEntries);
    this.reservations = structuredClone(reservations);
    this.students = structuredClone(students);
    this.adminSession = structuredClone(adminSession);
    this.decisionLogs = structuredClone(decisionLogs);
    this.calendar = structuredClone(calendar);
    this.dateOptions = [...dateOptions];
    this.nextReservationNumber = this.reservations.length + 1;
  }

  listVenues() {
    return structuredClone(this.venues);
  }

  findVenueByRoomCode(roomCode) {
    const venue = this.venues.find(
      (candidate) => candidate.room_code.toLowerCase() === roomCode.toLowerCase(),
    );
    return venue ? structuredClone(venue) : null;
  }

  listScheduleEntries(venueId, date) {
    return structuredClone(this.scheduleEntries.filter(
      (entry) => entry.venue_id === venueId && entry.date === date,
    ));
  }

  listReservations(venueId, date, { activeOnly = false } = {}) {
    return structuredClone(this.reservations.filter(
      (reservation) => reservation.venue_id === venueId
        && reservation.date === date
        && (!activeOnly || activeReservationStatuses.has(reservation.status)),
    ));
  }

  listAllReservations() {
    return structuredClone(this.reservations);
  }

  findReservation(reservationId) {
    const reservation = this.reservations.find(
      (candidate) => candidate.reservation_id === reservationId,
    );
    return reservation ? structuredClone(reservation) : null;
  }

  findStudent(studentId) {
    const student = this.students.find((candidate) => candidate.student_id === studentId);
    return student ? structuredClone(student) : null;
  }

  resolveTestSession(sessionId, { adminSessionId, nonAdminSessionId }) {
    if (sessionId === adminSessionId && this.adminSession.session_id === adminSessionId) {
      return structuredClone(this.adminSession);
    }
    if (sessionId === nonAdminSessionId) {
      return {
        full_name: this.students[0]?.full_name || 'Test Student',
        role: 'STUDENT',
        session_label: 'Student test session',
        session_id: nonAdminSessionId,
      };
    }
    return null;
  }

  listDecisionLogs() {
    return structuredClone(this.decisionLogs);
  }

  getCalendar() {
    return structuredClone(this.calendar);
  }

  listDateOptions() {
    return [...this.dateOptions];
  }

  createReservation({ venueId, studentId, date, startTime, endTime, purpose, approverRole }) {
    const scheduleConflict = this.scheduleEntries.some(
      (entry) => entry.venue_id === venueId
        && entry.date === date
        && isBusy(entry)
        && overlaps(entry, startTime, endTime),
    );
    const reservationConflict = this.reservations.some(
      (reservation) => reservation.venue_id === venueId
        && reservation.date === date
        && activeReservationStatuses.has(reservation.status)
        && overlaps(reservation, startTime, endTime),
    );
    if (scheduleConflict || reservationConflict) return null;

    const reservation = {
      reservation_id: `RES-${String(this.nextReservationNumber).padStart(4, '0')}`,
      venue_id: venueId,
      requested_by: studentId,
      date,
      start_time: startTime,
      end_time: endTime,
      purpose,
      status: 'pending_approval',
      decision: 'pending',
      approver_role: approverRole,
      created_at: new Date().toISOString(),
      decided_by: null,
      decided_at: null,
      decision_reason: null,
      is_demo: false,
      dataset_label: null,
    };
    this.nextReservationNumber += 1;
    this.reservations.push(reservation);
    return structuredClone(reservation);
  }

  decideReservation(reservationId, action, performedBy, performedAt, reason) {
    const reservation = this.reservations.find(
      (candidate) => candidate.reservation_id === reservationId,
    );
    if (!reservation) return { result: 'not_found' };
    if (reservation.decision !== 'pending') {
      return { result: 'not_pending', reservation: structuredClone(reservation) };
    }

    reservation.decision = action;
    reservation.status = action;
    reservation.decided_by = performedBy;
    reservation.decided_at = performedAt;
    reservation.decision_reason = reason;
    this.decisionLogs.push({
      reservation_id: reservation.reservation_id,
      action,
      performed_by: performedBy,
      performed_at: performedAt,
      reason,
      is_demo: false,
      dataset_label: null,
    });
    return { result: 'updated', reservation: structuredClone(reservation) };
  }

  addScheduleEntry(entry) {
    this.scheduleEntries.push(structuredClone(entry));
  }
}
