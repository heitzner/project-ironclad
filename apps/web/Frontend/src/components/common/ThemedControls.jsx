import { isCalendarDate, timeOptions } from '../../data/time-options.js'
import { useEffect, useId, useRef, useState } from 'react'
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { inputClass } from './system-ui.js'
import './task40.css'

// A button/listbox pair keeps the popup in the same visual theme as its field.
export function ThemedSelect({ label, name, value, defaultValue, onChange, options, disabled = false, className = '' }) {
  const id = useId()
  const [local, setLocal] = useState(defaultValue ?? options[0]?.value ?? '')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const trigger = useRef(null)
  const selected = value ?? local
  useEffect(() => { if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' }) }, [open, id, active])
  const choose = option => { setLocal(option.value); onChange?.(option.value); setOpen(false); trigger.current?.focus() }
  return <div className={`relative min-w-0 ${className}`} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    {name && <input type="hidden" name={name} value={selected} disabled={disabled} />}
    <button ref={trigger} type="button" id={id} aria-label={label} role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-options`} disabled={disabled} className={`${inputClass} flex items-center justify-between gap-3 text-left font-medium`} onClick={() => { setActive(Math.max(0, options.findIndex(o => o.value === selected))); setOpen(v => !v) }} onKeyDown={event => {
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); setOpen(true)
        setActive(i => event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : Math.max(0, Math.min(options.length - 1, (open ? i : Math.max(0, options.findIndex(o => o.value === selected))) + (event.key === 'ArrowDown' ? 1 : -1))))
      } else if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false) }
      else if (open && ['Enter', ' '].includes(event.key)) { event.preventDefault(); if (options[active]) choose(options[active]) }
      else if (event.key.length === 1 && /\S/.test(event.key)) { const index = options.findIndex(o => o.label.toLowerCase().startsWith(event.key.toLowerCase())); if (index >= 0) { setOpen(true); setActive(index) } }
    }} aria-activedescendant={open ? `${id}-${active}` : undefined}>
      <span className="truncate">{options.find(o => o.value === selected)?.label || 'Choose an option'}</span><ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
    </button>
    {open && <div id={`${id}-options`} role="listbox" aria-label={label} className="ic-scroll absolute inset-x-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-panel border border-soft bg-white p-1 shadow-nav">
      {options.map((option, index) => <div role="option" aria-selected={selected === option.value} key={option.value} id={`${id}-${index}`} className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-control px-3 text-sm ${index === active || selected === option.value ? 'bg-cardBg text-deep' : 'text-textSecondary hover:bg-pageBg'}`} onPointerDown={event => event.preventDefault()} onClick={event => { event.preventDefault(); choose(option) }}>
        {option.label}{selected === option.value && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
      </div>)}
    </div>}
  </div>
}

export function DateField({ label, name, value, onChange, min, required = true }) {
  const id = useId()
  const input = useRef(null)
  const calendarTrigger = useRef(null)
  useEffect(() => { input.current?.setCustomValidity(value && (!isCalendarDate(value) || (min && value < min)) ? 'Choose a valid calendar date in the allowed range.' : '') }, [value, min])
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => (value || min || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())).slice(0, 7))
  const [year, number] = month.split('-').map(Number)
  const days = new Date(year, number, 0).getDate()
  const firstDay = new Date(year, number - 1, 1).getDay()
  const move = amount => { const date = new Date(year, number - 1 + amount, 1); setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`) }
  const closeCalendar = () => { setOpen(false); calendarTrigger.current?.focus() }
  const toggleCalendar = () => {
    if (!open) setMonth((isCalendarDate(value) ? value : min || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())).slice(0, 7))
    setOpen(v => !v)
  }
  return <div className="relative min-w-0" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }} onKeyDown={event => {
    // Consume Escape only while the popup is open; the next Escape reaches the dialog.
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); closeCalendar() }
  }}>
    <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
    <div className="relative mt-1"><input id={id} ref={input} name={name} value={value} onChange={event => onChange(event.target.value)} required={required} pattern="\d{4}-\d{2}-\d{2}" placeholder="YYYY-MM-DD" className={`${inputClass} pr-12 font-normal`} /><button ref={calendarTrigger} type="button" aria-label={`Choose ${label.toLowerCase()}`} aria-expanded={open} aria-controls={`${id}-calendar`} onClick={toggleCalendar} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-control text-dark focus-visible:ring-2 focus-visible:ring-primary"><CalendarDays className="h-4 w-4" aria-hidden="true" /></button></div>
    {open && <div id={`${id}-calendar`} role="group" aria-label={`${label} calendar`} className="ic-calendar absolute left-0 top-full z-30 mt-1 w-[336px] max-w-full rounded-panel border border-soft bg-white p-3 shadow-nav">
      <div className="flex items-center justify-between text-sm font-semibold"><button type="button" aria-label="Previous month" onClick={() => move(-1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control hover:bg-cardBg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button><span className="text-center">{new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(year, number - 1))}</span><button type="button" aria-label="Next month" onClick={() => move(1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control hover:bg-cardBg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button></div>
      <div className="ic-calendar-days grid grid-cols-7 text-center text-xs">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <span key={d} className="ic-calendar-weekdays py-2 text-textSecondary">{d}</span>)}{Array.from({ length: firstDay }, (_, i) => <span className="ic-calendar-blank" key={`blank-${i}`} />)}{Array.from({ length: days }, (_, i) => { const date = `${month}-${String(i + 1).padStart(2, '0')}`; return <button type="button" key={date} disabled={Boolean(min && date < min)} aria-label={date} aria-pressed={date === value} className={`min-h-11 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-30 ${date === value ? 'bg-dark text-white' : 'hover:bg-cardBg'}`} onClick={() => { onChange(date); closeCalendar() }}><span className="ic-calendar-weekday hidden text-[10px]" aria-hidden="true">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][(firstDay + i) % 7]} </span>{i + 1}</button> })}</div>
    </div>}
  </div>
}



export function DateTimeField({ label, name }) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('540')
  return <div className="min-w-0 space-y-2"><DateField label={label} value={date} onChange={setDate} /><ThemedSelect label={`${label} time`} value={time} onChange={setTime} options={timeOptions()} /><input type="hidden" name={name} value={date ? `${date}T${String(Math.floor(Number(time) / 60)).padStart(2, '0')}:${String(Number(time) % 60).padStart(2, '0')}` : ''} /></div>
}
