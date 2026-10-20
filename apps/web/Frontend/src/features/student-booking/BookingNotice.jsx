import poster from './assets/d768e.png'
import BookingIcon from './BookingIcon'

export default function BookingNotice({ onOpenGuidelines, busy }) {
  return <aside className="booking-notice" aria-label="Venue notice">
    <img className="booking-notice-poster" src={poster} width="64" height="64" alt="CSD Fair Badminton Tryout poster" />
    <div><div className="booking-notice-heading"><span>NOTICE</span><h2>CSD Fair Badminton Tryout</h2></div><p>Check the News Feed for event details and use the venue schedule to choose an available room for your activity.</p>{!onOpenGuidelines && <small id="booking-guidelines-note">Official guidelines have not been supplied.</small>}</div>
    <button type="button" disabled={busy || !onOpenGuidelines} aria-describedby={!onOpenGuidelines ? 'booking-guidelines-note' : undefined} onClick={onOpenGuidelines}><BookingIcon name="6d335" />Guidelines</button>
  </aside>
}
