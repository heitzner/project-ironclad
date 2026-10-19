import { useEffect, useMemo, useState } from 'react'
import PageLayout from '../../components/common/PageLayout.jsx'
import BookingPage from './BookingPage.jsx'
import { mockRooms, mockRequester, createMockSchedules, createMockRequestHandler } from '../../features/student-booking/booking.fixtures'
import { clockParts } from '../../features/student-booking/booking.logic'

const clock = () => new Date()
const mockRequest = createMockRequestHandler({ rooms: mockRooms, getSchedules: () => createMockSchedules(clock()), clock })

export default function Booking() {
  const [today, setToday] = useState(() => clockParts(clock()).date)
  useEffect(() => {
    const timer = window.setInterval(() => setToday(clockParts(clock()).date), 30000)
    return () => window.clearInterval(timer)
  }, [])
  const schedules = useMemo(() => createMockSchedules(new Date(`${today}T12:00:00+08:00`)), [today])

  // Keep the approved demo data at the route boundary, outside the shared shell.
  return (
    <PageLayout role="student" fullWidth>
      <BookingPage rooms={mockRooms} schedules={schedules} requester={mockRequester} clock={clock} onRequest={mockRequest} />
    </PageLayout>
  )
}
