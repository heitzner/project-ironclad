import { useEffect, useRef } from 'react'

const focusable = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

export function ModalShell({ isOpen, onClose, titleId, children, maxWidth = 'max-w-[440px]', showTopBar = false, className = '', busy = false }) {
  const modalRef = useRef(null)
  useEffect(() => {
    if (!isOpen) return
    const modal = modalRef.current
    const opener = document.activeElement
    const originalOverflow = document.body.style.overflow
    modal.showModal()
    document.body.style.overflow = 'hidden'
    ;(modal.querySelector(focusable) ?? modal).focus()
    return () => {
      modal.close()
      document.body.style.overflow = originalOverflow
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [isOpen])

  if (!isOpen) return null
  return <dialog ref={modalRef} tabIndex={-1} aria-labelledby={titleId} aria-busy={busy || undefined}
    onCancel={event => { event.preventDefault(); if (!busy) onClose?.() }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const modal = modalRef.current
      const controls = [...modal.querySelectorAll(focusable)].filter(element => element.getClientRects().length > 0 && !element.closest('[hidden], [inert]'))
      const first = controls[0]
      const last = controls.at(-1)
      if (!first || !modal.contains(document.activeElement) || document.activeElement === modal
        || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault()
        ;(event.shiftKey ? last ?? modal : first ?? modal).focus()
      }
    }}
    className={['fixed inset-0 m-auto max-h-[calc(100svh_-_2rem)] w-[calc(100%_-_2rem)]', maxWidth, 'overflow-y-auto wrap-anywhere rounded-[24px] border-0 bg-white p-0 text-textPrimary shadow-2xl backdrop:bg-black/40 focus:outline-none', className].join(' ')}>
    {showTopBar && <div className="h-1.5 w-full bg-gradient-to-r from-navbar via-primary to-soft" />}
    {children}
  </dialog>
}

export default ModalShell
