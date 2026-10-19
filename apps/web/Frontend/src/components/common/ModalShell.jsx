import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export function ModalShell({
  isOpen,
  onClose,
  titleId,
  children,
  maxWidth = 'max-w-[440px]',
  showTopBar = false,
  className = '',
}) {
  const previousActiveElement = useRef(null)
  const modalRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    previousActiveElement.current = document.activeElement
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
        return
      }

      if (event.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    // Initial focus into modal
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const focusable = modalRef.current.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable) {
          focusable.focus()
        } else {
          modalRef.current.focus()
        }
      }
    }, 50)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus()
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.()
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative w-full ${maxWidth} rounded-[24px] bg-white shadow-2xl overflow-hidden focus:outline-none ${className}`}
      >
        {showTopBar && (
          <div className="h-1.5 w-full bg-gradient-to-r from-navbar via-primary to-soft" />
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}

export default ModalShell
