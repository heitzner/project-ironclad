import { apiRequest } from './api.js'

const queryString = (values) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') params.set(key, String(value))
  }
  return params.toString()
}

export const getBookingSetup = async ({ signal } = {}) => {
  const [dates, reservationConfig, notices] = await Promise.all([
    apiRequest('/dates/options', { signal }),
    apiRequest('/reservations/config', { signal }),
    apiRequest('/booking/notices', { signal }),
  ])
  return {
    dates: dates.data.map((option) => option.date),
    defaultDate: dates.meta.default_date,
    datasetLabel: dates.meta.dataset_label,
    requester: reservationConfig.data.requester,
    approvalNotice: reservationConfig.data.approval_notice,
    notice: notices.data[0] ?? null,
  }
}

export const getVenues = ({ date, period, floor, q, signal }) => apiRequest(
  `/venues?${queryString({ date, period, floor, q })}`,
  { signal },
)

export const getVenueDetails = ({ roomCode, date, period, signal }) => apiRequest(
  `/venues/${encodeURIComponent(roomCode)}?${queryString({ date, period })}`,
  { signal },
)

export const requestReservation = ({ roomId, date, start, end, purpose, requesterId }) => apiRequest('/reservations/lock', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    room_code: `Room ${roomId}`,
    date,
    start_time: `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`,
    end_time: `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`,
    purpose,
    student_id: requesterId,
  }),
}).then((response) => ({
  id: response.data.reservation_id,
  status: response.data.status,
}))
