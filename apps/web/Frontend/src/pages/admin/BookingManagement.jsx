import { useState } from 'react'
import { LayoutGrid, List, Search } from 'lucide-react'
import ProgressBar from '../../components/common/ProgressBar.jsx'
import AdminShell from '../../components/admin/AdminShell.jsx'
import AdminState from '../../components/admin/AdminState.jsx'
import AdminTable from '../../components/admin/AdminTable.jsx'
import BookingRequests from '../../components/admin/BookingRequests.jsx'
import RoomDetails from '../../components/admin/RoomDetails.jsx'

export default function BookingManagement({
  rooms,
  bookings,
  loading = false,
  error,
  onRetry,
  onDecision,
  ...shell
}) {
  const [query, setQuery] = useState('')
  const [floor, setFloor] = useState('')
  const [occupancy, setOccupancy] = useState('')
  const [decision, setDecision] = useState('')
  const [grid, setGrid] = useState(false)
  const [selected, setSelected] = useState(null)
  const floors = [
    ...new Set((rooms ?? []).map((room) => room.floor).filter((value) => value != null)),
  ].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))
  const filteredRooms = rooms?.filter(
    (room) =>
      (!floor || String(room.floor) === floor) &&
      (!occupancy || room.occupancy === occupancy) &&
      `${room.number ?? ''} ${room.name ?? ''} ${room.location ?? ''}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  )
  const roomIds = new Set(filteredRooms?.map((room) => room.id))
  const filteredBookings = bookings?.filter(
    (booking) =>
      (!decision || booking.status === decision) && (!rooms || roomIds.has(booking.roomId)),
  )
  const showEmpty = !filteredRooms?.length
  return (
    <AdminShell {...shell} section="bookings" title="Room Bookings">
      <section className="grid gap-3 rounded-panel bg-white p-3" aria-label="Room filters">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={!floor ? 'admin-button' : 'admin-secondary'}
            aria-pressed={!floor}
            onClick={() => setFloor('')}
          >
            All Venues{rooms ? ` (${rooms.length})` : ''}
          </button>
          {floors.map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={floor === String(value)}
              className={floor === String(value) ? 'admin-button' : 'admin-secondary'}
              onClick={() => setFloor(String(value))}
            >
              Floor {value}
            </button>
          ))}
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search rooms</span>
            <Search aria-hidden="true" className="absolute left-3 top-3.5 h-4 w-4 text-textMuted" />
            <input
              type="search"
              className="admin-field pl-9"
              placeholder="Search room or facility…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="admin-icon-button"
            aria-label={grid ? 'Show room list' : 'Show room cards'}
            onClick={() => setGrid((value) => !value)}
          >
            {grid ? <List className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="admin-label">
            Occupancy
            <select
              className="admin-field"
              value={occupancy}
              onChange={(event) => setOccupancy(event.target.value)}
            >
              <option value="">All occupancy states</option>
              <option value="occupied">Occupied</option>
              <option value="pending">Pending</option>
              <option value="empty">Empty</option>
            </select>
          </label>
          <label className="admin-label">
            Booking decision
            <select
              className="admin-field"
              value={decision}
              onChange={(event) => setDecision(event.target.value)}
            >
              <option value="">All decisions</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
            </select>
          </label>
        </div>
      </section>
      <section className="rounded-panel bg-white" aria-label="Room availability">
        {loading || error || !rooms || showEmpty ? (
          <AdminState
            loading={loading}
            error={error}
            connected={Boolean(rooms)}
            empty={showEmpty}
            onRetry={onRetry}
            label="rooms"
          />
        ) : grid ? (
          <div className="grid gap-3 p-3 lg:grid-cols-2">
            {filteredRooms.map((room) => (
              <article key={room.id} className="rounded-panel border border-track p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <h2 className="text-sm font-semibold">Room {room.number || room.id}</h2>
                  <span className="rounded-full bg-cardBg px-2 py-1 text-[10px] capitalize text-dark">
                    {room.occupancy || 'Unknown'}
                  </span>
                </div>
                <p className="mt-2 text-xs">{room.name}</p>
                <p className="mt-2 text-xs text-textMuted">
                  {room.capacity ?? 'Unspecified'} seats ·{' '}
                  {room.location || 'Location not provided'}
                </p>
                <button
                  type="button"
                  className="admin-secondary mt-4"
                  onClick={() => setSelected(room)}
                >
                  View schedule
                </button>
              </article>
            ))}
          </div>
        ) : (
          <AdminTable
            label="Room availability"
            columns={['Room', 'Facility details', 'Capacity', 'Utilization', 'Status']}
          >
            {filteredRooms.map((room) => (
              <tr key={room.id} className="even:bg-cardBg/40">
                <td className="admin-cell">
                  <button
                    type="button"
                    className="rounded-control text-left font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => setSelected(room)}
                  >
                    Room {room.number || room.id}
                  </button>
                </td>
                <td className="admin-cell">
                  <p className="font-semibold">{room.name}</p>
                  <p className="mt-1 text-[10px] text-textMuted">
                    {room.location || 'Location not provided'}
                  </p>
                </td>
                <td className="admin-cell">{room.capacity ?? '—'}</td>
                <td className="admin-cell">
                  {Number.isFinite(room.utilization) ? (
                    <div className="min-w-20">
                      <p className="mb-2">{Math.min(100, Math.max(0, room.utilization))}%</p>
                      <ProgressBar value={room.utilization} />
                    </div>
                  ) : (
                    'Not provided'
                  )}
                </td>
                <td className="admin-cell">
                  <span className="rounded-full bg-cardBg px-3 py-1 text-[10px] capitalize text-dark">
                    {room.occupancy || 'Unknown'}
                  </span>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </section>
      <BookingRequests
        bookings={filteredBookings}
        allBookings={bookings}
        user={shell.user}
        preview={shell.preview}
        onDecision={onDecision}
        loading={loading}
        error={error}
        onRetry={onRetry}
      />
      {selected && (
        <RoomDetails room={selected} bookings={bookings} onClose={() => setSelected(null)} />
      )}
    </AdminShell>
  )
}
