import { deriveStatus, freeWindows, isBusy, overlaps, rangeInsideFreeWindow, utilizationPercent } from '../domain/booking.js';
import { durationHours } from '../domain/dateTime.js';
import { HttpError } from '../http/errors.js';

const labels = { pending: 'Pending Approval', approved: 'Approved', rejected: 'Rejected' };

function counts(items, field, values) {
  return Object.fromEntries(values.map((value) => [value, items.filter((item) => item[field] === value).length]));
}

export class AdminBookingService {
  constructor(repository, bookingService, settings) { this.repository = repository; this.bookingService = bookingService; this.settings = settings; }

  getSession(session) { return { data: { full_name: session.full_name, role: session.role, session_label: session.session_label, server_time: new Date().toISOString() } }; }

  listVenues({ date, period, q, occupancy }) {
    if (this.settings.admin.connectionState === 'not_connected') return { data: [], meta: { connection_state: 'not_connected' } };
    let data = this.bookingService.listVenues({ date, period, q }).data;
    if (occupancy !== 'all') data = data.filter((venue) => venue.status === occupancy);
    const summary = { available: 0, occupied: 0, unavailable: 0 };
    for (const venue of data) summary[venue.status] += 1;
    return { data, meta: { connection_state: 'connected', date, period, total_count: data.length, summary } };
  }

  enrich(reservation) {
    const requester = this.repository.findStudent(reservation.requested_by);
    const venue = this.repository.findVenueByRoomCode(reservation.venue_id);
    const entries = venue ? this.bookingService.effectiveEntries(venue.room_code, reservation.date) : [];
    const state = venue ? deriveStatus(venue, entries, this.settings.periods.all_day) : { status: 'unavailable', status_label: 'Venue Missing' };
    return { reservation, requester, venue, venueState: { ...state, utilization_percent: venue ? utilizationPercent(venue, entries, this.settings.periods.all_day) : 0 }, decision: reservation.decision };
  }

  row(enriched) {
    const { reservation, requester } = enriched;
    return {
      reservation_id: reservation.reservation_id,
      room_code: reservation.venue_id,
      decision: reservation.decision,
      status_label: labels[reservation.decision],
      requester: requester ? { full_name: requester.full_name, student_id: requester.student_id, program_section: requester.program_section } : null,
      purpose: reservation.purpose,
      date: reservation.date,
      start_time: reservation.start_time,
      end_time: reservation.end_time,
      duration_hours: durationHours(reservation.start_time, reservation.end_time),
      confirmation: { decision: reservation.decision, decided_by: reservation.decided_by, decided_at: reservation.decided_at, decision_reason: reservation.decision_reason, available_actions: reservation.decision === 'pending' ? ['approve', 'reject'] : [] },
    };
  }

  filteredRequests({ q, decision, occupancy, roomCode, sort }) {
    let items = this.repository.listAllReservations().map((item) => this.enrich(item));
    const query = q.toLowerCase();
    if (query) items = items.filter(({ reservation, requester }) => [reservation.venue_id, requester?.full_name, requester?.student_id, reservation.purpose].some((value) => value?.toLowerCase().includes(query)));
    if (decision !== 'all') items = items.filter((item) => item.decision === decision);
    if (occupancy && occupancy !== 'all') items = items.filter((item) => item.venueState.status === occupancy);
    if (roomCode) items = items.filter((item) => item.reservation.venue_id.toLowerCase() === roomCode.toLowerCase());
    return items.toSorted((a, b) => b.reservation[sort].localeCompare(a.reservation[sort]) || b.reservation.created_at.localeCompare(a.reservation.created_at));
  }

  listRequests(query) {
    if (this.settings.admin.connectionState === 'not_connected') return { data: [], meta: { connection_state: 'not_connected' } };
    const items = this.filteredRequests(query);
    return { data: items.slice(query.offset, query.offset + query.limit).map((item) => this.row(item)), meta: { connection_state: 'connected', total_count: items.length, decision_counts: counts(items, 'decision', ['pending', 'approved', 'rejected']), limit: query.limit, offset: query.offset } };
  }

  conflictCheck(reservation) {
    const venue = this.repository.findVenueByRoomCode(reservation.venue_id);
    if (!venue || venue.status_override || !venue.is_details_available) return false;
    const entries = this.bookingService.effectiveEntries(venue.room_code, reservation.date, { excludeReservationId: reservation.decision === 'pending' ? reservation.reservation_id : undefined });
    if (entries.some((entry) => isBusy(entry) && overlaps(entry, reservation.start_time, reservation.end_time))) return false;
    return rangeInsideFreeWindow(reservation.start_time, reservation.end_time, freeWindows(entries, this.settings.operationalWindow));
  }

  getRequest(reservationId) {
    const reservation = this.repository.findReservation(reservationId);
    if (!reservation) throw new HttpError(404, 'RESERVATION_NOT_FOUND', 'Reservation does not exist');
    const enriched = this.enrich(reservation);
    const venue = enriched.venue;
    return { data: { ...this.row(enriched), status: reservation.status, approver_role: reservation.approver_role, created_at: reservation.created_at, venue: venue ? { room_code: venue.room_code, name: venue.name, floor: venue.floor, location_label: venue.location_label, capacity: venue.capacity, ...enriched.venueState } : null, conflict_check: this.conflictCheck(reservation) } };
  }

  approve(reservationId, reason, session) {
    const reservation = this.repository.findReservation(reservationId);
    if (!reservation) throw new HttpError(404, 'RESERVATION_NOT_FOUND', 'Reservation does not exist');
    if (reservation.decision !== 'pending') throw new HttpError(409, 'RESERVATION_NOT_PENDING', 'Reservation decision is final');
    const venue = this.repository.findVenueByRoomCode(reservation.venue_id);
    if (!venue) throw new HttpError(404, 'VENUE_NOT_FOUND', 'Venue does not exist');
    if (venue.status_override || !venue.is_details_available) throw new HttpError(422, 'VENUE_UNAVAILABLE', 'Venue is unavailable');
    if (!this.conflictCheck(reservation)) throw new HttpError(409, 'SLOT_CONFLICT', 'Requested window now conflicts');
    this.repository.decideReservation(reservationId, 'approved', session.full_name, new Date().toISOString(), reason);
    return this.getRequest(reservationId);
  }

  reject(reservationId, reason, session) {
    const reservation = this.repository.findReservation(reservationId);
    if (!reservation) throw new HttpError(404, 'RESERVATION_NOT_FOUND', 'Reservation does not exist');
    if (reservation.decision !== 'pending') throw new HttpError(409, 'RESERVATION_NOT_PENDING', 'Reservation decision is final');
    this.repository.decideReservation(reservationId, 'rejected', session.full_name, new Date().toISOString(), reason);
    return this.getRequest(reservationId);
  }
}
