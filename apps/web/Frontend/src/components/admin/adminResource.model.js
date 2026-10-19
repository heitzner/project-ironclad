const textFields = ['name', 'location', 'occupancy', 'status', 'title', 'description', 'roomId', 'roomName', 'requesterName', 'requesterId', 'startsAt', 'endsAt', 'category', 'bannerUrl', 'venueId', 'venueName', 'studentId', 'role', 'section', 'councilRoleId', 'scope']
const numericFields = ['capacity', 'registered', 'utilization']

// Validate supplied component inputs without choosing endpoints or wire formats.
export function adminResource(input, fields) {
  const result = { ...input }
  let invalid = false
  for (const field of fields) {
    if (result[field] === undefined) continue
    const rows = result[field]
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row.id !== 'string' || !row.id.trim()
      || textFields.some(key => row[key] != null && typeof row[key] !== 'string')
      || ['number', 'floor'].some(key => row[key] != null && typeof row[key] !== 'string' && !Number.isFinite(row[key]))
      || numericFields.some(key => row[key] != null && (!Number.isFinite(row[key]) || row[key] < 0)))
      || new Set(rows.map(row => row.id)).size !== rows.length) {
      result[field] = undefined
      invalid = true
    }
  }
  if (result.summary != null && (typeof result.summary !== 'object' || Array.isArray(result.summary) || Object.values(result.summary).some(value => !Number.isSafeInteger(value) || value < 0))) {
    result.summary = undefined
    invalid = true
  }
  if (invalid) result.error = new Error('The supplied workspace information is incomplete. Reload before making changes.')
  return result
}
