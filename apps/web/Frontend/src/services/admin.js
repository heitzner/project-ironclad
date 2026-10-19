import { apiRequest, jsonOptions } from './api.js'

function bookingDateTime(date, time) {
  return `${date}T${time}:00+08:00`
}

function room(record) {
  return {
    id: record.room_code,
    number: record.room_code.replace(/^Room\s+/i, ''),
    name: record.name,
    floor: record.floor,
    location: record.location_label,
    capacity: record.capacity,
    utilization: record.utilization_percent,
    occupancy: record.status === 'available' ? 'empty' : record.status,
    statusLabel: record.status_label,
  }
}

function booking(record, rooms) {
  return {
    id: record.reservation_id,
    roomId: record.room_code,
    roomName: rooms.get(record.room_code)?.name || record.room_code,
    requesterId: record.requester?.student_id,
    requesterName: record.requester?.full_name,
    purpose: record.purpose,
    startsAt: bookingDateTime(record.date, record.start_time),
    endsAt: bookingDateTime(record.date, record.end_time),
    status: record.decision === 'rejected' ? 'denied' : record.decision,
  }
}

function event(record) {
  return {
    id: record.event_id,
    title: record.title,
    description: record.description,
    category: record.category,
    venueId: record.venue_id,
    venueName: record.venue_name,
    startsAt: record.starts_at,
    endsAt: record.ends_at,
    status: record.status,
    registered: record.registered,
    capacity: record.capacity,
    bannerUrl: record.banner_url,
    version: record.version,
  }
}

function member(record) {
  return {
    id: record.member_id,
    studentId: record.student_id,
    name: record.full_name,
    section: record.program_section,
    status: record.status,
    role: record.role,
    councilRoleId: record.council_role_id,
    disabled: record.disabled,
    version: record.version,
  }
}

export async function getAdminWorkspace() {
  const [session, venuePayload, bookingPayload, eventPayload, memberPayload, rolePayload] = await Promise.all([
    apiRequest('/admin/session'),
    apiRequest('/admin/room-bookings/venues?period=all_day'),
    apiRequest('/admin/booking-requests?limit=100'),
    apiRequest('/admin/events'),
    apiRequest('/admin/members'),
    apiRequest('/admin/council-roles'),
  ])
  const rooms = venuePayload.data.map(room)
  const roomIndex = new Map(rooms.map(item => [item.id, item]))
  return {
    session: session.data,
    rooms,
    bookings: bookingPayload.data.map(item => booking(item, roomIndex)),
    events: eventPayload.data.map(event),
    members: memberPayload.data.map(member),
    roles: rolePayload.data.map(record => ({ id: record.role_id, name: record.name, scope: record.scope })),
  }
}

export function decideBooking(bookingId, { status, reason }) {
  const action = status === 'approved' ? 'approve' : 'reject'
  return apiRequest(`/admin/booking-requests/${encodeURIComponent(bookingId)}/${action}`, jsonOptions('POST', { reason }))
}

function eventBody(values) {
  return {
    title: values.title,
    description: values.description,
    venue_id: values.venueId,
    starts_at: values.startsAt,
    ends_at: values.endsAt,
    ...(values.version ? { version: values.version } : {}),
  }
}

export function saveEvent(values) {
  return values.id
    ? apiRequest(`/admin/events/${encodeURIComponent(values.id)}`, jsonOptions('PUT', eventBody(values)))
    : apiRequest('/admin/events', jsonOptions('POST', eventBody(values)))
}

export function completeEvent(eventId, { version }) {
  return apiRequest(`/admin/events/${encodeURIComponent(eventId)}/complete`, jsonOptions('POST', { version }))
}

export function saveCouncilRole(memberId, { councilRoleId, version }) {
  return apiRequest(`/admin/members/${encodeURIComponent(memberId)}/council-role`, jsonOptions('PATCH', {
    council_role_id: councilRoleId,
    version,
  }))
}
