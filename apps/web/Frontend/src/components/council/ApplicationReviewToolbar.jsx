import { useId } from 'react'
import CouncilButton from './CouncilButton.jsx'
import search from './assets/a0360.svg'
import clear from './assets/5f95f.svg'
import chevron from './assets/5f629.svg'
import exportIcon from './assets/44d03.svg'

export default function ApplicationReviewToolbar({ criteria, filters, dispatch, inputRef, disabled, onExport, exportReason, exporting }) {
  const id = useId()
  return <div className="flex min-w-0 flex-wrap items-start gap-1 rounded-panel bg-white p-2 shadow-card">
    <div className="relative min-w-0 basis-full sm:min-w-[240px] sm:flex-1">
      <label htmlFor={`${id}-search`} className="sr-only">Search membership applications</label>
      <img src={search} alt="" className="pointer-events-none absolute left-3 top-[15px]" />
      <input ref={inputRef} id={`${id}-search`} type="search" value={criteria.query} disabled={disabled} onChange={(event) => dispatch({ type: 'query', value: event.target.value })}
        placeholder="Search applicant name or application…" className="min-h-11 w-full min-w-0 rounded-control border border-textMuted bg-selectBg py-2.5 pl-9 pr-12 text-[13px] text-textPrimary shadow-inner placeholder:text-textSecondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark disabled:opacity-60" />
      {criteria.query && <button type="button" disabled={disabled} onClick={() => { dispatch({ type: 'query', value: '' }); inputRef.current?.focus() }} aria-label="Clear applicant search" className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark"><img src={clear} alt="" /></button>}
    </div>
    {[['program', 'Program', 'All programs', filters?.programs], ['status', 'Application status', 'All statuses', filters?.statuses]].map(([key, label, all, options]) => <div key={key} className="relative min-w-0 basis-full sm:basis-auto sm:flex-1">
      <label htmlFor={`${id}-${key}`} className="sr-only">{label}</label>
      <select id={`${id}-${key}`} value={criteria[key]} disabled={disabled || !filters} onChange={(event) => dispatch({ type: key, value: event.target.value })}
        className="min-h-11 w-full min-w-0 max-w-full appearance-none rounded-control border border-textMuted bg-selectBg py-2.5 pl-3 pr-8 text-[13px] text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark disabled:opacity-60">
        <option value="">{all}</option>
        {criteria[key] && !options?.some(({ id }) => id === criteria[key]) && <option value={criteria[key]}>Selected filter (clear to reset)</option>}
        {options?.map(({ id, label: optionLabel }) => <option key={id} value={id}>{optionLabel}</option>)}
      </select>
      <img src={chevron} alt="" className="pointer-events-none absolute right-3 top-[19px]" />
    </div>)}
    <div className="min-w-0 basis-full sm:basis-auto sm:max-w-[240px]"><CouncilButton variant="venue" busy={exporting} busyLabel="Preparing export…" disabled={disabled} disabledReason={exportReason} onClick={onExport}><img src={exportIcon} alt="" />Batch Export</CouncilButton></div>
  </div>
}
