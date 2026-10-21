import { findCurrentEntry, freeWindows, stateLabel, upcomingEntries, utilizationPercent } from '../domain/booking.js';
import { displayClockInZone, durationHours, formatTime12Hour, timeToMinutes } from '../domain/dateTime.js';
import { HttpError } from '../http/errors.js';

const decisionLabels = { pending: 'Pending Approval', approved: 'Approved', rejected: 'Rejected' };

function searchable(venue) {
  return [venue.room_code, venue.name, venue.location_label, ...venue.equipment].join(' ').toLowerCase();
}

function decisionCounts(items) {
  return {
    pending: items.filter((item) => item.reservation.decision === 'pending').length,
    approved: items.filter((item) => item.reservation.decision === 'approved').length,
    rejected: items.filter((item) => item.reservation.decision === 'rejected').length,
  };
}

export class CouncilBookingService {
  constructor(repository, bookingService, adminService, settings) {
    this.repository = repository;
    this.bookingService = bookingService;
    this.adminService = adminService;
    this.settings = settings;
  }

  now() { return this.settings.council.clockIso ? new Date(this.settings.council.clockIso) : new Date(); }

  getSession(session) {
    const instant = this.now();
    return { data: { full_name: session.full_name, program_section: session.program_section, role: session.role, server_time: instant.toISOString(), ...displayClockInZone(this.settings.timeZone, instant) } };
  }

  deriveCouncilState(venue, entries, atTime, windows) {
    const utilization = utilizationPercent(venue, entries, windows);
    const current = findCurrentEntry(entries, atTime);
    let status;
    let statusLabel;
    if (venue.status_override || !venue.is_details_available) {
      status = 'unavailable';
      statusLabel = venue.status_override || 'Details Unavailable';
    } else if (current?.reservation_id) {
      status = 'reserved';
      statusLabel = 'Reserved';
    } else if (current && ['occupied', 'reserved', 'locked'].includes(current.state)) {
      status = 'in_session';
      statusLabel = 'In Session';
    } else {
      status = 'available';
      statusLabel = 'Available Now';
    }

    let utilizationLabel;
    if (current?.entry_type === this.settings.council.examPrepEntryType) utilizationLabel = 'Exam Prep';
    else if (current?.reservation_id) utilizationLabel = 'Reserved';
    else if (status === 'in_session' && utilization >= this.settings.council.allocatedMinPercent) utilizationLabel = 'Allocated';
    else if (status === 'in_session') utilizationLabel = 'In Session';
    else if (utilization === 0) utilizationLabel = 'Empty';
    else if (utilization <= this.settings.council.vacantMaxPercent) utilizationLabel = 'Vacant';
    else utilizationLabel = 'Vacant Soon';
    return { status, status_label: statusLabel, utilization_percent: utilization, utilization_label: utilizationLabel, current };
  }

  venueRow(venue, date, period, atTime, selectedRoomCode) {
    const state = this.deriveCouncilState(venue, this.bookingService.effectiveEntries(venue.room_code, date), atTime, this.settings.periods[period]);
    return {
      room_code: venue.room_code,
      name: venue.name,
      floor: venue.floor,
      location_label: venue.location_label,
      capacity: venue.capacity,
      utilization_percent: state.utilization_percent,
      utilization_label: state.utilization_label,
      status: state.status,
      status_label: state.status_label,
      is_selected: selectedRoomCode !== undefined && venue.room_code.toLowerCase() === selectedRoomCode.toLowerCase(),
    };
  }

  listVenues({ date, period, floor, q, selectedRoomCode, atTime }) {
    if (this.settings.council.connectionState === 'not_connected') return { data: [], meta: { connection_state: 'not_connected' } };
    const all = this.repository.listVenues();
    const searched = q ? all.filter((venue) => searchable(venue).includes(q.toLowerCase())) : all;
    const filtered = floor ? searched.filter((venue) => venue.floor === floor) : searched;
    const data = filtered.map((venue) => this.venueRow(venue, date, period, atTime, selectedRoomCode));
    return {
      data,
      meta: {
        connection_state: 'connected',
        date,
        period,
        total_count: data.length,
        floor_counts: {
          all_venues: searched.length,
          floor_1: searched.filter((venue) => venue.floor === 1).length,
          floor_2: searched.filter((venue) => venue.floor === 2).length,
          floor_3: searched.filter((venue) => venue.floor === 3).length,
          floor_4: searched.filter((venue) => venue.floor === 4).length,
        },
      },
    };
  }

  currentSession(entry) {
    if (!entry) return null;
    const prefix = { occupied: 'In Session', free_window: 'Free Window', reserved: 'Reserved', locked: 'Locked' }[entry.state];
    return { title: entry.title, instructor_name: entry.instructor_name, entry_type: entry.entry_type, end_time: entry.end_time, status_label: `${prefix} • Until ${formatTime12Hour(entry.end_time)}` };
  }

  enrichRequest(reservation, selectedReservationId) {
    const requester = this.repository.findStudent(reservation.requested_by);
    return {
      reservation,
      row: {
        reservation_id: reservation.reservation_id,
        room_code: reservation.venue_id,
        decision: reservation.decision,
        status_label: decisionLabels[reservation.decision],
        requester: requester ? { full_name: requester.full_name, student_id: requester.student_id, program_section: requester.program_section } : null,
        purpose: reservation.purpose,
        date: reservation.date,
        start_time: reservation.start_time,
        end_time: reservation.end_time,
        duration_hours: durationHours(reservation.start_time, reservation.end_time),
        decided_by: reservation.decided_by,
        decided_at: reservation.decided_at,
        decision_reason: reservation.decision_reason,
        is_selected: selectedReservationId !== undefined && reservation.reservation_id === selectedReservationId,
      },
    };
  }

  requestsForVenue(roomCode) {
    return this.repository.listAllReservations()
      .filter((reservation) => reservation.venue_id.toLowerCase() === roomCode.toLowerCase() && reservation.decision === 'pending')
      .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
      .map((reservation) => this.enrichRequest(reservation).row);
  }

  venueSidebar(roomCode, { date, atTime }) {
    const venue = this.repository.findVenueByRoomCode(roomCode);
    if (!venue) throw new HttpError(404, 'VENUE_NOT_FOUND', 'Venue does not exist');
    if (!venue.is_details_available) throw new HttpError(422, 'VENUE_DETAILS_UNAVAILABLE', 'Venue details are unavailable');
    const entries = this.bookingService.effectiveEntries(venue.room_code, date);
    const state = this.deriveCouncilState(venue, entries, atTime, this.settings.periods.all_day);
    const vacancy = this.bookingService.vacancyPayload(venue, date);
    const calendar = this.repository.getCalendar();
    return {
      data: {
        venue: { room_code: venue.room_code, name: venue.name, location_label: venue.location_label, capacity: venue.capacity, status: state.status, status_label: state.status_label },
        current_time: atTime,
        term_label: calendar.term_label,
        week_label: calendar.week_label,
        current_session: this.currentSession(state.current),
        upcoming_schedule: upcomingEntries(entries, atTime).map((entry) => ({ start_time: entry.start_time, end_time: entry.end_time, title: entry.title, entry_type: entry.entry_type, state_label: stateLabel(entry) })),
        ...vacancy,
        pending_requests_for_venue: this.requestsForVenue(venue.room_code),
      },
      meta: { date, time_zone: this.settings.timeZone },
    };
  }

  filteredRequests({ q, decision, roomCode, sort, selectedReservationId }) {
    const query = q.toLowerCase();
    let items = this.repository.listAllReservations().map((reservation) => this.enrichRequest(reservation, selectedReservationId));
    if (query) items = items.filter(({ reservation, row }) => [reservation.venue_id, row.requester?.full_name, row.requester?.student_id, reservation.purpose].some((value) => value?.toLowerCase().includes(query)));
    if (decision !== 'all') items = items.filter(({ reservation }) => reservation.decision === decision);
    if (roomCode) items = items.filter(({ reservation }) => reservation.venue_id.toLowerCase() === roomCode.toLowerCase());
    return items.toSorted((a, b) => b.reservation[sort].localeCompare(a.reservation[sort]) || b.reservation.created_at.localeCompare(a.reservation.created_at));
  }

  listRequests(query) {
    if (this.settings.council.connectionState === 'not_connected') return { data: [], meta: { connection_state: 'not_connected' } };
    const items = this.filteredRequests(query);
    return { data: items.slice(query.offset, query.offset + query.limit).map((item) => item.row), meta: { connection_state: 'connected', total_count: items.length, decision_counts: decisionCounts(items), limit: query.limit, offset: query.offset } };
  }

  requestSidebar(reservationId, atTime) {
    const reservation = this.repository.findReservation(reservationId);
    if (!reservation) throw new HttpError(404, 'RESERVATION_NOT_FOUND', 'Reservation does not exist');
    const venueSidebar = this.venueSidebar(reservation.venue_id, { date: reservation.date, atTime }).data;
    return { data: { request: this.enrichRequest(reservation, reservationId).row, venue_sidebar: venueSidebar, conflict_check: this.adminService.conflictCheck(reservation), endorsement: this.repository.findEndorsementByReservation(reservationId) } };
  }

  listNotices() {
    return { data: this.repository.listActiveNotices().map(({ notice_id, label, title, message, guidelines_available }) => ({ notice_id, label, title, message, guidelines_available })) };
  }

  getGuidelines(noticeId) {
    const notice = this.repository.findNotice(noticeId);
    if (!notice || !notice.guidelines_available) throw new HttpError(404, 'GUIDELINES_NOT_FOUND', 'Notice guidelines are not available');
    return { data: { notice_id: notice.notice_id, title: notice.title, guidelines: notice.guidelines_text } };
  }

  getReservationConfig(session) {
    return this.bookingService.getReservationConfig({ studentId: session.student_id });
  }

  createReservation(input, session) {
    return this.bookingService.requestLock({ ...input, studentId: session.student_id });
  }

  createEndorsement(reservationId, message, session) {
    if (!this.repository.findReservation(reservationId)) throw new HttpError(404, 'RESERVATION_NOT_FOUND', 'Reservation does not exist');
    const endorsement = this.repository.createEndorsement({ reservationId, message, session, createdAt: this.now().toISOString() });
    if (!endorsement) throw new HttpError(409, 'ENDORSEMENT_EXISTS', 'This reservation already has an endorsement');
    return { data: endorsement };
  }
}
