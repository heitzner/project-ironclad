import { useRef, useState } from 'react'
import { postKinds, programs } from '../../data/frontend-system.js'
import SystemDialog from './SystemDialog.jsx'
import { inputClass, primaryButton, secondaryButton } from './system-ui.js'

export default function SystemPostForm({ store, user, onClose }) {
  const [kind, setKind] = useState('announcement')
  const [registrationKind, setRegistrationKind] = useState('individual')
  const [error, setError] = useState('')
  const guard = useRef(false)
  const field = (label, name, props = {}) => <label className="block text-sm font-semibold">{label}<input name={name} required className={`${inputClass} mt-1 font-normal`} {...props} /></label>
  return <SystemDialog title="Create news post" onClose={onClose} wide>
    <form className="space-y-4" onSubmit={event => {
      event.preventDefault()
      if (guard.current) return
      guard.current = true
      const fields = Object.fromEntries(new FormData(event.currentTarget))
      try {
        store.publish(user, { ...fields, kind, registrationKind, capacity: Number(fields.capacity), teamSize: Number(fields.teamSize), startsAt: `${fields.startsAt}:00+08:00`, endsAt: `${fields.endsAt}:00+08:00`, questions: String(fields.questions || '').split('\n').map(q => q.trim()).filter(Boolean), categories: String(fields.categories || '').split(',').map(q => q.trim()).filter(Boolean) })
        onClose()
      } catch (failure) { setError(failure.message) } finally { guard.current = false }
    }}>
      <label className="block text-sm font-semibold">Post type<select value={kind} onChange={event => { setKind(event.target.value); setError('') }} className={`${inputClass} mt-1`}>{Object.entries(postKinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {field('Title', 'title', { maxLength: 120 })}
      <label className="block text-sm font-semibold">Announcement / instructions<textarea name="description" required maxLength={3000} rows={4} className={`${inputClass} mt-1 font-normal`} /></label>
      {field('Venue / location', 'venue', { maxLength: 120 })}
      <div className="grid gap-3 sm:grid-cols-2">{field(kind === 'announcement' ? 'Scheduled time (Manila)' : 'Registration closes / event starts (Manila)', 'startsAt', { type: 'datetime-local' })}{field('End time (Manila)', 'endsAt', { type: 'datetime-local' })}</div>
      {kind !== 'announcement' && field(kind === 'council' ? 'Application capacity' : registrationKind === 'team' ? 'Team capacity' : 'Participant capacity', 'capacity', { type: 'number', min: 1, max: 10000, defaultValue: 40 })}
      {kind === 'event' && <>
        <label className="block text-sm font-semibold">Registration format<select value={registrationKind} onChange={event => setRegistrationKind(event.target.value)} className={`${inputClass} mt-1`}><option value="individual">Individual</option><option value="team">Team</option></select></label>
        {registrationKind === 'team' ? field('Players per team (including captain)', 'teamSize', { type: 'number', min: 2, max: 20, defaultValue: 5 }) : field('Categories (separate with commas)', 'categories', { required: false, placeholder: 'Singles, Doubles' })}
      </>}
      {kind === 'council' && <>
        <label className="block text-sm font-semibold">Council program<select name="program" required className={`${inputClass} mt-1`}>{programs.map(program => <option key={program}>{program}</option>)}</select></label>
        <label className="block text-sm font-semibold">Application questions (one per line)<textarea name="questions" required rows={4} defaultValue={'Why do you want to join the council?\nWhat skills or experience would you bring?'} className={`${inputClass} mt-1 font-normal`} /></label>
      </>}
      <p className="text-xs leading-5 text-textSecondary">Your post and its attached form will appear in the News Feed and the matching filter for every account.</p>
      {error && <p role="alert" className="rounded-control bg-selectBg p-3 text-sm">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} className={secondaryButton}>Cancel</button><button type="submit" className={primaryButton}>Publish post</button></div>
    </form>
  </SystemDialog>
}
