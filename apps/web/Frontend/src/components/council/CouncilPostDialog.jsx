import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { councilService } from '../../services/council.service.js'
import CouncilDialog from './CouncilDialog.jsx'
import CouncilPostForm from './CouncilPostForm.jsx'
import { createPostDraft } from './councilPost.model.js'
import postIcon from './assets/bd3b7.png'

export default function CouncilPostDialog({ open, onClose, service = councilService, userId, councilId, canCreatePost, constraints, onCreated, onCheckFeed, restoreFocusRef }) {
  // A new identity, Council, capability, service or requirements scope gets a fresh isolated draft.
  const draft = useMemo(() => createPostDraft({ service, councilId, canCreatePost, constraints, userId }), [service, councilId, canCreatePost, constraints, userId])
  const state = useSyncExternalStore(draft.subscribe, draft.getSnapshot, draft.getSnapshot)
  const headerRef = useRef(null), descriptionRef = useRef(null), returnRef = useRef(null)
  useEffect(() => draft.cancel, [draft])
  useEffect(() => { if (state.outcome) returnRef.current?.focus() }, [state.outcome])

  const close = () => { if (draft.dismiss()) onClose?.() }
  const submit = async (event) => {
    event.preventDefault()
    const outcome = await draft.submit()
    if (!outcome) {
      const errors = draft.getSnapshot().errors
      if (errors.header) headerRef.current?.focus()
      else if (errors.description) descriptionRef.current?.focus()
      return
    }
    // A failed refresh never turns a genuine create response into a failed save/retry.
    if (onCreated) {
      try { if (await onCreated(outcome) === null) draft.reportRefreshFailure(outcome) }
      catch { draft.reportRefreshFailure(outcome) }
    }
  }

  return <CouncilDialog
    open={open} title="Create a post" description="Campus Event" onClose={close} busy={state.busy} initialFocusRef={headerRef} restoreFocusRef={restoreFocusRef}
    icon={<span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cardBg"><img src={postIcon} alt="" className="h-[19px] w-[19px] object-cover" /></span>}
  >
    <CouncilPostForm state={state} limits={draft.limits} disabledReason={draft.unavailableReason()} onEdit={draft.edit} onSubmit={submit} onClose={close} onCheckFeed={onCheckFeed} headerRef={headerRef} descriptionRef={descriptionRef} returnRef={returnRef} />
  </CouncilDialog>
}
