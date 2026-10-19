import BookingIcon from './BookingIcon'
import BookingDatePicker from './BookingDatePicker'

export default function BookingToolbar({ dates, date, shift, counts, busy, onChange }) {
  return <header className="booking-toolbar">
    <div className="booking-toolbar-inner">
      <div className="booking-heading">
        <div className="booking-breadcrumb">PORTAL <BookingIcon name="9c327" /> <span>BOOKING</span></div>
        <div className="booking-title-row"><h1 id="booking-title">Room &amp; Laboratory Booking</h1><span className="booking-demo"><i />Demo data</span></div>
      </div>
      <div className="booking-quick-controls">
        <BookingDatePicker dates={dates} date={date} busy={busy} onChange={onChange} />
        <div className="booking-segment" role="group" aria-label="Booking shift">
          {[['all', 'All Day'], ['morning', 'Morning'], ['evening', 'Evening']].map(([value, label]) => <button key={value} type="button" aria-pressed={shift === value} disabled={busy} onClick={() => onChange({ shift: value })}>{label}</button>)}
        </div>
        <div className="booking-counts" aria-label="Venue overview for the selected date and shift">
          <span><i />Available: <b>{counts.available}</b></span><span><i className="occupied" />Occupied: <b>{counts.occupied}</b></span>
          <span><i className="unavailable" />Unavailable: <b>{counts.unavailable}</b></span>
        </div>
      </div>
    </div>
  </header>
}
