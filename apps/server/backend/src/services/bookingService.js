import { currentEntry, deriveStatus, freeWindows, isBusy, overlaps, timeToMinutes, utilizationPercent } from '../domain/booking.js'
import { HttpError } from '../http/errors.js'

const searchable = (venue) => [venue.room_code, venue.name, venue.location_label, ...venue.equipment].join(' ').toLocaleLowerCase()

export class BookingService {
  constructor(repository, settings) {
    this.repository = repository
    this.settings = settings
  }

  assertKnownDate(date) {
    if (!this.repository.listDates().includes(date)) {
      throw new HttpError(422, 'DATE_UNAVAILABLE', 'Choose a date from the Demo week options.')
    }
  }

  availableWindows(entries, date, segments) {
    let availableSegments = segments
    const currentDate = this.settings.demoNow.slice(0, 10)
    if (date === currentDate) {
      const currentMinute = timeToMinutes(this.settings.demoNow.slice(11, 16))
      const earliest = Math.ceil((currentMinute + 1) / 15) * 15
      availableSegments = segments
        .map((segment) => ({ ...segment, start: timeToMinutes(segment.start) < earliest ? `${String(Math.floor(earliest / 60)).padStart(2, '0')}:${String(earliest % 60).padStart(2, '0')}` : segment.start }))
        .filter((segment) => timeToMinutes(segment.start) < timeToMinutes(segment.end))
    }
    if (date < currentDate) return []
    return freeWindows(entries, availableSegments)
  }

  snapshot(venue, date, period) {
    const entries = this.repository.listEntries(venue.room_code, date)
    const segments = this.settings.periods[period]
    const status = deriveStatus(venue, entries, segments)
    const windows = venue.is_details_available ? this.availableWindows(entries, date, segments) : []
    return {
      room_code: venue.room_code,
      name: venue.name,
      floor: venue.floor,
      location_label: venue.location_label,
      capacity: venue.capacity,
      equipment: venue.equipment,
      utilization_percent: utilizationPercent(venue, entries, segments),
      status: status.status,
      status_label: status.status_label,
      status_override: venue.status_override,
      is_details_available: venue.is_details_available,
      next_free_window: windows[0] ?? null,
      is_demo: venue.is_demo,
      dataset_label: venue.dataset_label,
    }
  }

  listVenues({ date, period, floor, q }) {
    this.assertKnownDate(date)
    const all = this.repository.listVenues()
    const searched = q ? all.filter((venue) => searchable(venue).includes(q.toLocaleLowerCase())) : all
    const floorCounts = {
      all_venues: searched.filter((venue) => venue.floor <= 3).length,
      floor_1: searched.filter((venue) => venue.floor === 1).length,
      floor_2: searched.filter((venue) => venue.floor === 2).length,
      floor_3: searched.filter((venue) => venue.floor === 3).length,
      floor_4: searched.filter((venue) => venue.floor === 4).length,
    }
    const filtered = floor
      ? searched.filter((venue) => venue.floor === floor)
      : searched.filter((venue) => venue.floor <= 3)
    const data = filtered.map((venue) => this.snapshot(venue, date, period))
    const summary = { available: 0, occupied: 0, unavailable: 0 }
    for (const venue of data) summary[venue.status] += 1
    return {
      data,
      meta: {
        date,
        period,
        total_count: data.length,
        summary,
        floor_counts: floorCounts,
        floor_unavailable_notice: all.some((venue) => venue.floor === 4 && !venue.is_details_available),
        dataset_label: 'Demo week',
        period_windows: this.settings.periods[period],
      },
    }
  }

  getVenue(roomCode, { date, period }) {
    this.assertKnownDate(date)
    const venue = this.repository.findVenue(roomCode)
    if (!venue) throw new HttpError(404, 'VENUE_NOT_FOUND', 'Venue does not exist.')
    const entries = this.repository.listEntries(roomCode, date)
    const segments = this.settings.periods[period]
    const currentTime = this.settings.demoNow.slice(11, 16)
    const active = date === this.settings.demoNow.slice(0, 10) ? currentEntry(entries, currentTime) : null
    return {
      data: {
        ...this.snapshot(venue, date, period),
        timetable: venue.is_details_available ? entries.filter((entry) => segments.some((segment) => overlaps(entry, segment.start, segment.end))) : [],
        free_windows: venue.is_details_available ? this.availableWindows(entries, date, segments) : [],
        current_occupancy: active,
      },
      meta: { date, period, period_windows: segments, current_time: currentTime, time_zone: this.settings.timeZone },
    }
  }

  getDateOptions() {
    const currentDate = this.settings.demoNow.slice(0, 10)
    return { data: this.repository.listDates().filter((date) => date >= currentDate).map((date) => ({ date, dataset_label: 'Demo week' })), meta: { dataset_label: 'Demo week', default_date: currentDate } }
  }

  getNotices() {
    return { data: this.repository.listNotices(), meta: { dataset_label: 'Demo week' } }
  }

  getReservationConfig({ studentId }) {
    const student = this.repository.findStudent(studentId)
    if (!student) throw new HttpError(404, 'STUDENT_NOT_FOUND', 'Student does not exist.')
    return {
      data: {
        requester: {
          id: student.student_id,
          name: student.full_name,
          studentId: student.student_id,
          program: student.program_section,
        },
        approval_notice: 'Final approval is required from the MIS Administrator before the venue is officially locked.',
        purpose_max_length: this.settings.purposeMaxLength,
        minimum_slot_minutes: this.settings.minimumSlotMinutes,
        is_demo: true,
        dataset_label: 'Demo week',
      },
    }
  }

  requestLock(values) {
    this.assertKnownDate(values.date)
    const venue = this.repository.findVenue(values.roomCode)
    if (!venue) throw new HttpError(404, 'VENUE_NOT_FOUND', 'Venue does not exist.')
    if (venue.status_override || !venue.is_details_available) throw new HttpError(422, 'VENUE_UNAVAILABLE', 'Venue is unavailable.')
    if (!this.repository.findStudent(values.studentId)) throw new HttpError(404, 'STUDENT_NOT_FOUND', 'Student does not exist.')

    const entries = this.repository.listEntries(values.roomCode, values.date)
    const currentDate = this.settings.demoNow.slice(0, 10)
    if (values.date < currentDate || (values.date === currentDate && timeToMinutes(values.startTime) <= timeToMinutes(this.settings.demoNow.slice(11, 16)))) {
      throw new HttpError(422, 'TIME_PASSED', 'The selected time has already passed.')
    }
    if (entries.some((entry) => isBusy(entry) && overlaps(entry, values.startTime, values.endTime))) {
      throw new HttpError(409, 'SLOT_CONFLICT', 'The selected time is already occupied or locked.')
    }
    const allWindows = this.availableWindows(entries, values.date, this.settings.periods.all_day)
    const start = timeToMinutes(values.startTime)
    const end = timeToMinutes(values.endTime)
    const insideWindow = allWindows.some((window) => timeToMinutes(window.start_time) <= start && end <= timeToMinutes(window.end_time))
    if (!insideWindow) throw new HttpError(422, 'NOT_WITHIN_FREE_WINDOW', 'The requested time must be inside one available window.')
    if (end - start < this.settings.minimumSlotMinutes) throw new HttpError(422, 'SLOT_TOO_SHORT', `Reservations must be at least ${this.settings.minimumSlotMinutes} minutes.`)

    return { data: this.repository.createReservation(values) }
  }
}
