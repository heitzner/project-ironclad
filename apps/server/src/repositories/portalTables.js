// Maps each persisted collection of the portal state to its PostgreSQL table.
//
// Column spec: [stateKey, column, type, fallback]
//   type: text (default) | int | bool | json | date | ts | manila | epoch
//     ts     -> ISO 8601 UTC with milliseconds (Date#toISOString format)
//     manila -> ISO 8601 with +08:00 offset (format used by posts)
//     epoch  -> integer seconds
//   fallback: value written when the state field is undefined
// Fields not listed are kept losslessly in the table's `extra` jsonb column.

const col = (key, column = key, type = 'text', fallback) => ({ key, column, type, fallback })

export const tables = [
  {
    key: 'accounts', table: 'accounts', pk: 'id', order: 'asc', extra: true,
    columns: [
      col('id'), col('studentId', 'student_id'), col('passwordHash', 'password_hash'), col('name'),
      col('role'), col('position', 'position', 'text', ''), col('course'), col('yearLevel', 'year_level'),
      col('section'), col('email'), col('emailVerified', 'email_verified', 'bool', false),
      col('status', 'status', 'text', 'active'), col('disabled', 'disabled', 'bool', false),
      col('createdAt', 'created_at', 'ts'),
    ],
  },
  {
    key: 'members', table: 'memberships', pk: 'account_id', map: true, order: 'asc', extra: true,
    columns: [
      col('role'), col('position', 'position', 'text', ''), col('scope', 'scope', 'text', ''), col('course'),
    ],
  },
  {
    key: 'profiles', table: 'profiles', pk: 'account_id', map: true, order: 'asc', extra: true,
    columns: [
      col('version', 'version', 'int', 0), col('displayName', 'display_name'), col('avatarUrl', 'avatar_url'),
      col('email'), col('emailVerified', 'email_verified', 'bool'), col('updatedAt', 'updated_at', 'ts'),
      col('corrections', 'corrections', 'json', []),
    ],
  },
  {
    key: 'rooms', table: 'rooms', pk: 'id', order: 'asc', extra: true,
    columns: [
      col('id'), col('floor', 'floor', 'int'), col('name'), col('capacity', 'capacity', 'int'), col('location'),
      col('equipment', 'equipment', 'json', []), col('icon'), col('selectedIcon', 'selected_icon'),
      col('reservable', 'reservable', 'bool', true),
    ],
    // `blocked` is null or { label, reason }; stored as two nullable columns.
    toRow: room => ({ blocked_label: room.blocked?.label ?? null, blocked_reason: room.blocked?.reason ?? null }),
    fromRow: (room, row) => { room.blocked = row.blocked_label || row.blocked_reason ? { label: row.blocked_label, reason: row.blocked_reason } : null },
    customColumns: ['blocked_label', 'blocked_reason'],
    customKeys: ['blocked'],
  },
  {
    key: 'timetable', table: 'room_timetable', pk: 'id', order: 'asc',
    columns: [
      col('id'), col('roomId', 'room_id'), col('start', 'start_min', 'int'), col('end', 'end_min', 'int'),
      col('type'), col('title'), col('host'),
    ],
  },
  {
    key: 'scheduleWindows', table: 'schedule_windows', pk: 'shift', stateId: 'shift', order: 'asc',
    columns: [col('shift'), col('start', 'start_min', 'int'), col('end', 'end_min', 'int')],
  },
  {
    key: 'closures', table: 'room_closures', pk: 'id', order: 'asc', extra: true,
    columns: [
      col('id'), col('roomId', 'room_id'), col('startDate', 'start_date', 'date'), col('endDate', 'end_date', 'date'),
      col('start', 'start_min', 'int'), col('end', 'end_min', 'int'), col('reason'), col('mode'),
      col('createdBy', 'created_by'), col('createdAt', 'created_at', 'ts'),
    ],
  },
  {
    key: 'posts', table: 'posts', pk: 'id', order: 'desc', extra: true,
    columns: [
      col('id'), col('kind'), col('title'), col('description'), col('startsAt', 'starts_at', 'manila'),
      col('endsAt', 'ends_at', 'manila'), col('venue'), col('organizer'), col('capacity', 'capacity', 'int'),
      col('status', 'status', 'text', 'published'), col('createdBy', 'created_by'), col('createdAt', 'created_at', 'ts'),
      col('imageKey', 'image_key'), col('registrationKind', 'registration_kind'), col('teamSize', 'team_size', 'int'),
      col('categories', 'categories', 'json'), col('program'), col('questions', 'questions', 'json'),
    ],
  },
  {
    key: 'bookings', table: 'bookings', pk: 'id', order: 'desc', extra: true,
    columns: [
      col('id'), col('roomId', 'room_id'), col('date', 'booking_date', 'date'), col('shift'),
      col('start', 'start_min', 'int'), col('end', 'end_min', 'int'), col('purpose'),
      col('requesterId', 'requester_id'), col('requesterName', 'requester_name'), col('studentId', 'student_id'),
      col('status'), col('createdAt', 'created_at', 'ts'), col('reviewedBy', 'reviewed_by'),
      col('reviewedAt', 'reviewed_at', 'ts'), col('reason'),
    ],
  },
  ...['registrations', 'applications'].map(key => ({
    key, table: key === 'registrations' ? 'event_registrations' : 'council_applications', pk: 'id', order: 'desc', extra: true,
    columns: [
      col('id'), col('postId', 'post_id'), col('title'), col('kind'), col('userId', 'user_id'), col('name'),
      col('studentId', 'student_id'), col('program'), col('details', 'details', 'json', {}), col('status'),
      col('createdAt', 'created_at', 'ts'), col('reviewedBy', 'reviewed_by'), col('reviewedAt', 'reviewed_at', 'ts'),
      col('reason'),
    ],
  })),
  {
    key: 'handovers', table: 'handovers', pk: 'id', order: 'desc', extra: true,
    columns: [
      col('id'), col('from', 'from_account'), col('to', 'to_account'), col('scope'), col('role'), col('status'),
      col('at', 'at', 'ts'), col('respondedAt', 'responded_at', 'ts'),
    ],
  },
  {
    key: 'organizationLog', table: 'organization_log', pk: 'id', order: 'desc', extra: true,
    columns: [col('id'), col('actor'), col('text'), col('scope'), col('at', 'at', 'ts')],
  },
  {
    key: 'identityCorrections', table: 'identity_corrections', pk: 'id', order: 'asc', extra: true,
    columns: [
      col('id'), col('userId', 'user_id'), col('field'), col('value'), col('reason'),
      col('status', 'status', 'text', 'pending'), col('at', 'at', 'ts'),
    ],
  },
  {
    key: 'archive', table: 'archive_records', pk: 'id', order: 'asc', extra: true,
    columns: [
      col('id'), col('title'), col('courseSection', 'course_section'), col('category'), col('organizer'),
      col('concludedDate', 'concluded_date', 'date'), col('academicYear', 'academic_year'), col('semester'),
      col('venue', 'venue', 'json'), col('permitNo', 'permit_no'), col('startTime', 'start_time'),
      col('endTime', 'end_time'), col('hasAsset', 'has_asset', 'bool', false),
    ],
  },
]

// Scalar state fields kept in app_meta.
export const metaKeys = ['version', 'revision', 'datasetLabel']

// State fields computed on every read instead of stored.
export const derivedKeys = ['dateOptions', 'scheduleEntries']

const selectExpression = ({ column, type }) => {
  if (type === 'ts') return `to_char(${column} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as ${column}`
  if (type === 'manila') return `to_char(${column} at time zone 'Asia/Manila', 'YYYY-MM-DD"T"HH24:MI:SS"+08:00"') as ${column}`
  if (type === 'date') return `${column}::text as ${column}`
  if (type === 'epoch') return `${column}::float8 as ${column}`
  return column
}

export function selectSql(spec) {
  const columns = spec.columns.map(selectExpression)
  if (spec.map) columns.unshift(spec.pk)
  if (spec.customColumns) columns.push(...spec.customColumns)
  if (spec.extra) columns.push('extra')
  return `select ${columns.join(', ')} from public.${spec.table} order by seq ${spec.order}`
}

export function fromRow(spec, row) {
  const record = {}
  for (const { key, column } of spec.columns) if (row[column] !== null && row[column] !== undefined) record[key] = row[column]
  spec.fromRow?.(record, row)
  if (spec.extra && row.extra) Object.assign(record, row.extra)
  return record
}

export function upsertStatement(spec, record, mapKey) {
  const names = [], values = [], casts = []
  const add = (column, value, type) => {
    names.push(column)
    values.push(value === undefined ? null : type === 'json' ? JSON.stringify(value) : value)
    casts.push(type === 'json' ? '::jsonb' : '')
  }
  if (spec.map) add(spec.pk, mapKey)
  for (const { key, column, type, fallback } of spec.columns) add(column, record[key] === undefined ? fallback : record[key], type)
  if (spec.toRow) for (const [column, value] of Object.entries(spec.toRow(record))) add(column, value)
  if (spec.extra) {
    const known = new Set([...spec.columns.map(item => item.key), ...(spec.customKeys || [])])
    add('extra', Object.fromEntries(Object.entries(record).filter(([field, value]) => !known.has(field) && value !== undefined)), 'json')
  }
  const placeholders = values.map((_, index) => `$${index + 1}${casts[index]}`)
  const updates = names.filter(name => name !== spec.pk).map(name => `${name} = excluded.${name}`)
  return {
    text: `insert into public.${spec.table} (${names.join(', ')}) values (${placeholders.join(', ')}) `
      + `on conflict (${spec.pk}) do update set ${updates.join(', ')}`,
    values,
  }
}

export function deleteStatement(spec, id) {
  return { text: `delete from public.${spec.table} where ${spec.pk} = $1`, values: [id] }
}
