import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import CouncilButton from './CouncilButton.jsx'
import CouncilViewState from './CouncilViewState.jsx'
import CouncilApplicationQuestions from './CouncilApplicationQuestions.jsx'
import { applicationErrorMessage, createApplicationDraft, normalizeApplicationData } from './councilApplication.model.js'
import submitIcon from './assets/24e77.svg'

export default function CouncilApplication(props) {
  return <ApplicationSession key={JSON.stringify([props.auth.status, props.auth.user, props.auth.capabilities.canApply === true])} {...props} />
}

function ApplicationSession({ auth, resource, service, onClose, active = true, onBusyChange, closeGuardRef }) {
  const [received, setReceived] = useState(null)
  let data, invalid = false
  const protectedState = auth.status !== 'authenticated' ? auth.status
    : resource.error?.status === 401 ? 'signed-out' : resource.error?.status === 403 || auth.capabilities.canApply !== true ? 'forbidden' : null
  if (!protectedState && resource.data) {
    try { data = normalizeApplicationData(resource.data, auth.user) } catch { invalid = true }
  }
  const state = protectedState || (invalid ? 'error' : resource.loading ? 'loading' : resource.error ? (resource.error.unavailable ? 'unavailable' : 'error') : !data ? 'loading' : null)
  const receipt = !protectedState && (data?.application || (received?.service === service ? received.outcome : null))
  return <div className="flex min-w-0 flex-col gap-4 wrap-anywhere">
    {state && <CouncilViewState state={state} onRetry={resource.refetch} description={invalid ? 'The application form does not match the signed-in applicant, or its requirements are incomplete. Reload the form before applying.' : undefined} />}
    {receipt && <ApplicationReceipt outcome={receipt} onClose={onClose} active={active} refreshError={received?.refreshError} />}
    {data && !invalid && !receipt && <>
      <ApplicantIdentity user={data.user} />
      {data.form ? <ApplicationEditor
          key={JSON.stringify([data.user, data.form])} scope={JSON.stringify({ user: data.user, form: data.form })}
          service={service} canApply={auth.capabilities.canApply} active={active} onBusyChange={onBusyChange} closeGuardRef={closeGuardRef}
          staleReason={state ? 'Reload the latest application form before submitting. Your answers are kept.' : undefined}
          refetch={resource.refetch} onClose={onClose}
          onReceived={(outcome, refreshError = false) => setReceived({ outcome, refreshError, service })}
        /> : <CouncilViewState state="empty" title="No application form available" description="There is no open application form for your program." />}
    </>}
    {!data && !receipt && onClose && <CouncilButton variant="quiet" size="compact" onClick={onClose}>Cancel</CouncilButton>}
  </div>
}

function ApplicantIdentity({ user }) {
  return <dl className="grid min-w-0 grid-cols-1 gap-[10px] sm:grid-cols-[3fr_2fr]">
    {[['Name', user.name], ['Program and section', `${user.program.label} ${user.section}`]].map(([label, value]) => <div key={label} className="min-w-0">
      <dt className="mb-1 text-[10px] font-bold uppercase leading-[14px] tracking-[0.5px]">{label}</dt>
      <dd className="min-h-[38px] break-words rounded-control border border-textMuted/20 bg-white px-[13px] py-[9px] text-[13px] leading-5 shadow-card">{value}</dd>
    </div>)}
  </dl>
}

function ApplicationReceipt({ outcome, onClose, refreshError, active = true }) {
  const returnRef = useRef(null)
  useEffect(() => { if (active) returnRef.current?.focus() }, [active])
  return <div className="flex min-w-0 flex-col gap-4 break-words">
    <div role="status" className="rounded-panel bg-cardBg p-4 text-[13px] leading-5">
      <p className="font-semibold">Application received</p>
      <p>Status: {outcome.status}</p><p>Reference: {outcome.id}</p>
      <p className="mt-2">This is the status returned by the application service.</p>
    </div>
    {refreshError && <p role="alert" className="text-[12px] leading-[18px] text-textSecondary">Your application was received, but its latest status could not be reloaded.</p>}
    {onClose && <CouncilButton ref={returnRef} onClick={onClose}>Return to Council</CouncilButton>}
  </div>
}

function ApplicationEditor({ scope, service, canApply, staleReason, refetch, onClose, active, onBusyChange, closeGuardRef, onReceived }) {
  // Semantic scope keeps drafts across equivalent refreshes; changed identity/program/schema resets them.
  const draft = useMemo(() => createApplicationDraft({ ...JSON.parse(scope), service, canApply }), [scope, service, canApply])
  const state = useSyncExternalStore(draft.subscribe, draft.getSnapshot, draft.getSnapshot)
  const fieldRefs = useRef(new Map())
  useEffect(() => draft.cancel, [draft])
  useEffect(() => { onBusyChange?.(state.busy); return () => onBusyChange?.(false) }, [state.busy, onBusyChange])
  useEffect(() => {
    if (!closeGuardRef) return
    closeGuardRef.current = draft.dismiss
    return () => { closeGuardRef.current = null }
  }, [draft, closeGuardRef])
  useEffect(() => {
    if (!active) return
    if (!state.outcome) fieldRefs.current.values().next().value?.focus()
  }, [active, draft, state.outcome])
  const close = onClose ? () => { if (draft.dismiss()) onClose() } : undefined
  const submit = async (event) => {
    event.preventDefault()
    if (staleReason) return
    const outcome = await draft.submit()
    if (!outcome) {
      const errors = draft.getSnapshot().errors
      fieldRefs.current.get(draft.form.questions.find(({ id }) => Object.hasOwn(errors, id) && errors[id])?.id)?.focus()
    } else {
      onReceived(outcome)
      // Retain the genuine receipt even when refreshed data is missing or malformed.
      try { normalizeApplicationData(await refetch?.(), draft.user) }
      catch { onReceived(outcome, true) }
    }
  }
  if (state.outcome) return <ApplicationReceipt outcome={state.outcome} onClose={close} refreshError={state.refreshError} active={active} />
  return <form noValidate onSubmit={submit} aria-busy={state.busy || undefined} className="flex min-w-0 flex-col gap-4">
    <CouncilApplicationQuestions questions={draft.form.questions} state={state} onEdit={draft.edit} fieldRefs={fieldRefs} disabled={Boolean(staleReason)} />
    {Object.values(state.errors).some(Boolean) && <p role="alert" className="sr-only">Check the highlighted answers before submitting.</p>}
    {state.busy && <p role="status" className="text-[12px] leading-[18px] text-textSecondary">{state.checking ? 'Checking application status…' : 'Submitting your application… Please wait before closing.'}</p>}
    {state.error && <p role="alert" className="text-[12px] leading-[18px] text-textPrimary">{applicationErrorMessage(state.error)}</p>}
    {state.refreshError && <p role="alert" className="text-[12px] leading-[18px] text-textSecondary">Application status could not be checked. Your answers are kept.</p>}
    {(state.error || state.requiresCheck) && refetch && ![401, 403].includes(state.error?.status) && <CouncilButton variant="secondary" size="compact" busy={state.busy} onClick={() => draft.checkStatus(refetch)}>Check application status</CouncilButton>}
    <footer className="flex min-w-0 flex-col gap-2 border-t border-textMuted/20 pt-[13px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {close && <CouncilButton variant="quiet" size="compact" onClick={close} disabled={state.busy}>Cancel</CouncilButton>}
        <CouncilButton type="submit" size="compact" busy={state.busy} busyLabel={state.checking ? 'Checking…' : 'Submitting…'} disabledReason={staleReason || draft.unavailableReason()} className="px-6"><img src={submitIcon} alt="" />Submit Application</CouncilButton>
      </div>
      <p className="text-[12px] leading-[18px] text-textSecondary">Your answers are kept while you stay on this page. Only your own application can be submitted.</p>
    </footer>
  </form>
}
