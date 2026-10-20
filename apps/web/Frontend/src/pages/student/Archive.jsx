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
import { useStudent } from '../../components/student/student.context.js'
import { filterArchive } from '../../components/student/student.model.js'
import useStudentDownload from '../../components/student/useStudentDownload.js'

export function Archive() {
  const student = useStudent()
  const archive = useArchive({ service: student.service })
  return <ArchiveContent resource={archive} />
}

export function ArchiveContent({ resource: archive }) {
  const { service } = useStudent()
  const [search, setSearch] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [semester, setSemester] = useState('')
  const [venueId, setVenueId] = useState('')
  const [page, setPage] = useState(1)
  const exportAction = useStudentDownload(service.exportArchive)

  // Records, filter options and summary all come from the archive response
  const records = archive.data?.records ?? []
  const academicYears = archive.data?.filters?.academicYears ?? []
  const semesters = archive.data?.filters?.semesters ?? []
  const venues = archive.data?.filters?.venues ?? []
  const summary = archive.data?.summary
  const viewState = resourceState(archive, records.length === 0)

  // The adapter supplies a complete scoped snapshot; all displayed filters apply together.
  const criteria = { search, academicYear, semester, venueId }
  const filteredRecords = filterArchive(records, criteria)

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
              Browse concluded campus events, venue bookings, and available archive records.
            </p>
          </div>

          {!viewState && summary && (
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
              aria-label="Search archive records"
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
                onClick={() => { setSearch(''); setPage(1) }}
                aria-label="Clear search"
                className="ml-2 flex h-11 w-11 items-center justify-center rounded-full text-textMuted hover:text-textPrimary"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Academic Year Select */}
          <div className="relative h-11 w-full md:w-44 shrink-0">
            <select
              value={academicYear}
              onChange={(e) => { setAcademicYear(e.target.value); setPage(1) }}
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
          <div className="relative h-11 w-full md:w-36 shrink-0">
            <select
              value={semester}
              onChange={(e) => { setSemester(e.target.value); setPage(1) }}
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
          <div className="relative h-11 w-full md:w-44 shrink-0">
            <select
              value={venueId}
              onChange={(e) => { setVenueId(e.target.value); setPage(1) }}
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
            onClick={() => exportAction.run(criteria)}
            disabled={Boolean(viewState) || !filteredRecords.length || !service.supports('exportArchive') || exportAction.busy}
            className="flex h-11 w-full md:w-auto shrink-0 items-center justify-center gap-1.5 rounded-control bg-soft px-4 text-[12px] font-semibold text-deep shadow-sm transition-colors duration-150 hover:bg-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{exportAction.busy ? 'Exporting…' : 'Batch Export'}</span>
          </button>
        </div>
      </section>

      {exportAction.error && (
        <div role="alert" className="rounded-lg bg-cardBg border border-soft p-3 text-[12px] font-semibold text-deep">
          {exportAction.error}
        </div>
      )}
      {!service.supports('exportArchive') && <p className="text-xs text-textSecondary">Archive export is not connected yet.</p>}

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
            {archive.data?.policy || 'Campus archive storage policy has not been supplied yet.'}
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
