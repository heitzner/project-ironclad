import { isBusy, overlaps } from '../domain/booking.js';

const activeStatuses = new Set(['pending_approval', 'approved']);

export class InMemoryBookingRepository {
  constructor(data) {
    this.venues = structuredClone(data.venues);
    this.scheduleEntries = structuredClone(data.scheduleEntries);
    this.reservations = structuredClone(data.reservations);
    this.students = structuredClone(data.students);
    this.adminSession = structuredClone(data.adminSession);
    this.councilSession = structuredClone(data.councilSession);
    this.decisionLogs = structuredClone(data.decisionLogs);
    this.endorsements = structuredClone(data.endorsements);
    this.notices = structuredClone(data.notices);
    this.calendar = structuredClone(data.calendar);
    this.dateOptions = [...data.dateOptions];
    this.nextReservationNumber = this.reservations.length + 1;
    this.nextEndorsementNumber = this.endorsements.length + 1;
  }

  listVenues() { return structuredClone(this.venues); }

  findVenueByRoomCode(roomCode) {
    const venue = this.venues.find((item) => item.room_code.toLowerCase() === roomCode.toLowerCase());
    return venue ? structuredClone(venue) : null;
  }

  listScheduleEntries(venueId, date) {
    return structuredClone(this.scheduleEntries.filter((entry) => entry.venue_id === venueId && entry.date === date));
  }

  addScheduleEntry(entry) { this.scheduleEntries.push(structuredClone(entry)); }

  listReservations(venueId, date, { activeOnly = false } = {}) {
    return structuredClone(this.reservations.filter((reservation) => reservation.venue_id === venueId
      && reservation.date === date && (!activeOnly || activeStatuses.has(reservation.status))));
  }

  listAllReservations() { return structuredClone(this.reservations); }

  findReservation(reservationId) {
    const reservation = this.reservations.find((item) => item.reservation_id === reservationId);
    return reservation ? structuredClone(reservation) : null;
  }

  findStudent(studentId) {
    const student = this.students.find((item) => item.student_id === studentId);
    return student ? structuredClone(student) : null;
  }

  getCalendar() { return structuredClone(this.calendar); }
  listDateOptions() { return [...this.dateOptions]; }
  listDecisionLogs() { return structuredClone(this.decisionLogs); }

  resolveAdminSession(sessionId, settings) {
    if (sessionId === settings.testSessionId && this.adminSession.session_id === sessionId) return structuredClone(this.adminSession);
    if (sessionId === settings.nonAdminSessionId) return { full_name: this.students[0].full_name, role: 'STUDENT', session_id: sessionId };
    return null;
  }

  resolveCouncilSession(sessionId, settings) {
    if (sessionId === settings.testSessionId && this.councilSession.session_id === sessionId) return structuredClone(this.councilSession);
    if (settings.nonCouncilSessionIds.includes(sessionId)) {
      if (sessionId === this.adminSession.session_id) return structuredClone(this.adminSession);
      return { full_name: this.students[0].full_name, role: 'STUDENT', session_id: sessionId };
    }
    return null;
  }

  createReservation({ venueId, studentId, date, startTime, endTime, purpose, approverRole }) {
    const scheduleConflict = this.scheduleEntries.some((entry) => entry.venue_id === venueId
      && entry.date === date && isBusy(entry) && overlaps(entry, startTime, endTime));
    const reservationConflict = this.reservations.some((reservation) => reservation.venue_id === venueId
      && reservation.date === date && activeStatuses.has(reservation.status)
      && overlaps(reservation, startTime, endTime));
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
    const reservation = this.reservations.find((item) => item.reservation_id === reservationId);
    if (!reservation) return { result: 'not_found' };
    if (reservation.decision !== 'pending') return { result: 'not_pending', reservation: structuredClone(reservation) };
    reservation.decision = action;
    reservation.status = action;
    reservation.decided_by = performedBy;
    reservation.decided_at = performedAt;
    reservation.decision_reason = reason;
    this.decisionLogs.push({
      reservation_id: reservationId,
      action,
      performed_by: performedBy,
      performed_at: performedAt,
      reason,
      is_demo: false,
      dataset_label: null,
    });
    return { result: 'updated', reservation: structuredClone(reservation) };
  }

  listActiveNotices() { return structuredClone(this.notices.filter((notice) => notice.is_active)); }

  findNotice(noticeId) {
    const notice = this.notices.find((item) => item.notice_id === noticeId && item.is_active);
    return notice ? structuredClone(notice) : null;
  }

  findEndorsementByReservation(reservationId) {
    const endorsement = this.endorsements.find((item) => item.reservation_id === reservationId);
    return endorsement ? structuredClone(endorsement) : null;
  }

  createEndorsement({ reservationId, message, session, createdAt }) {
    if (this.endorsements.some((item) => item.reservation_id === reservationId)) return null;
    const endorsement = {
      endorsement_id: `END-${String(this.nextEndorsementNumber).padStart(4, '0')}`,
      reservation_id: reservationId,
      message,
      endorsed_by: {
        full_name: session.full_name,
        program_section: session.program_section,
      },
      created_at: createdAt,
      is_demo: false,
      dataset_label: null,
    };
    this.nextEndorsementNumber += 1;
    this.endorsements.push(endorsement);
    return structuredClone(endorsement);
  }
}
