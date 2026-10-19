import CouncilButton from './CouncilButton.jsx'
import { formatApplicationDate } from './councilReview.model.js'
import calendar from './assets/c4d3f.svg'
import accept from './assets/135bc.png'
import reject from './assets/d7967.svg'
import previous from './assets/1f1c7.svg'
import next from './assets/fa469.svg'

export default function ApplicationReviewTable({ data, criteria, dispatch, actions, state, loading = false, staleReason, onDecision, onCheck, pageFocusRef }) {
  const { pagination } = data
  const start = data.applications.length ? (pagination.page - 1) * pagination.pageSize + 1 : 0
  const end = data.applications.length ? start + data.applications.length - 1 : 0
  // Failed refreshes still block stale decisions, but only active reads/mutations are busy.
  return <section aria-label="Membership application results" aria-busy={state.busy || loading || undefined} className="min-w-0 overflow-hidden rounded-panel bg-white wrap-anywhere shadow-nav">
    <div tabIndex={0} role="region" aria-label="Membership applications table, scroll horizontally for all columns" className="max-w-full overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dark">
      <table className="w-full min-w-[920px] table-fixed border-collapse text-left">
        <caption className="sr-only">Membership applications with submitted dates, applicants, program and section, current status, and review actions.</caption>
        <colgroup><col className="w-[18%]" /><col className="w-[34%]" /><col className="w-[20%]" /><col className="w-[28%]" /></colgroup>
        <thead className="bg-dark text-[13px] uppercase leading-[18px] tracking-[0.65px] text-white"><tr>
          {['Submitted date', 'Name', 'Program / section', 'Review'].map((label) => <th key={label} scope="col" className="px-5 py-[14px] font-semibold last:text-right">{label}</th>)}
        </tr></thead>
        <tbody>{data.applications.map((application) => <tr key={application.id} className="odd:bg-white even:bg-cardBg">
          <td className="px-5 py-5 align-middle text-[13px] font-medium leading-[22px]"><span className="flex items-center gap-2"><img src={calendar} alt="" /><time dateTime={application.submittedAt}>{formatApplicationDate(application.submittedAt, application.timeZone)}</time></span></td>
          <th scope="row" className="break-words px-5 py-5 align-middle font-semibold"><span className="text-[16px] leading-6">{application.applicant.name}</span><span className="mt-1 block text-[12px] font-normal leading-[18px] text-textSecondary">Application: {application.id}</span></th>
          <td className="break-words px-5 py-5 align-middle text-[13px] font-semibold leading-[22px]"><span className="flex items-start gap-1.5"><span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-dark" aria-hidden="true" /><span>{application.applicant.program.label} {application.applicant.section}</span></span></td>
          <td className="px-5 py-5 align-middle"><div className="flex min-w-0 flex-col items-end gap-2">
            <p className="max-w-full break-words text-[12px] leading-[18px] text-textSecondary">Status: {application.status.label}</p>
            <div className="flex min-w-0 flex-wrap justify-end gap-[11px]">{['accept', 'reject'].map((decision) => <CouncilButton key={decision} variant={decision === 'reject' ? 'danger' : 'primary'} size="compact" disabled={state.busy} disabledReason={staleReason || actions.decisionReason(application, decision)}
              aria-label={`${decision === 'accept' ? 'Accept' : 'Reject'} membership application from ${application.applicant.name}, reference ${application.id}`}
              onClick={() => onDecision(application, decision)} className="px-2.5">
              <img src={decision === 'accept' ? accept : reject} alt="" className={decision === 'accept' ? 'h-[11.67px] w-[11.67px]' : undefined} />{decision === 'accept' ? 'Accept' : 'Reject'}
            </CouncilButton>)}</div>
            {state.requiresCheck.includes(application.id) && <CouncilButton variant="secondary" size="compact" disabled={state.busy} onClick={() => onCheck(application.id)} aria-label={`Reload application status for ${application.applicant.name}`}>Reload status</CouncilButton>}
          </div></td>
        </tr>)}</tbody>
      </table>
    </div>
    <footer className="flex min-w-0 flex-wrap items-center justify-between gap-3 bg-selectBg p-4 text-[12px] leading-[18px] text-textSecondary">
      <p role="status" ref={pageFocusRef} tabIndex={-1} className="min-w-0 break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark">Showing {start}–{end} of {pagination.totalItems} membership applications</p>
      <nav aria-label="Membership application pages" className="flex flex-wrap items-center gap-2">
        <CouncilButton variant="secondary" size="compact" disabled={state.busy || Boolean(staleReason) || pagination.page <= 1} onClick={() => dispatch({ type: 'page', value: criteria.page - 1 })}><img src={previous} alt="" />Previous</CouncilButton>
        <span className="rounded-control bg-dark px-3 py-2 text-white" aria-current="page">Page {pagination.page} of {pagination.totalPages}</span>
        <CouncilButton variant="secondary" size="compact" disabled={state.busy || Boolean(staleReason) || pagination.page >= pagination.totalPages} onClick={() => dispatch({ type: 'page', value: criteria.page + 1 })}>Next<img src={next} alt="" /></CouncilButton>
      </nav>
    </footer>
  </section>
}
