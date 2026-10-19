import { useEffect, useId, useRef, useState } from 'react'
import BookingIcon from './BookingIcon'
import { formatDate } from './booking.logic'

export default function BookingDatePicker({ dates, date, datasetLabel, busy, onChange }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const optionRefs = useRef([])
  const openingIndexRef = useRef(null)
  const expanded = open && !busy
  const selectedIndex = Math.max(0, dates.indexOf(date))

  useEffect(() => {
    if (!expanded) return
    const index = openingIndexRef.current ?? selectedIndex
    openingIndexRef.current = null
    optionRefs.current[index]?.focus()
    function dismissOutside(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismissOutside)
    return () => document.removeEventListener('pointerdown', dismissOutside)
  }, [expanded, selectedIndex])

  function close(restoreFocus = false) {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  function openAt(index) {
    if (busy) return
    openingIndexRef.current = index
    setOpen(true)
  }

  function navigate(event) {
    const current = optionRefs.current.indexOf(document.activeElement)
    let next
    if (event.key === 'ArrowDown') next = (current + 1) % dates.length
    else if (event.key === 'ArrowUp') next = (current - 1 + dates.length) % dates.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = dates.length - 1
    else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return }
    else if (event.key === 'Tab') { close(true); return }
    else return
    event.preventDefault()
    optionRefs.current[next]?.focus()
    optionRefs.current[next]?.scrollIntoView({ block: 'nearest' })
  }

  return <div className="booking-date" ref={containerRef} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }}>
    <button className="booking-date-trigger" ref={triggerRef} type="button" disabled={busy}
      aria-haspopup="listbox" aria-expanded={expanded} aria-controls={expanded ? `${id}-options` : undefined}
      aria-labelledby={`${id}-label ${id}-value`}
      onClick={() => setOpen(previous => !previous)}
      onKeyDown={event => {
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault()
          openAt(event.key === 'Home' ? 0 : event.key === 'End' ? dates.length - 1 : selectedIndex)
        }
      }}>
      <BookingIcon name="acc81" />
      <span className="booking-date-copy"><span id={`${id}-label`}>Pre-booking Date</span><strong id={`${id}-value`}>{formatDate(date, true)}</strong></span>
      <span className="booking-term">{datasetLabel}</span><BookingIcon name="afb2b" />
    </button>
    {expanded && <div className="booking-date-menu" id={`${id}-options`} role="listbox" aria-labelledby={`${id}-label`} onKeyDown={navigate}>
      {dates.map((day, index) => <button key={day} ref={element => { optionRefs.current[index] = element }} type="button" role="option" aria-selected={day === date} tabIndex={day === date ? 0 : -1}
        className="booking-date-option" onClick={() => { onChange({ date: day }); close(true) }}>
        <span>{formatDate(day)}</span>{day === date && <span className="booking-date-selected" aria-hidden="true">Selected</span>}
      </button>)}
    </div>}
  </div>
}
