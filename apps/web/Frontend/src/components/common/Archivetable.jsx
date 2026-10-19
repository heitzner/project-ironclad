import { useState } from 'react'
import {
  Building2,
  CalendarCheck,
  Cpu,
  DoorOpen,
  Download,
  Flame,
  LayoutGrid,
  Video,
} from 'lucide-react'
import Pagination from './Pagination.jsx'

const venueIconMap = {
  room: DoorOpen,
  lab: Cpu,
  studio: Video,
  hall: Building2,
  auditorium: LayoutGrid,
  court: Flame,
}

function formatDate(isoString) {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d)
  } catch {
    return isoString
  }
}

export function ArchiveTable({
  items = [],
  total = 0,
  page = 1,
  pageSize = 6,
  onPageChange,
  loading = false,
}) {
  const [downloadingId, setDownloadingId] = useState(null)
  const [downloadSuccess, setDownloadSuccess] = useState(null)

  // Purely client-side mock download
  const handleDownload = (item) => {
    if (!item?.hasAsset) return
    setDownloadingId(item.id)
    setDownloadSuccess(null)

    setTimeout(() => {
      // Simulate client-side blob download
      const content = `IronClad Institutional Vault Record\nTitle: ${item.title}\nPermit: ${item.permitNo || 'N/A'}\nOrganizer: ${item.organizer}\nDate: ${item.concludedDate}`
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${item.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-record.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setDownloadingId(null)
      setDownloadSuccess(`Asset for "${item.title}" successfully downloaded.`)
      setTimeout(() => setDownloadSuccess(null), 3000)
    }, 400)
  }

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  const totalPages = Math.ceil(total / pageSize) || 1

  return (
    <div className="flex flex-col">
      {downloadSuccess && (
        <div role="status" className="mb-3 rounded-lg bg-cardBg border border-soft p-3 text-[12px] font-semibold text-deep">
          {downloadSuccess}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl shadow-card bg-white border border-track/40">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="bg-dark text-white text-[12px] font-semibold uppercase tracking-[0.8px]">
              <th scope="col" className="px-5 py-3.5">
                Concluded Date
              </th>
              <th scope="col" className="px-5 py-3.5">
                Archived Event & Campaign
              </th>
              <th scope="col" className="px-5 py-3.5">
                Reserved Venue
              </th>
              <th scope="col" className="px-5 py-3.5">
                Course / Section
              </th>
              <th scope="col" className="px-5 py-3.5 text-right">
                Vault Artifacts
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: pageSize }).map((_, idx) => (
                <tr
                  key={`skeleton-${idx}`}
                  className={`animate-pulse ${idx % 2 === 0 ? 'bg-white' : 'bg-cardBg'}`}
                >
                  <td className="px-5 py-4">
                    <div className="h-4 w-28 rounded bg-surfaceGray" />
                    <div className="mt-1 h-3 w-20 rounded bg-surfaceGray" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 w-48 rounded bg-surfaceGray" />
                    <div className="mt-1 h-3 w-36 rounded bg-surfaceGray" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-7 w-28 rounded-lg bg-surfaceGray" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 w-16 rounded bg-surfaceGray" />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="ml-auto h-8 w-28 rounded-lg bg-surfaceGray" />
                  </td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[13px] font-medium text-textSecondary">
                  No archived records match your filters.
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const isEven = index % 2 === 1
                const rowBg = isEven ? 'bg-cardBg' : 'bg-white'
                const VenueIcon = (item.venue?.type && venueIconMap[item.venue.type]) || Building2

                let categoryToneClass = 'bg-surfaceGray text-textSecondary'
                if (item.categoryTone === 'green') {
                  categoryToneClass = 'bg-cardBg text-deep font-semibold'
                } else if (item.categoryTone === 'red') {
                  categoryToneClass = 'bg-error-soft text-error font-semibold'
                }

                const isDownloading = downloadingId === item.id

                return (
                  <tr
                    key={item.id}
                    className={`${rowBg} transition-colors duration-150 border-b border-track/20 last:border-b-0`}
                  >
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-start gap-2">
                        <CalendarCheck className="h-4 w-4 text-dark shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                          <p className="text-[14px] font-semibold text-textPrimary leading-tight">
                            {formatDate(item.concludedDate)}
                          </p>
                          {(item.startTime || item.endTime) && (
                            <p className="mt-0.5 text-[11px] font-medium text-textSecondary">
                              {item.startTime} {item.endTime ? `- ${item.endTime}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[15px] font-semibold text-textPrimary leading-tight">
                          {item.title}
                        </span>
                        {item.category && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] leading-4 ${categoryToneClass}`}
                          >
                            {item.category}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[12px] text-textSecondary">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-textMuted" aria-hidden="true" />
                        <span>
                          Organizer: <span className="font-medium">{item.organizer}</span>
                          {item.permitNo && ` • Permit #${item.permitNo}`}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 align-top">
                      <div
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold ${
                          isEven ? 'bg-white text-textPrimary' : 'bg-surfaceGray text-textPrimary'
                        }`}
                      >
                        <VenueIcon className="h-3.5 w-3.5 text-dark shrink-0" aria-hidden="true" />
                        <span>{item.venue?.label || item.venue || 'Campus Venue'}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center gap-2 pt-1">
                        <span className="h-2 w-2 rounded-full bg-dark shrink-0" aria-hidden="true" />
                        <span className="text-[13px] font-semibold text-textPrimary">
                          {item.courseSection}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 align-top text-right">
                      <button
                        type="button"
                        onClick={() => handleDownload(item)}
                        disabled={!item.hasAsset || isDownloading}
                        aria-label={`Download Asset for ${item.title}`}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40 ${
                          !isEven
                            ? 'bg-dark text-white hover:bg-deep'
                            : 'bg-soft/40 text-deep hover:bg-soft/60'
                        }`}
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{isDownloading ? 'Downloading...' : 'Download Asset'}</span>
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-selectBg/40 px-5 py-3.5 border-t border-track/40">
          <p className="text-[12px] text-textSecondary">
            Showing <span className="font-bold text-textPrimary">{start}</span> -{' '}
            <span className="font-bold text-textPrimary">{end}</span> of{' '}
            <span className="font-bold text-textPrimary">{total}</span> archived records
          </p>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      </div>
    </div>
  )
}

export default ArchiveTable
