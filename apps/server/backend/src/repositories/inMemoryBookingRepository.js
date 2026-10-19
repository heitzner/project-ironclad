const clone = (value) => structuredClone(value)

export class InMemoryBookingRepository {
  constructor(data) {
    this.venues = data.venues.map(clone)
    this.entries = data.entries.map(clone)
    this.dates = [...data.dates]
    this.students = data.students.map(clone)
    this.notices = data.notices.map(clone)
    this.reservations = []
    this.sequence = 0
  }

  listVenues() { return this.venues.map(clone) }
  findVenue(roomCode) { return clone(this.venues.find((venue) => venue.room_code === roomCode) ?? null) }
  listDates() { return [...this.dates] }
  findStudent(studentId) { return clone(this.students.find((student) => student.student_id === studentId) ?? null) }
  listNotices() { return this.notices.map(clone) }

  listEntries(roomCode, date) {
    const scheduled = this.entries.filter((entry) => entry.venue_id === roomCode && entry.date === date)
    const pending = this.reservations
      .filter((reservation) => reservation.room_code === roomCode && reservation.date === date && reservation.status === 'pending')
      .map((reservation) => ({
        venue_id: reservation.room_code,
        date: reservation.date,
        start_time: reservation.start_time,
        end_time: reservation.end_time,
        title: reservation.purpose,
        entry_type: 'reserved',
        instructor_name: null,
        state: 'reserved',
        locked_by: reservation.student_id,
        reservation_id: reservation.reservation_id,
        is_demo: true,
        dataset_label: 'Demo week',
      }))
    return [...scheduled, ...pending].map(clone)
  }

  createReservation(values) {
    const reservation = {
      reservation_id: `DEMO-${values.date.replaceAll('-', '')}-${String(++this.sequence).padStart(4, '0')}`,
      room_code: values.roomCode,
      date: values.date,
      start_time: values.startTime,
      end_time: values.endTime,
      purpose: values.purpose,
      student_id: values.studentId,
      status: 'pending',
      approver_role: 'MIS Administrator',
      created_at: new Date().toISOString(),
      is_demo: true,
      dataset_label: 'Demo week',
    }
    this.reservations.push(reservation)
    return clone(reservation)
  }
}
