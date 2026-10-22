import { useEffect } from 'react'
import { CalendarDays, MapPin, X } from 'lucide-react'
import { formatNewsDate, newsFeedImages } from './newsFeedPresentation.js'

function DialogState({ title, message, action }) {
  return (
    <div className="grid min-h-56 place-items-center p-8 text-center">
      <div>
        <h2 className="text-lg font-semibold text-textPrimary">{title}</h2>
        <p className="mt-2 text-sm text-textSecondary">{message}</p>
        {action}
      </div>
    </div>
  )
}

function NewsPostDialog({ open, post, loading, error, onClose, onRetry }) {
  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null
  const image = post ? newsFeedImages[post.image_key] : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-textPrimary/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-post-title"
        className="max-h-[90svh] w-full max-w-2xl overflow-y-auto rounded-card bg-white shadow-nav"
      >
        <div className="sticky top-0 z-10 flex justify-end bg-white/95 p-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close post"
            className="flex h-10 w-10 items-center justify-center rounded-control text-textSecondary hover:bg-pageBg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        {loading && <DialogState title="Loading post" message="Fetching the latest details from the news feed service." />}
        {!loading && error && (
          <DialogState
            title="Unable to load this post"
            message={error.message}
            action={(
              <button type="button" onClick={onRetry} className="mt-4 rounded-control bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-dark">
                Retry
              </button>
            )}
          />
        )}
        {!loading && !error && post && (
          <article>
            {image && <img src={image} alt="" className="max-h-72 w-full object-cover" />}
            <div className="grid gap-4 p-6 sm:p-8">
              <span className="w-fit rounded-chip bg-cardBg px-2 py-1 text-[11px] font-semibold text-deep">{post.category_label}</span>
              <div>
                <h2 id="news-post-title" className="text-2xl font-bold leading-8 text-textPrimary">{post.title}</h2>
                <p className="mt-2 text-xs text-textMuted">Published by {post.author_name} · {formatNewsDate(post.published_at)}</p>
              </div>
              <p className="text-sm leading-7 text-textSecondary">{post.content}</p>
              {(post.event_start || post.location_label) && (
                <dl className="grid gap-2 rounded-panel bg-pageBg p-4 text-sm text-textSecondary">
                  {post.event_start && (
                    <div className="flex items-start gap-2">
                      <CalendarDays aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-dark" />
                      <dt className="sr-only">Event schedule</dt>
                      <dd>{formatNewsDate(post.event_start)}{post.event_end ? ` – ${formatNewsDate(post.event_end)}` : ''}</dd>
                    </div>
                  )}
                  {post.location_label && (
                    <div className="flex items-start gap-2">
                      <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-dark" />
                      <dt className="sr-only">Location</dt>
                      <dd>{post.location_label}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </article>
        )}
      </section>
    </div>
  )
}

export default NewsPostDialog
