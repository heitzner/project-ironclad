import PageLayout from '../../components/common/PageLayout.jsx'
import BookingConnectionState from '../../components/student/BookingConnectionState.jsx'
import { useBookingSetup } from '../../hooks/useBookingSetup.js'
import { requestReservation } from '../../services/booking.js'
import BookingPage from './BookingPage.jsx'

export default function Booking() {
  const { data, loading, error, refetch } = useBookingSetup()

  return (
    <PageLayout role="student" fullWidth>
      {!data && <BookingConnectionState loading={loading} error={error} onRetry={refetch} />}
      {data && <BookingPage {...data} onRequest={requestReservation} />}
    </PageLayout>
  )
}
