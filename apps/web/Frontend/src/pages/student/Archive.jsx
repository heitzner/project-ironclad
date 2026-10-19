import { useState } from 'react'
import {
  Archive as ArchiveIcon,
  CalendarDays,
  ChevronDown,
  Download,
  Info,
  Search,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import ArchiveTable from '../../components/common/Archivetable.jsx'
import Breadcrumb from '../../components/common/Breadcrumb.jsx'
import PageLayout from '../../components/common/PageLayout.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import ViewState from '../../components/common/ViewState.jsx'
import { resourceState } from '../../hooks/resourceState.js'
import useArchive from '../../hooks/useArchive.js'

export function Archive() {
  const archive = useArchive()
  const [search, setSearch] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [semester, setSemester] = useState('')
  const [venueId, setVenueId] = useState('')
  const [page, setPage] = useState(1)
  const [exportMessage, setExportMessage] = useState(null)

  // Records, filter options and summary all come from the archive response
  const records = archive.data?.records ?? []
  const academicYears = archive.data?.filters?.academicYears ?? []
  const semesters = archive.data?.filters?.semesters ?? []
  const venues = archive.data?.filters?.venues ?? []
  const summary = archive.data?.summary
  const viewState = resourceState(archive, records.length === 0)

  // Client-side filtering of the loaded records
  const filteredRecords = records.filter((item) => {
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.organizer.toLowerCase().includes(search.toLowerCase()) ||
      item.courseSection.toLowerCase().includes(search.toLowerCase()) ||
      (item.permitNo && item.permitNo.toLowerCase().includes(search.toLowerCase()))

    const matchesVenue = !venueId || item.venue?.label?.includes(venueId) || item.venue?.type === venueId
    return matchesSearch && matchesVenue
  })

  // Simulated client-side batch export download
  const handleBatchExport = () => {
    setExportMessage('Generating and exporting archive records...')
    setTimeout(() => {
      const csvContent =
        'Date,Title,Category,Venue,Course/Section,Permit,Organizer\n' +
        filteredRecords
          .map(
            (r) =>
              `"${r.concludedDate}","${r.title}","${r.category}","${r.venue.label}","${r.courseSection}","${r.permitNo}","${r.organizer}"`
          )
          .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ucc-archive-records-export.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setExportMessage(null)
    }, 600)
  }

  return (
    <PageLayout role="student">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-2">
        <Breadcrumb
          items={[
            { label: 'Portal', to: '/' },
            { label: 'Events Archive Records' },
          ]}
          separator="chevron"
        />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-1">
          <div className="max-w-[700px]">
            <h1 className="text-[28px] lg:text-[30px] font-bold tracking-tight text-textPrimary leading-tight">
              Old Events History & Archive Records
            </h1>
            <p className="mt-1 text-[12px] leading-5 text-textSecondary">
              Official institutional registry of concluded campus venue bookings, academic symposiums, and compliance-sealed campaign asset distribution records.
            </p>
          </div>

          {summary && (
            <div className="flex items-center gap-3 shrink-0">
              <StatCard
                variant="green"
                icon={ArchiveIcon}
                label="Total Archived"
                value={`${summary.totalArchived} Events`}
              />

              <StatCard
                variant="gray"
                icon={CalendarDays}
                label="Coverage"
                value={summary.coverageLabel}
              />
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <section
        aria-label="Archive filter bar"
        className="rounded-xl bg-white p-2 shadow-card border border-track/30"
      >
        <div className="flex flex-col md:flex-row items-center gap-2">
          {/* Search Input */}
          <div className="flex min-w-0 flex-1 items-center rounded-control bg-pageBg px-3 py-1.5 w-full">
            <Search aria-hidden="true" className="mr-2 h-4 w-4 shrink-0 text-textSecondary" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search archived event, campaign name, course, or permit"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] text-textPrimary placeholder:text-textMuted focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="ml-2 flex h-4 w-4 items-center justify-center rounded-full text-textMuted hover:text-textPrimary"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Academic Year Select */}
          <div className="relative h-9 w-full md:w-44 shrink-0">
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              aria-label="Filter by Academic Year"
              className="h-full w-full appearance-none rounded-control bg-selectBg py-1.5 pl-3 pr-8 text-[11px] font-semibold tracking-[0.44px] text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="">All Academic Years</option>
              {academicYears.map((ay) => (
                <option key={ay} value={ay}>
                  {ay}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-textSecondary" />
          </div>

          {/* Semesters Select */}
          <div className="relative h-9 w-full md:w-36 shrink-0">
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              aria-label="Filter by Semester"
              className="h-full w-full appearance-none rounded-control bg-selectBg py-1.5 pl-3 pr-8 text-[11px] font-semibold tracking-[0.44px] text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="">All Semesters</option>
              {semesters.map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-textSecondary" />
          </div>

          {/* Venues Select */}
          <div className="relative h-9 w-full md:w-44 shrink-0">
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              aria-label="Filter by Venue or Room"
              className="h-full w-full appearance-none rounded-control bg-selectBg py-1.5 pl-3 pr-8 text-[11px] font-semibold tracking-[0.44px] text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="">All Venues</option>
              {venues.map((v) => (
                <option key={v.id || v.label} value={v.id || v.label}>
                  {v.label}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-textSecondary" />
          </div>

          {/* Batch Export Button */}
          <button
            type="button"
            onClick={handleBatchExport}
            className="flex h-9 w-full md:w-auto shrink-0 items-center justify-center gap-1.5 rounded-control bg-soft px-4 text-[12px] font-semibold text-deep shadow-sm transition-colors duration-150 hover:bg-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Batch Export</span>
          </button>
        </div>
      </section>

      {exportMessage && (
        <div role="status" className="rounded-lg bg-cardBg border border-soft p-3 text-[12px] font-semibold text-deep">
          {exportMessage}
        </div>
      )}

      {/* Archive Table */}
      {viewState ? (
        <ViewState
          state={viewState}
          description={viewState === 'empty' ? 'No archived events yet.' : undefined}
          onRetry={archive.refetch}
        />
      ) : (
        <ArchiveTable
          items={filteredRecords}
          total={filteredRecords.length}
          page={page}
          pageSize={6}
          onPageChange={setPage}
          loading={archive.loading}
        />
      )}

      {/* Info Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-xl bg-selectBg/60 p-3 text-[12px] text-textSecondary border border-track/40">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-dark" aria-hidden="true" />
          <span>
            Events past 180 days are migrated to offline institutional cold storage. Submit form SIS-04 for physical cassette retrieval.
          </span>
        </div>
        <Link
          to="/support"
          className="shrink-0 font-semibold text-primary transition-colors duration-150 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          Storage Governance Policy
        </Link>
      </div>
    </PageLayout>
  )
}

export default Archive
