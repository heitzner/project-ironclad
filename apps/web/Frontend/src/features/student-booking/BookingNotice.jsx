import poster from './assets/d768e.png'
import BookingIcon from './BookingIcon'

const noticeImages = { badminton_tryout: poster }

export default function BookingNotice({ notice, onOpenGuidelines, busy }) {
  if (!notice) return null
  const image = noticeImages[notice.image_key]
  return <aside className="booking-notice" aria-label="Venue notice">
    {image && <img className="booking-notice-poster" src={image} width="64" height="64" alt="" />}
    <div><div className="booking-notice-heading"><span>NOTICE</span><h2>{notice.title}</h2></div><p>{notice.body}</p>{!notice.guidelines_available && <small id="booking-guidelines-note">Official guidelines have not been supplied.</small>}</div>
    <button type="button" disabled={busy || !notice.guidelines_available || !onOpenGuidelines} aria-describedby={!notice.guidelines_available ? 'booking-guidelines-note' : undefined} onClick={onOpenGuidelines}><BookingIcon name="6d335" />Guidelines</button>
  </aside>
}
