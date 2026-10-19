import { useState } from 'react'
import { Plus, Megaphone } from 'lucide-react'
import ProgressBar from '../../components/common/ProgressBar.jsx'
import AdminShell from '../../components/admin/AdminShell.jsx'
import AdminState from '../../components/admin/AdminState.jsx'
import EventForm from '../../components/admin/EventForm.jsx'
import CompleteEventDialog from '../../components/admin/CompleteEventDialog.jsx'
import AdminDialog from '../../components/admin/AdminDialog.jsx'
import { displayDate, isAdmin } from '../../components/admin/admin.logic.js'

export default function EventManagement({
  events,
  venues,
  loading,
  error,
  onRetry,
  onSaveEvent,
  onCompleteEvent,
  onCheckStatus,
  ...shell
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [editing, setEditing] = useState(null)
  const [completing, setCompleting] = useState(null)
  const [details, setDetails] = useState(null)
  const categories = [
    ...new Set((events ?? []).map((event) => event.category).filter(Boolean)),
  ].sort()
  const filtered = events?.filter(
    (event) =>
      (!category || event.category === category) &&
      `${event.title ?? ''} ${event.description ?? ''}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  )
  const canEdit = !shell.preview && isAdmin(shell.user) && !loading && !error
  return (
    <AdminShell {...shell} section="events" title="Campus Events">
      <section
        className="flex flex-wrap items-center gap-3 rounded-panel bg-white p-4"
        aria-label="Event search and actions"
      >
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Megaphone aria-hidden="true" className="h-4 w-4 text-dark" />
            Feed &amp; Announcements
          </h2>
          <p className="mt-1 text-[11px] text-textSecondary">
            Campus activities and event campaigns.
          </p>
        </div>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search events</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="admin-field"
            placeholder="Search events…"
          />
        </label>
        <label>
          <span className="sr-only">Event category</span>
          <select
            className="admin-field"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <button type="button" className="admin-button" disabled={!canEdit} onClick={() => setEditing({})}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add/Create Event
        </button>
      </section>
      {(!onSaveEvent || !onCompleteEvent) && <p className="text-xs leading-6 text-textSecondary">Event changes are available when the corresponding save and completion actions are connected.</p>}
      {(query || category) && <button type="button" className="admin-secondary self-start" onClick={() => { setQuery(''); setCategory('') }}>Clear event filters</button>}
      <section className="min-h-96 rounded-panel bg-pageBg p-3" aria-label="Campus events">
        {loading || error || !events || !filtered.length ? (
          <AdminState
            loading={loading}
            error={error}
            connected={Boolean(events)}
            empty={!filtered?.length}
            onRetry={onRetry}
            label="events"
          />
        ) : (
          <div className="grid gap-4">
            {filtered.map((event) => (
              <article
                key={event.id}
                className="overflow-hidden rounded-panel bg-white shadow-card"
              >
                {event.bannerUrl && (
                  <img
                    src={event.bannerUrl}
                    alt={event.title}
                    className="aspect-4/1 w-full object-cover"
                  />
                )}
                <div className="grid gap-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-cardBg px-3 py-1 text-[10px] font-semibold uppercase text-dark">
                      {event.status}
                    </span>
                    {event.category && (
                      <span className="text-xs text-textSecondary">{event.category}</span>
                    )}
                  </div>
                  <h2 className="text-base font-semibold">{event.title}</h2>
                  <p className="whitespace-pre-line text-xs leading-6 text-textSecondary">
                    {event.description}
                  </p>
                  <p className="text-[11px] leading-6 text-textSecondary">
                    {displayDate(event.startsAt)} – {displayDate(event.endsAt)}
                  </p>
                  {Number.isFinite(event.registered) &&
                    Number.isFinite(event.capacity) &&
                    event.capacity > 0 && (
                      <div>
                        <p className="mb-2 text-[10px] font-semibold">
                          Participant slots: {event.registered}/{event.capacity}
                        </p>
                        <ProgressBar value={(event.registered / event.capacity) * 100} />
                      </div>
                    )}
                  <div className="flex flex-wrap justify-between gap-2">
                    <button
                      type="button"
                      className="admin-secondary"
                      onClick={() => setDetails(event)}
                    >
                      View Venue Details
                    </button>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="admin-secondary"
                        onClick={() => setEditing(event)}
                        disabled={!canEdit || !onSaveEvent}
                      >
                        Edit event
                      </button>
                      <button
                        type="button"
                        className="admin-button"
                        onClick={() => setCompleting(event)}
                        disabled={!canEdit || !onCompleteEvent || event.status === 'completed'}
                      >
                        Mark as Complete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {editing && (
        <EventForm
          event={editing.id ? editing : undefined}
          venues={venues}
          user={canEdit ? shell.user : null}
          preview={shell.preview}
          onSave={onSaveEvent}
          onRefresh={onRetry}
          onCheckStatus={onCheckStatus}
          onClose={() => setEditing(null)}
        />
      )}
      {completing && (
        <CompleteEventDialog
          event={completing}
          user={canEdit ? shell.user : null}
          onComplete={onCompleteEvent}
          onRefresh={onRetry}
          onCheckStatus={onCheckStatus}
          onClose={() => setCompleting(null)}
        />
      )}
      {details && (
        <AdminDialog title="Event venue" onClose={() => setDetails(null)}>
          <p className="text-sm">
            {venues?.find((venue) => venue.id === details.venueId)?.name ||
              details.venueName ||
              'Venue details are not connected.'}
          </p>
          <p className="mt-3 text-xs leading-6 text-textSecondary">
            {displayDate(details.startsAt)} – {displayDate(details.endsAt)}
          </p>
        </AdminDialog>
      )}
    </AdminShell>
  )
}
