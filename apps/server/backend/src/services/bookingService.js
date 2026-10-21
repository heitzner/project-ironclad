import {
  deriveStatus,
  findCurrentEntry,
  freeWindows,
  isBusy,
  overlaps,
  rangeInsideFreeWindow,
  stateLabel,
  upcomingEntries,
  utilizationPercent,
} from '../domain/booking.js';
import { durationHours, formatTime12Hour, timeToMinutes } from '../domain/dateTime.js';
import { HttpError } from '../http/errors.js';

function searchableVenueText(venue) {
  return [venue.room_code, venue.name, venue.location_label, ...venue.equipment]
    .join(' ')
    .toLowerCase();
}

function reservationAsScheduleEntry(reservation) {
  return {
    venue_id: reservation.venue_id,
    date: reservation.date,
    start_time: reservation.start_time,
    end_time: reservation.end_time,
    title: reservation.purpose,
    entry_type: 'reserved',
    instructor_name: null,
    state: reservation.status === 'approved' ? 'locked' : 'reserved',
    locked_by: reservation.status === 'approved'
      ? (reservation.decided_by || reservation.approver_role)
      : null,
    reservation_id: reservation.reservation_id,
    is_demo: false,
    dataset_label: null,
  };
}

function periodFreeWindows(entries, windows) {
  return windows.flatMap((window) => freeWindows(entries, window));
}

function referenceClock(settings) {
  if (settings.demoNow) {
    return {
      date: settings.demoNow.slice(0, 10),
      time: settings.demoNow.slice(11, 16),
    };
  }
  const date = new Date(`${settings.demoWeekStart}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return { date: date.toISOString().slice(0, 10), time: '14:15' };
}

function listItem(venue, entries, windows) {
  const status = deriveStatus(venue, entries, windows);
  const availableWindows = venue.is_details_available
    ? periodFreeWindows(entries, windows)
    : [];
  return {
    room_code: venue.room_code,
    name: venue.name,
    floor: venue.floor,
    location_label: venue.location_label,
    capacity: venue.capacity,
    equipment: venue.equipment,
    utilization_percent: utilizationPercent(venue, entries, windows),
    status_label: status.status_label,
    status: status.status,
    status_override: venue.status_override,
    is_details_available: venue.is_details_available,
    next_free_window: availableWindows[0] || null,
    is_demo: venue.is_demo,
    dataset_label: venue.dataset_label,
  };
}

function currentStatusLabel(entry) {
  const prefix = {
    occupied: 'In Session',
    free_window: 'Free Window',
    reserved: 'Reserved',
    locked: 'Locked',
  }[entry.state];
  return `${prefix} • Until ${formatTime12Hour(entry.end_time)}`;
}

function reservationResponse(reservation) {
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
  constructor(repository, settings) {
    this.repository = repository;
    this.settings = settings;
  }

  effectiveEntries(venueId, date, { excludeReservationId } = {}) {
    const schedule = this.repository.listScheduleEntries(venueId, date);
    const holds = this.repository
      .listReservations(venueId, date, { activeOnly: true })
      .filter((reservation) => reservation.reservation_id !== excludeReservationId)
      .map(reservationAsScheduleEntry);
    return [...schedule, ...holds].toSorted(
      (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time),
    );
  }

  assertUsableVenue(roomCode) {
    const venue = this.repository.findVenueByRoomCode(roomCode);
    if (!venue) throw new HttpError(404, 'VENUE_NOT_FOUND', 'Venue does not exist');
    if (!venue.is_details_available || venue.status_override) {
      throw new HttpError(422, 'VENUE_UNAVAILABLE', 'Venue is unavailable');
    }
    return venue;
  }

  listVenues({ date, period, floor, q }) {
    const windows = this.settings.periods[period];
    const allVenues = this.repository.listVenues();
    const query = q.toLowerCase();
    const searchFiltered = query
      ? allVenues.filter((venue) => searchableVenueText(venue).includes(query))
      : allVenues;
    const floorCounts = {
      all_venues: searchFiltered.filter((venue) => venue.floor <= 3).length,
      floor_1: searchFiltered.filter((venue) => venue.floor === 1).length,
      floor_2: searchFiltered.filter((venue) => venue.floor === 2).length,
      floor_3: searchFiltered.filter((venue) => venue.floor === 3).length,
      floor_4: searchFiltered.filter((venue) => venue.floor === 4).length,
    };
    const filtered = floor
      ? searchFiltered.filter((venue) => venue.floor === floor)
      : searchFiltered.filter((venue) => venue.floor <= 3);
    const venues = filtered.map((venue) => listItem(
      venue,
      this.effectiveEntries(venue.room_code, date),
      windows,
    ));
    const summary = { available: 0, occupied: 0, unavailable: 0 };
    for (const venue of venues) summary[venue.status] += 1;

    return {
      data: venues,
      meta: {
        date,
        period,
        total_count: venues.length,
        summary,
        floor_counts: floorCounts,
        floor_unavailable_notice: allVenues.some(
          (venue) => venue.floor === 4 && !venue.is_details_available,
        ),
        dataset_label: 'Demo week',
        period_windows: windows,
      },
    };
  }

  getVenue(roomCode, { date, period }) {
    const venue = this.repository.findVenueByRoomCode(roomCode);
    if (!venue) throw new HttpError(404, 'VENUE_NOT_FOUND', 'Venue does not exist');
    const entries = this.effectiveEntries(venue.room_code, date);
    const windows = this.settings.periods[period];
    const status = deriveStatus(venue, entries, windows);
    const clock = referenceClock(this.settings);
    const currentEntry = date === clock.date ? findCurrentEntry(entries, clock.time) : null;
    const timetable = venue.is_details_available
      ? entries.filter((entry) => isBusy(entry) && windows.some(
        (window) => overlaps(entry, window.start, window.end),
      ))
      : [];
    const availableWindows = venue.is_details_available
      ? periodFreeWindows(entries, windows)
      : [];
    return {
      data: {
        room_code: venue.room_code,
        name: venue.name,
        floor: venue.floor,
        location_label: venue.location_label,
        capacity: venue.capacity,
        equipment: venue.equipment,
        status_override: venue.status_override,
        is_details_available: venue.is_details_available,
        is_demo: venue.is_demo,
        dataset_label: venue.dataset_label,
        utilization_percent: utilizationPercent(venue, entries, windows),
        status: status.status,
        status_label: status.status_label,
        timetable,
        free_windows: availableWindows,
        next_free_window: availableWindows[0] || null,
        current_occupancy: currentEntry && isBusy(currentEntry) ? currentEntry : null,
      },
      meta: {
        date,
        period,
        period_windows: windows,
        current_time: clock.time,
        time_zone: this.settings.timeZone,
      },
    };
  }

  getOccupancy(roomCode, { date, atTime }) {
    const venue = this.assertUsableVenue(roomCode);
    const entries = this.effectiveEntries(venue.room_code, date);
    const current = findCurrentEntry(entries, atTime);
    const calendar = this.repository.getCalendar();
    return {
      data: {
        venue: { room_code: venue.room_code, name: venue.name },
        current_time: atTime,
        term_label: calendar.term_label,
        week_label: calendar.week_label,
        current_session: current ? {
          title: current.title,
          instructor_name: current.instructor_name,
          entry_type: current.entry_type,
          end_time: current.end_time,
          status_label: currentStatusLabel(current),
        } : null,
        upcoming_schedule: upcomingEntries(entries, atTime).map((entry) => ({
          start_time: entry.start_time,
          end_time: entry.end_time,
          title: entry.title,
          entry_type: entry.entry_type,
          state_label: stateLabel(entry),
        })),
      },
      meta: { date, time_zone: this.settings.timeZone },
    };
  }

  vacancyPayload(venue, date, requestedStart) {
    const windows = freeWindows(
      this.effectiveEntries(venue.room_code, date),
      this.settings.operationalWindow,
    );
    const requestedMinutes = requestedStart === undefined ? null : timeToMinutes(requestedStart);
    const candidate = windows.find(
      (window) => requestedMinutes === null || timeToMinutes(window.end_time) > requestedMinutes,
    );
    let suggestedDuration = null;
    if (candidate) {
      const suggestedStart = requestedMinutes === null
        ? candidate.start_time
        : (requestedMinutes > timeToMinutes(candidate.start_time)
          ? requestedStart
          : candidate.start_time);
      suggestedDuration = {
        start_time: suggestedStart,
        end_time: candidate.end_time,
        duration_hours: durationHours(suggestedStart, candidate.end_time),
      };
    }
    const total = windows.reduce((sum, window) => sum + window.duration_hours, 0);
    return {
      free_windows: windows,
      full_vacancy_hours: Math.round(total * 10) / 10,
      suggested_duration: suggestedDuration,
    };
  }

  getVacancy(roomCode, { date, requestedStart }) {
    const venue = this.assertUsableVenue(roomCode);
    return {
      data: this.vacancyPayload(venue, date, requestedStart),
      meta: { date, room_code: venue.room_code },
    };
  }

  getReservationConfig({ studentId }) {
    const student = this.repository.findStudent(studentId);
    if (!student) throw new HttpError(404, 'STUDENT_NOT_FOUND', 'Student does not exist');
    return {
      data: {
        requester: {
          id: student.student_id,
          name: student.full_name,
          studentId: student.student_id,
          program: student.program_section,
          full_name: student.full_name,
          student_id: student.student_id,
          program_section: student.program_section,
        },
        approval_notice: `Final approval is required from the ${this.settings.approverRole} before the venue is officially locked.`,
        purpose_max_length: this.settings.purposeMaxLength,
        minimum_slot_minutes: this.settings.minSlotMinutes,
      },
    };
  }

  getDateOptions() {
    const clock = referenceClock(this.settings);
    return {
      data: this.repository.listDateOptions()
        .filter((date) => date >= clock.date)
        .map((date) => ({
          date,
          dataset_label: 'Demo week',
        })),
      meta: { dataset_label: 'Demo week', default_date: clock.date },
    };
  }

  getNotices() {
    return {
      data: this.repository.listNotices(),
      meta: { dataset_label: 'Demo week' },
    };
  }

  requestLock({ roomCode, date, startTime, endTime, purpose, studentId }) {
    const venue = this.assertUsableVenue(roomCode);
    if (!this.repository.findStudent(studentId)) {
      throw new HttpError(404, 'STUDENT_NOT_FOUND', 'Student does not exist');
    }
    const entries = this.effectiveEntries(venue.room_code, date);
    if (entries.some(
      (entry) => isBusy(entry) && overlaps(entry, startTime, endTime),
    )) {
      throw new HttpError(
        409,
        'SLOT_CONFLICT',
        'The requested slot overlaps an occupied, reserved, locked, or pending slot',
      );
    }
    const windows = freeWindows(entries, this.settings.operationalWindow);
    if (!rangeInsideFreeWindow(startTime, endTime, windows)) {
      throw new HttpError(
        422,
        'NOT_WITHIN_FREE_WINDOW',
        'The requested range must lie fully inside one free window',
      );
    }

    const reservation = this.repository.createReservation({
      venueId: venue.room_code,
      studentId,
      date,
      startTime,
      endTime,
      purpose,
      approverRole: this.settings.approverRole,
    });
    if (!reservation) {
      throw new HttpError(409, 'SLOT_CONFLICT', 'The requested slot is no longer available');
    }
    return { data: reservationResponse(reservation) };
  }

}
