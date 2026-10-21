import { useState } from 'react'
import BookingIcon from '../../features/student-booking/BookingIcon'
import { formatTime } from '../../features/student-booking/booking.logic'

function Availability({ view }) {
  if (view.room.blocked) return view.room.blocked.label
  const next = view.windows[0]
  if (!next) return 'No future free window'
  return view.active ? `Next Free Slot: ${formatTime(next.start)}` : `Free ${formatTime(next.start)} – ${formatTime(next.end)}`
}

function Utilization({ view, compact = false, selected = false }) {
  return <div className={`booking-utilization ${compact ? 'compact' : ''} ${view.status === 'occupied' && !selected ? 'is-occupied' : ''}`}>
    <div><span>{compact ? `${view.utilization}%` : 'Utilization'}</span><strong>{compact ? view.label : `${view.utilization}% Allocated`}</strong></div>
    <meter min="0" max="100" value={view.utilization} aria-label={`Room ${view.room.id} schedule utilization`}>{view.utilization}%</meter>
    {!compact && <div className="booking-window"><span>{view.operatingWindow ? formatTime(view.operatingWindow.start) : '—'}</span><b><Availability view={view} /></b><span>{view.operatingWindow ? formatTime(view.operatingWindow.end) : '—'}</span></div>}
  </div>
}

function Badge({ view, selected = false }) {
  return <span className={`booking-badge ${selected ? 'selected' : view.status}`}>{selected ? <><BookingIcon name="fc23e" />Selected Venue</> : view.label}</span>
}

export default function VenueCatalog({ views, total, floors = [1, 2, 3], draft, selectedId, busy, onChange, onSelect }) {
  const [filterOpen, setFilterOpen] = useState(false)
  return <section className="booking-catalog" aria-label="Browse venues">
    <div className="booking-filter-strip">
      <div className="booking-floors" role="group" aria-label="Filter by floor">
        <button type="button" aria-pressed={draft.floor === 'all'} disabled={busy} onClick={() => onChange({ floor: 'all' })}><span>All Venues</span><small>({total})</small></button>
        {[1, 2, 3, 4].map(floor => <button type="button" key={floor} aria-pressed={draft.floor === String(floor)} disabled={busy || !floors.includes(floor)} onClick={() => onChange({ floor: String(floor) })}><span>Floor {floor}</span><small>({floor}01–{floor}04)</small></button>)}
      </div>
      <div className="booking-search-tools">
        <label className="booking-search"><span className="booking-sr-only">Search rooms, facilities, locations or equipment</span><BookingIcon name="89ed7" /><input type="search" value={draft.search} disabled={busy} placeholder="Search room, equipment..." onChange={event => onChange({ search: event.target.value })} /></label>
        <button className="booking-filter-toggle" type="button" aria-label="Filter by availability" aria-expanded={filterOpen} aria-controls="booking-status-filter" disabled={busy} onClick={() => setFilterOpen(open => !open)}><BookingIcon name="b0b59" />{draft.statusFilter !== 'all' && <i />}</button>
      </div>
      {filterOpen && <label className="booking-status-filter" id="booking-status-filter">Availability<select value={draft.statusFilter} disabled={busy} onChange={event => onChange({ statusFilter: event.target.value })}>
        {[['all', 'All statuses'], ['available', 'Available now / free window'], ['occupied', 'In session'], ['reserved', 'Reserved'], ['unavailable', 'Unavailable']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>}
    </div>
    <div className="booking-catalog-meta"><span role="status">{views.length} {views.length === 1 ? 'venue' : 'venues'} shown{draft.statusFilter !== 'all' && ' · availability filter active'}</span>{!floors.includes(4) && <span id="booking-floor4-note">Floor 4 details unavailable</span>}</div>
    {!views.length ? <div className="booking-no-results"><h2>No venues found</h2><p>Try another room name, floor, or availability filter.</p><button type="button" disabled={busy} onClick={() => onChange({ search: '', statusFilter: 'all' })}>Clear search &amp; status filter</button></div>
      : draft.floor === 'all' ? <div className="booking-table-scroll" role="region" aria-label="Venue catalog table, scroll for more rooms" tabIndex="0"><table className="booking-table"><caption className="booking-sr-only">Venues for the selected date and shift</caption><thead><tr><th scope="col">Room</th><th scope="col">Facility details</th><th scope="col">Capacity</th><th scope="col">Utilization</th><th scope="col">Status</th></tr></thead><tbody>
        {views.map(view => <tr key={view.room.id} tabIndex={busy ? -1 : 0} aria-label={`Toggle Room ${view.room.id}`} className={`ic-row-target ${selectedId === view.room.id ? 'is-selected' : ''}`} onClick={() => { if (!busy) onSelect(view.room.id) }} onKeyDown={event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); if (!busy) onSelect(view.room.id) } }}>
          <th scope="row"><button type="button" className="booking-room-button" aria-label={`Select Room ${view.room.id}, ${view.room.name}`} aria-pressed={selectedId === view.room.id} disabled={busy} onClick={event => { event.stopPropagation(); onSelect(view.room.id) }}>{selectedId === view.room.id && <BookingIcon name="deaf7" />}Room {view.room.id}</button></th>
          <td><div className="booking-facility-name">{view.room.name}{selectedId === view.room.id && <span className="booking-table-selected">Selected Venue</span>}</div><div className="booking-location"><BookingIcon name={selectedId === view.room.id ? '65e75' : 'b4a92'} />{view.room.location}</div></td>
          <td>{view.room.capacity} Seats</td><td><Utilization view={view} compact selected={selectedId === view.room.id} /></td><td><Badge view={view} /></td>
        </tr>)}
      </tbody></table></div> : <div className="booking-card-grid">
        {views.map(view => { const selected = selectedId === view.room.id; return <article key={view.room.id} className={`booking-room-card relative ${selected ? 'is-selected' : ''}`} aria-label={`Room ${view.room.id}`}><button type="button" aria-label={`Toggle Room ${view.room.id}`} aria-pressed={selected} disabled={busy} onClick={() => onSelect(view.room.id)} className="ic-room-target" />
          <div className="booking-card-heading"><div><h2>Room {view.room.id}</h2><Badge view={view} selected={selected} /></div><BookingIcon name={selected ? view.room.selectedIcon : view.room.icon} /></div>
          <h3>{view.room.name}</h3><p className="booking-capacity">{view.room.capacity} Seats</p><Utilization view={view} selected={selected} />
          <div className="booking-card-footer"><span className="booking-location"><BookingIcon name={selected ? 'e08cb' : '25f66'} />{view.room.location}</span><span className="text-xs font-semibold">{selected ? 'Click again to deselect' : 'Select Venue'}</span></div>
        </article> })}
      </div>}
  </section>
}
