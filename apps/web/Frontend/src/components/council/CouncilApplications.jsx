import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import CouncilButton from './CouncilButton.jsx'
import CouncilDialog from './CouncilDialog.jsx'
import CouncilViewState from './CouncilViewState.jsx'
import ApplicationReviewToolbar from './ApplicationReviewToolbar.jsx'
import ApplicationReviewTable from './ApplicationReviewTable.jsx'
import ApplicationOutcomeDialog from './ApplicationOutcomeDialog.jsx'
import { createReviewActions, reviewErrorMessage, validateReviewData } from './councilReview.model.js'
import breadcrumb from './assets/9fa02.svg'
import pending from './assets/61eb9.svg'
import information from './assets/7e034.svg'

export default function CouncilApplications(props) {
  return <ReviewSession key={JSON.stringify([props.auth.status, props.auth.user, props.auth.capabilities])} {...props} />
}

function ReviewSession({ auth, resource, service, criteria, dispatch }) {
  const actions = useMemo(() => createReviewActions({ service, userId: auth.user?.id,
    canReview: auth.capabilities.canReviewApplications, canExport: auth.capabilities.canExportApplications }), [service, auth.user?.id, auth.capabilities.canReviewApplications, auth.capabilities.canExportApplications])
  const state = useSyncExternalStore(actions.subscribe, actions.getSnapshot, actions.getSnapshot)
  useEffect(() => actions.cancel, [actions])
  const inputRef = useRef(null), errorRef = useRef(null), pageFocusRef = useRef(null)
  const lastPageRef = useRef(criteria.page)
  const [policyOpen, setPolicyOpen] = useState(false)
  const protectedState = auth.status !== 'authenticated' ? auth.status
    : ['signed-out', 'forbidden'].includes(resource.status) ? resource.status
    : resource.error?.status === 401 || state.error?.status === 401 ? 'signed-out'
      : auth.capabilities.canReviewApplications !== true || resource.error?.status === 403 || state.error?.status === 403 ? 'forbidden' : null
  let data = null, invalid = false
  if (!protectedState && resource.data) {
    try { data = validateReviewData(resource.data, criteria) } catch { invalid = true }
  }
  const viewState = protectedState || (invalid ? 'error' : resource.loading ? 'loading'
    : resource.error ? (resource.error.unavailable ? 'unavailable' : 'error')
      : !data ? 'unavailable' : data.applications.length === 0 ? (criteria.query.trim() || criteria.program || criteria.status ? 'no-results' : 'empty') : null)
  const staleReason = resource.loading ? 'Please wait for the latest applications.'
    : resource.error || invalid || !data ? 'Reload the latest applications before making a decision.' : undefined
  const guardedDispatch = (event) => { if (!actions.getSnapshot().busy) dispatch(event) }
  const clear = () => { guardedDispatch({ type: 'clear' }); inputRef.current?.focus() }
  const refresh = async () => validateReviewData(await resource.refetch?.(), criteria)
  const decide = async (application, decision) => {
    if (staleReason) return
    const result = await actions.decide(application, decision, refresh)
    if (!result && actions.getSnapshot().error) errorRef.current?.focus()
  }
  const close = () => actions.dismiss()
  useEffect(() => {
    if (!resource.loading && data && criteria.page !== lastPageRef.current) {
      lastPageRef.current = criteria.page
      pageFocusRef.current?.focus()
    }
  }, [resource.loading, criteria.page, data])

  return <div className="flex min-w-0 flex-col gap-4 wrap-anywhere">
    <header className="flex min-w-0 flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 break-words">
        <p className="mb-1 flex items-center gap-1.5 text-[10px] font-medium leading-[14px] tracking-[0.5px] text-dark">Portal<img src={breadcrumb} alt="" /><span>Membership applications</span></p>
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.7px]">Membership Applications</h1>
        <p className="mt-1 text-[12px] leading-[18px] text-textSecondary">Review student applications for Council membership.</p>
      </div>
      {data && <div className="flex min-w-0 items-center gap-2.5 rounded-panel bg-ring/40 px-3 py-2 shadow-card">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-dark"><img src={pending} alt="" /></span>
        <p className="min-w-0 break-words text-[10px] leading-[14px] text-textSecondary">Pending:<strong className="block text-[16px] leading-6 text-dark">{data.pendingTotal} students</strong></p>
      </div>}
    </header>
    {!protectedState && <ApplicationReviewToolbar criteria={criteria} filters={data?.filters} dispatch={guardedDispatch} inputRef={inputRef} disabled={state.busy}
      onExport={() => { if (!staleReason) void actions.export(criteria, data?.export) }} exporting={state.exporting}
      exportReason={staleReason || actions.exportReason(data?.export)} />}
    {viewState && <CouncilViewState state={viewState} title={viewState === 'empty' ? 'No membership applications yet' : undefined}
      description={invalid ? 'Application records, filters or pagination are incomplete. Reload before reviewing.' : viewState === 'empty' ? 'Applications will appear here when they are submitted.' : undefined}
      onRetry={state.busy ? undefined : resource.refetch} onClear={clear} />}
    {!protectedState && viewState === 'error' && criteria.page > 1 && <CouncilButton variant="secondary" disabled={state.busy} onClick={() => guardedDispatch({ type: 'page', value: 1 })}>Return to first page</CouncilButton>}
    {!protectedState && <>
      {state.busy && <p role="status" className="text-[13px] leading-5 text-textSecondary">{state.exporting ? 'Preparing the supported export…' : state.checking ? 'Reloading application status…' : `Saving the ${state.target?.decision} decision for ${state.target?.name}… Please wait.`}</p>}
      {state.error && <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-panel border border-red-700 bg-white p-4 text-[13px] leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark">
        <p>{state.operation === 'export' ? 'The export could not be prepared. Please retry when the connection is available.' : state.operation === 'check' ? 'The latest application status could not be reloaded. Unconfirmed decisions remain blocked; please retry the status check.' : `${state.target?.name}: ${reviewErrorMessage(state.error)}`}</p>
        {state.requiresCheck.includes(state.target?.id) && <CouncilButton size="compact" variant="secondary" busy={state.busy} onClick={() => actions.checkStatus(refresh)}>Reload application status</CouncilButton>}
      </div>}
      {state.checkMessage && <p role="status" className="rounded-panel bg-cardBg p-4 text-[13px] leading-5 text-textSecondary">{state.checkMessage}</p>}
      {data && <ApplicationReviewTable data={data} criteria={criteria} dispatch={guardedDispatch} actions={actions} state={state} loading={resource.loading} staleReason={staleReason} onDecision={decide} onCheck={(id) => actions.checkStatus(refresh, id)} pageFocusRef={pageFocusRef} />}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-control bg-selectBg p-3 text-[12px] leading-[18px] text-textSecondary">
        <p className="flex min-w-0 items-center gap-2"><img src={information} alt="" />{data?.policy ? data.policy.title : 'Retention policy information has not been supplied.'}</p>
        {data?.policy && <CouncilButton size="compact" variant="quiet" disabled={state.busy} onClick={() => setPolicyOpen(true)}>View policy</CouncilButton>}
      </div>
      {state.outcome && <ApplicationOutcomeDialog outcome={state.outcome} busy={state.busy} refreshError={state.refreshError} onClose={close} restoreFocusRef={inputRef} />}
      {state.download && <ExportDialog download={state.download} onClose={close} restoreFocusRef={inputRef} />}
      {data?.policy && <CouncilDialog open={policyOpen} title={data.policy.title} onClose={() => setPolicyOpen(false)} restoreFocusRef={inputRef}><p className="whitespace-pre-wrap break-words text-[13px] leading-5 text-textSecondary">{data.policy.summary}</p><CouncilButton onClick={() => setPolicyOpen(false)} className="mt-4">Return to applications</CouncilButton></CouncilDialog>}
    </>}
  </div>
}

function ExportDialog({ download, onClose, restoreFocusRef }) {
  const linkRef = useRef(null)
  useEffect(() => {
    const url = URL.createObjectURL(download.blob)
    linkRef.current.href = url
    return () => URL.revokeObjectURL(url)
  }, [download])
  return <CouncilDialog open title="Application export ready" description={download.scopeLabel} onClose={onClose} restoreFocusRef={restoreFocusRef} initialFocusRef={linkRef}>
    <p role="status" className="break-words text-[13px] leading-5 text-textSecondary">The export service returned {download.filename}.</p>
    <a ref={linkRef} tabIndex={0} download={download.filename} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-control bg-dark px-4 py-2 text-[13px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark focus-visible:ring-offset-2">Download export</a>
  </CouncilDialog>
}
