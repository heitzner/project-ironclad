import {
  deriveStatus,
  freeWindows,
  isBusy,
  overlaps,
  rangeInsideFreeWindow,
  utilizationPercent,
} from '../domain/booking.js';
import { durationHours } from '../domain/dateTime.js';
import { HttpError } from '../http/errors.js';

const decisionLabels = {
  pending: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

function summaryFor(venues) {
  const summary = { available: 0, occupied: 0, unavailable: 0 };
  for (const venue of venues) summary[venue.status] += 1;
  return summary;
}

function decisionCounts(requests) {
  const counts = { pending: 0, approved: 0, rejected: 0 };
  for (const request of requests) counts[request.decision] += 1;
  return counts;
}

export class AdminBookingService {
  constructor(repository, bookingService, settings) {
    this.repository = repository;
    this.bookingService = bookingService;
    this.settings = settings;
  }

  getSession(session) {
    return {
      data: {
        full_name: session.full_name,
        role: session.role,
        session_label: session.session_label,
        server_time: new Date().toISOString(),
      },
    };
  }

  listVenues({ date, period, q, occupancy }) {
    if (this.settings.admin.connectionState === 'not_connected') {
      return { data: [], meta: { connection_state: 'not_connected' } };
    }
    const studentResult = this.bookingService.listVenues({ date, period, q });
    const venues = occupancy === 'all'
      ? studentResult.data
      : studentResult.data.filter((venue) => venue.status === occupancy);
    return {
      data: venues,
      meta: {
        connection_state: 'connected',
        date,
        period,
        total_count: venues.length,
        summary: summaryFor(venues),
      },
    };
  }

  venueState(venue, date) {
    const entries = this.bookingService.effectiveEntries(venue.room_code, date);
    const windows = this.settings.periods.all_day;
    const status = deriveStatus(venue, entries, windows);
    return {
      status: status.status,
      status_label: status.status_label,
      utilization_percent: utilizationPercent(venue, entries, windows),
    };
  }

  enrichReservation(reservation) {
    const requester = this.repository.findStudent(reservation.requested_by);
    const venue = this.repository.findVenueByRoomCode(reservation.venue_id);
    const venueState = venue
      ? this.venueState(venue, reservation.date)
      : { status: 'unavailable', status_label: 'Venue Missing', utilization_percent: 0 };
    return {
      reservation,
      requester,
      venue,
      venueState,
      decision: reservation.decision,
    };
  }

  tableRow(enriched) {
    const { reservation, requester } = enriched;
    return {
      reservation_id: reservation.reservation_id,
      room_code: reservation.venue_id,
      decision: reservation.decision,
      status_label: decisionLabels[reservation.decision],
      requester: requester ? {
        full_name: requester.full_name,
        student_id: requester.student_id,
        program_section: requester.program_section,
      } : null,
      purpose: reservation.purpose,
      date: reservation.date,
      start_time: reservation.start_time,
      end_time: reservation.end_time,
      duration_hours: durationHours(reservation.start_time, reservation.end_time),
      confirmation: {
        decision: reservation.decision,
        decided_by: reservation.decided_by,
        decided_at: reservation.decided_at,
        decision_reason: reservation.decision_reason,
        available_actions: reservation.decision === 'pending' ? ['approve', 'reject'] : [],
      },
    };
  }

  listRequests({ q, decision, occupancy, roomCode, sort, limit, offset }) {
    if (this.settings.admin.connectionState === 'not_connected') {
      return { data: [], meta: { connection_state: 'not_connected' } };
    }
    const query = q.toLowerCase();
    let requests = this.repository.listAllReservations().map(
      (reservation) => this.enrichReservation(reservation),
    );
    if (query) {
      requests = requests.filter(({ reservation, requester }) => [
        reservation.venue_id,
        requester?.full_name,
        requester?.student_id,
        reservation.purpose,
      ].some((value) => value?.toLowerCase().includes(query)));
    }
    if (decision !== 'all') {
      requests = requests.filter((request) => request.decision === decision);
    }
    if (occupancy !== 'all') {
      requests = requests.filter((request) => request.venueState.status === occupancy);
    }
    if (roomCode) {
      requests = requests.filter(
        ({ reservation }) => reservation.venue_id.toLowerCase() === roomCode.toLowerCase(),
      );
    }
    requests.sort((left, right) => {
      const leftValue = left.reservation[sort];
      const rightValue = right.reservation[sort];
      const primary = rightValue.localeCompare(leftValue);
      return primary || right.reservation.created_at.localeCompare(left.reservation.created_at);
    });
    const totalCount = requests.length;
    const counts = decisionCounts(requests);
    const page = requests.slice(offset, offset + limit).map((request) => this.tableRow(request));
    return {
      data: page,
      meta: {
        connection_state: 'connected',
        total_count: totalCount,
        decision_counts: counts,
        limit,
        offset,
      },
    };
  }

  conflictCheck(reservation) {
    const venue = this.repository.findVenueByRoomCode(reservation.venue_id);
    if (!venue || venue.status_override || !venue.is_details_available) return false;
    const entries = this.bookingService.effectiveEntries(venue.room_code, reservation.date, {
      excludeReservationId: reservation.decision === 'pending'
        ? reservation.reservation_id
        : undefined,
    });
    if (entries.some(
      (entry) => isBusy(entry)
        && overlaps(entry, reservation.start_time, reservation.end_time),
    )) return false;
    return rangeInsideFreeWindow(
      reservation.start_time,
      reservation.end_time,
      freeWindows(entries, this.settings.operationalWindow),
    );
  }

  getRequest(reservationId) {
    const reservation = this.repository.findReservation(reservationId);
    if (!reservation) {
      throw new HttpError(404, 'RESERVATION_NOT_FOUND', 'Reservation does not exist');
    }
    const enriched = this.enrichReservation(reservation);
    const row = this.tableRow(enriched);
    return {
      data: {
        ...row,
        status: reservation.status,
        approver_role: reservation.approver_role,
        created_at: reservation.created_at,
        venue: enriched.venue ? {
          room_code: enriched.venue.room_code,
          name: enriched.venue.name,
          floor: enriched.venue.floor,
          location_label: enriched.venue.location_label,
          capacity: enriched.venue.capacity,
          utilization_percent: enriched.venueState.utilization_percent,
          status: enriched.venueState.status,
          status_label: enriched.venueState.status_label,
        } : null,
        conflict_check: this.conflictCheck(reservation),
      },
    };
  }

  approve(reservationId, reason, session) {
    const reservation = this.repository.findReservation(reservationId);
    if (!reservation) {
      throw new HttpError(404, 'RESERVATION_NOT_FOUND', 'Reservation does not exist');
    }
    if (reservation.decision !== 'pending') {
      throw new HttpError(409, 'RESERVATION_NOT_PENDING', 'Reservation decision is final');
    }
    const venue = this.repository.findVenueByRoomCode(reservation.venue_id);
    if (!venue) throw new HttpError(404, 'VENUE_NOT_FOUND', 'Venue does not exist');
    if (venue.status_override || !venue.is_details_available) {
      throw new HttpError(422, 'VENUE_UNAVAILABLE', 'Venue is unavailable');
    }
    if (!this.conflictCheck(reservation)) {
      throw new HttpError(409, 'SLOT_CONFLICT', 'The requested window now conflicts');
    }
    const decided = this.repository.decideReservation(
      reservationId,
      'approved',
      session.full_name,
      new Date().toISOString(),
      reason,
    );
    return this.getRequest(decided.reservation.reservation_id);
  }

  reject(reservationId, reason, session) {
    const reservation = this.repository.findReservation(reservationId);
    if (!reservation) {
      throw new HttpError(404, 'RESERVATION_NOT_FOUND', 'Reservation does not exist');
    }
    if (reservation.decision !== 'pending') {
      throw new HttpError(409, 'RESERVATION_NOT_PENDING', 'Reservation decision is final');
    }
    const decided = this.repository.decideReservation(
      reservationId,
      'rejected',
      session.full_name,
      new Date().toISOString(),
      reason,
    );
    return this.getRequest(decided.reservation.reservation_id);
  }
}
