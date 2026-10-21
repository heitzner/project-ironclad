import { CalendarDays, MapPin, Megaphone, Pin } from 'lucide-react'
import { formatNewsDate, newsFeedImages } from './newsFeedPresentation.js'

function NewsFeedCard({ post, onOpen }) {
  const image = newsFeedImages[post.image_key]

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card bg-white shadow-card ring-1 ring-track/70">
      {image ? (
        <img src={image} alt="" className="h-44 w-full object-cover" />
      ) : (
        <div className="flex h-32 items-center justify-center bg-cardBg text-primary" aria-hidden="true">
          <Megaphone className="h-10 w-10" />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-chip bg-cardBg px-2 py-1 text-[11px] font-semibold text-deep">
            {post.category_label}
          </span>
          {post.pinned && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-textMuted">
              <Pin aria-hidden="true" className="h-3 w-3" /> Pinned
            </span>
          )}
        </div>

        <div>
          <h2 className="text-[17px] font-semibold leading-6 text-textPrimary">{post.title}</h2>
          <p className="mt-2 text-[13px] leading-5 text-textSecondary">{post.excerpt}</p>
        </div>

        <dl className="mt-auto grid gap-1.5 text-[11px] leading-4 text-textMuted">
          <div className="flex items-center gap-2">
            <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-dark" />
            <dt className="sr-only">Published</dt>
            <dd>{formatNewsDate(post.published_at)}</dd>
          </div>
          {post.location_label && (
            <div className="flex items-center gap-2">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-dark" />
              <dt className="sr-only">Location</dt>
              <dd>{post.location_label}</dd>
            </div>
          )}
        </dl>

        <div className="flex items-center justify-between gap-3 border-t border-track pt-3">
          <p className="truncate text-[11px] font-medium text-textSecondary">{post.author_name}</p>
          <button
            type="button"
            onClick={() => onOpen(post.post_id)}
            className="shrink-0 rounded-control bg-primary px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Read full post
          </button>
        </div>
      </div>
    </article>
  )
}

export default NewsFeedCard
