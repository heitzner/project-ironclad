import poster from './assets/d768e.png'
import BookingIcon from './BookingIcon'

export default function BookingNotice({ onOpenGuidelines, busy }) {
  return <aside className="booking-notice" aria-label="Venue notice">
    <img className="booking-notice-poster" src={poster} width="64" height="64" alt="CSD Fair Badminton Tryout poster" />
    <div><div className="booking-notice-heading"><span>NOTICE</span><h2>CSD Fair Badminton Tryout</h2></div><p>The Social Hall is currently occupied for tryouts until 3:00 PM. Please route alternative indoor activities to available vacant rooms.</p>{!onOpenGuidelines && <small id="booking-guidelines-note">Official guidelines have not been supplied.</small>}</div>
    <button type="button" disabled={busy || !onOpenGuidelines} aria-describedby={!onOpenGuidelines ? 'booking-guidelines-note' : undefined} onClick={onOpenGuidelines}><BookingIcon name="6d335" />Guidelines</button>
  </aside>
}
