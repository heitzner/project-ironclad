import { useRef, useState } from 'react'
import SystemDialog from './SystemDialog.jsx'
import { dateTimeLabel, inputClass, primaryButton, secondaryButton } from './system-ui.js'

export default function SystemRegistration({ post, user, store, onClose }) {
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const guard = useRef(false)
  const council = post.kind === 'council'
  const team = !council && post.registrationKind === 'team'
  const title = result ? council ? 'Application submitted' : 'Registration confirmed' : council ? 'Apply for council' : team ? 'Register your team' : 'Event registration'
  const field = (label, name, props = {}) => <label className="block text-sm font-semibold">{label}<input name={name} required className={`${inputClass} mt-1 font-normal`} {...props} /></label>
  return <SystemDialog title={title} onClose={onClose} wide={team}>
    {result ? <div className="space-y-4 text-sm">
      <p className="text-lg font-semibold text-dark">{post.title}</p>
      <p>{council ? 'Your application is pending review by the council or an administrator.' : 'You are registered. No approval is needed.'}</p>
      <p className="rounded-panel bg-cardBg p-4 break-all">Reference: <strong>{result.id}</strong></p>
      <p>Track this in <strong>My Applications &amp; Registrations</strong> in your account menu.</p>
      <button type="button" className={primaryButton} onClick={onClose}>Done</button>
    </div> : <form className="space-y-4" onSubmit={event => {
      event.preventDefault()
      if (guard.current) return
      guard.current = true
      const fields = new FormData(event.currentTarget)
      try {
        setResult(store.submit(user, post.id, { contact: fields.get('contact'), category: fields.get('category'), teamName: fields.get('teamName'), answers: post.questions?.map((_, index) => fields.get(`answer-${index}`)), members: team ? Array.from({ length: post.teamSize }, (_, index) => ({ name: fields.get(`member-name-${index}`), studentId: fields.get(`member-id-${index}`) })) : undefined }))
      } catch (failure) { setError(failure.message) } finally { guard.current = false }
    }}>
      <div className="rounded-panel bg-cardBg p-4 text-sm"><h3 className="font-bold">{post.title}</h3><p className="mt-1">{post.venue} · {dateTimeLabel(post.startsAt)}</p><p className="mt-2">{user.name} · {user.studentId} · {user.course}</p></div>
      {field('Contact email', 'contact', { type: 'email', defaultValue: user.email || '', maxLength: 200 })}
      {council && post.questions.map((question, index) => <label key={index} className="block text-sm font-semibold">{question}<textarea required name={`answer-${index}`} maxLength={1500} rows={3} className={`${inputClass} mt-1 font-normal`} /></label>)}
      {!council && !team && post.categories?.length > 0 && <label className="block text-sm font-semibold">Category<select required name="category" className={`${inputClass} mt-1`}><option value="">Choose a category</option>{post.categories.map(category => <option key={category}>{category}</option>)}</select></label>}
      {team && <>
        {field('Team name', 'teamName', { maxLength: 80 })}
        <p className="text-sm text-textSecondary">Enter all {post.teamSize} players, including yourself. Each player can join one team for this event.</p>
        {Array.from({ length: post.teamSize }, (_, index) => <fieldset key={index} className="rounded-panel border border-track p-3"><legend className="px-1 text-sm font-semibold">Player {index + 1}{index === 0 ? ' · Captain (you)' : ''}</legend><div className="grid gap-3 sm:grid-cols-2">{field(`Player ${index + 1} full name`, `member-name-${index}`, { defaultValue: index === 0 ? user.name : '', maxLength: 120 })}{field(`Player ${index + 1} student ID`, `member-id-${index}`, { defaultValue: index === 0 ? user.studentId : '', pattern: '[0-9]{8}-[A-Za-z]', placeholder: '20241200-C', maxLength: 10 })}</div></fieldset>)}
      </>}
      {error && <p role="alert" className="rounded-control bg-selectBg p-3 text-sm">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} className={secondaryButton}>Cancel</button><button type="submit" className={primaryButton}>{council ? 'Submit application' : 'Confirm registration'}</button></div>
    </form>}
  </SystemDialog>
}
