// Frontend checks support, but never replace, server authorization and locking.
export function isAdmin(user) {
  return Boolean(user?.id && user.role === 'admin' && user.disabled !== true && (user.status == null || ['active', 'approved'].includes(user.status)))
}

export function validateEvent(values, now = new Date()) {
  if (!values.title?.trim()) return 'Enter an event title.'
  if (values.title.trim().length > 120) return 'Use at most 120 characters for the title.'
  if (!values.description?.trim()) return 'Enter an event description.'
  if (values.description.trim().length > 2000) return 'Use at most 2,000 characters for the description.'
  if (!values.venueId) return 'Select a venue.'
  const start = Date.parse(values.startsAt)
  const end = Date.parse(values.endsAt)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'Enter a valid start and end date.'
  if (end <= start) return 'End time must be after start time.'
  if (start <= now.getTime()) return 'Choose a future start time.'
  return ''
}

export function validateDecision(booking, decision, reason, bookings = [], now = new Date()) {
  if (!booking?.id || booking.status !== 'pending') return 'Only pending requests can be reviewed.'
  if (!['approved', 'denied'].includes(decision)) return 'Choose Approve or Deny.'
  if (decision === 'denied') return reason?.trim() ? '' : 'Give a reason for denying this request.'
  const start = Date.parse(booking.startsAt)
  const end = Date.parse(booking.endsAt)
  if (!booking.roomId || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 'The requested venue or time window is invalid.'
  if (start <= now.getTime()) return 'This booking starts in the past. Refresh the requests.'
  const conflict = bookings.some(item => item.id !== booking.id && item.roomId === booking.roomId && item.status === 'approved' && start < Date.parse(item.endsAt) && end > Date.parse(item.startsAt))
  return conflict ? 'An approved booking already overlaps this time window.' : ''
}

export function validateRoleChange(actor, member, roleId, roles) {
  if (!isAdmin(actor)) return 'Only administrators can change roles.'
  if (!member?.id) return 'Select a member.'
  if (String(actor.id) === String(member.id)) return 'You cannot change your own role here.'
  if (member.role === 'admin') return 'Administrator accounts cannot be changed through council role management.'
  if (!['student', 'council'].includes(member.role)) return 'This account is not eligible for council role management.'
  if (member.disabled || !['active', 'approved'].includes(member.status)) return 'Only active, approved accounts can receive roles.'
  if (roleId && !roles.some(role => String(role.id) === String(roleId) && role.scope === 'council')) return 'Choose a council role from the available roles.'
  if (String(member.councilRoleId ?? '') === String(roleId ?? '')) return 'Choose a different role or remove the current assignment.'
  return ''
}

export function displayDate(value) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return 'Not provided'
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(date)
}
