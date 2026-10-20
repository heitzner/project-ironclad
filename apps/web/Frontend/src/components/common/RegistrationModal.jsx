import { useEffect, useRef, useState } from 'react'
import useAuth from '../../hooks/useAuth.js'
import { useStudent } from '../student/student.context.js'
import useStudentAction from '../student/useStudentAction.js'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Gamepad2,
  Search,
  Users,
  X,
} from 'lucide-react'
import ModalShell from './ModalShell.jsx'

export function RegistrationModal({ isOpen, onClose, event, onSuccess }) {
  if (!event) return null
  return <RegistrationForm key={event.id} isOpen={isOpen} onClose={onClose} event={event} onSuccess={onSuccess} />
}

function RegistrationForm({ isOpen, onClose, event, onSuccess }) {
  const { user } = useAuth()
  const { service } = useStudent()
  const mutation = useStudentAction('registration:' + event.id)
  const step = mutation.result ? 'confirmed' : event.registrationKind === 'team' ? 'team' : 'individual'
  const [studentId, setStudentId] = useState(user?.studentId || '')
  const [fullName, setFullName] = useState(user?.name || '')
  const [section, setSection] = useState(typeof user?.section === 'string' ? user.section : '')
  const [playingCategory, setPlayingCategory] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [individualAgreed, setIndividualAgreed] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamAgreed, setTeamAgreed] = useState(false)
  const categories = event.registrationOptions?.categories ?? []
  const teamSize = event.registrationOptions?.teamSize
  const [roster, setRoster] = useState(() => Number.isInteger(teamSize) && teamSize > 0 && teamSize <= 50
    ? Array.from({ length: teamSize }, (_, index) => ({ id: String(index), studentId: '', name: '', section: '' })) : [])
  const [refreshError, setRefreshError] = useState(null)
  const heading = useRef(null)
  useEffect(() => { if (mutation.result) heading.current?.focus() }, [mutation.result])
  const canSubmit = Boolean(user) && service.supports('register') && !event.preview
    && event.registrationAvailable === true && (step !== 'team' || roster.length > 0)
  const handleClose = () => { if (!mutation.busy) onClose?.() }
  const handleConfirmSubmit = async e => {
    e.preventDefault()
    if (!canSubmit || mutation.busy || mutation.blocked) return
    const result = await mutation.run(service.register, {
      eventId: event.id, version: event.version, participantId: user.id, kind: event.registrationKind || 'individual',
      ...(step === 'team' ? { teamName, roster } : { studentId, fullName, section, playingCategory, emergencyContact }),
    })
    if (result && onSuccess) {
      try { if (!await onSuccess()) setRefreshError('Registration confirmed. Event counts could not be refreshed.') }
      catch { setRefreshError('Registration confirmed. Event counts could not be refreshed.') }
    }
  }



  // Format short subtitle for the event header without any em-dashes
  const eventSubtitle = `Event: ${event.title} • ${event.venue}`

  return (
    <ModalShell
      isOpen={isOpen}
      busy={mutation.busy}
      onClose={handleClose}
      titleId="registration-modal-title"
      maxWidth={step === 'team' ? 'max-w-[560px]' : 'max-w-[480px]'}
      showTopBar={false}
      className="p-0 border border-track/40 shadow-2xl"
    >
      <div className="relative p-6">
        {/* Close X Button in top-right */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close modal"
          disabled={mutation.busy}
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full text-textMuted transition-colors duration-150 hover:bg-pageBg hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {!canSubmit && !mutation.result && <p role="status" className="mb-4 rounded-control bg-cardBg p-3 text-sm text-textSecondary">{event.registrationUnavailableReason || 'Event registration is not connected or available yet.'}</p>}
        {mutation.error && <p role="alert" className="mb-4 text-sm text-textPrimary">{mutation.error}</p>}
        {mutation.blocked && !mutation.result && <p role="status" className="mb-4 text-sm text-textSecondary">Check the registration status with support before retrying this unconfirmed request.</p>}
        {refreshError && <p role="status" className="mb-4 text-sm text-textSecondary">{refreshError}</p>}
        {/* ========================================================================= */}
        {/* STATE 1: INDIVIDUAL REGISTRATION (Tryouts / Solo Events)                  */}
        {/* ========================================================================= */}
        {step === 'individual' && (
          <div>
            {/* Header with circular green badge */}
            <div className="flex items-start gap-3.5 pr-8">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cardBg text-primary">
                <CheckCircle2 className="h-6 w-6 stroke-[2.2]" aria-hidden="true" />
              </div>
              <div>
                <h2 id="registration-modal-title" className="text-[18px] font-bold text-textPrimary leading-snug">
                  Secure Tryout Slot: {event.title.includes('Badminton') ? 'Badminton' : event.title}
                </h2>
                <p className="mt-0.5 text-[12px] text-textSecondary">
                  {eventSubtitle}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmSubmit} className="mt-5"><fieldset disabled={mutation.busy || mutation.blocked} className="min-w-0 space-y-4">
              {/* Participant Details Card */}
              <div className="rounded-2xl border border-track/50 bg-selectBg/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.44px] text-textPrimary">
                    Participant Details
                  </span>
                </div>

                {/* Student ID with search icon */}
                <div>
                  <label htmlFor="student-id-input" className="block text-[11px] font-bold uppercase tracking-[0.44px] text-textSecondary mb-1">
                    Student ID
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="student-id-input"
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="h-11 w-full rounded-xl border border-track bg-white px-3.5 pr-10 text-[14px] font-medium text-textPrimary focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                    <Search className="pointer-events-none absolute right-3.5 h-4 w-4 text-primary" aria-hidden="true" />
                  </div>
                </div>

                {/* Full Name & Section Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label htmlFor="fullname-input" className="block text-[11px] font-bold uppercase tracking-[0.44px] text-textSecondary mb-1">
                      Full Name
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="fullname-input"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-11 w-full rounded-xl border border-track bg-white px-3.5 pr-9 text-[13px] font-medium text-textPrimary focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring truncate"
                        required
                      />
                      <CheckCircle2 className="pointer-events-none absolute right-3 h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="section-input" className="block text-[11px] font-bold uppercase tracking-[0.44px] text-textSecondary mb-1">
                      Section
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="section-input"
                        type="text"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        className="h-11 w-full rounded-xl border border-track bg-white px-3.5 pr-9 text-[13px] font-medium text-textPrimary focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      />
                      <CheckCircle2 className="pointer-events-none absolute right-3 h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preferred Playing Category Dropdown */}
              <div>
                <label htmlFor="category-select" className="block text-[11px] font-bold uppercase tracking-[0.44px] text-textPrimary mb-1">
                  Preferred Playing Category
                </label>
                <div className="relative">
                  <select
                    id="category-select"
                    disabled={!categories.length}
                    required={categories.length > 0}
                    value={playingCategory}
                    onChange={(e) => setPlayingCategory(e.target.value)}
                    className="h-11 w-full appearance-none rounded-xl border border-track bg-white px-3.5 pr-10 text-[13px] font-medium text-textPrimary focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" aria-hidden="true" />
                </div>
              </div>

              {/* Emergency Contact Number Input */}
              <div>
                <label htmlFor="emergency-input" className="block text-[11px] font-bold uppercase tracking-[0.44px] text-textPrimary mb-1">
                  Emergency Contact Number
                </label>
                <input
                  id="emergency-input"
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="+63 912 345 6789"
                  className="h-11 w-full rounded-xl border border-track bg-white px-3.5 text-[13px] font-medium text-textPrimary focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={individualAgreed}
                  onChange={(e) => setIndividualAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-track text-primary focus:ring-primary"
                  required
                />
                <span className="text-[12px] text-textSecondary leading-5">
                  {event.registrationOptions?.agreement || 'I confirm that the registration details are correct.'}
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-track/40">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-[13px] font-semibold text-textSecondary hover:text-textPrimary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit || mutation.busy || mutation.blocked || !individualAgreed}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-semibold text-white shadow-card transition-colors duration-150 hover:bg-dark disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>{mutation.busy ? 'Submitting…' : 'Confirm Registration'}</span>
                </button>
              </div>
            </fieldset></form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STATE 2: TEAM REGISTRATION (Valorant / Squad Tournaments)                */}
        {/* ========================================================================= */}
        {step === 'team' && (
          <div>
            {/* Header with Gamepad Icon */}
            <div className="flex items-start gap-3.5 pr-8">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cardBg text-primary">
                <Gamepad2 className="h-6 w-6 stroke-[2]" aria-hidden="true" />
              </div>
              <div>
                <h2 id="registration-modal-title" className="text-[18px] font-bold text-textPrimary leading-snug">
                  Register Team: {event.title.includes('Valorant') ? 'Valorant' : event.title}
                </h2>
                <p className="mt-0.5 text-[12px] text-textSecondary">
                  {eventSubtitle}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmSubmit} className="mt-5"><fieldset disabled={mutation.busy || mutation.blocked} className="min-w-0 space-y-4">
              {/* Team Name Input */}
              <div>
                <label htmlFor="team-name-input" className="block text-[11px] font-bold uppercase tracking-[0.44px] text-textPrimary mb-1">
                  Team Name
                </label>
                <input
                  id="team-name-input"
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g., Cyber Knights"
                  className="h-11 w-full rounded-xl border border-track bg-white px-3.5 text-[14px] font-medium text-textPrimary focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              {/* Roster size follows supplied event requirements. */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.44px] text-textPrimary">
                    Roster Setup {teamSize ? (' (' + teamSize + ' Players)') : ''}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{teamSize ? (teamSize + ' Required') : 'Roster requirements unavailable'}</span>
                  </span>
                </div>

                <div className="max-h-[240px] overflow-y-auto space-y-2.5 rounded-2xl border border-track/50 bg-selectBg/30 p-3 pr-2">
                  {roster.map((player, index) => (
                    <div
                      key={player.id}
                      className="rounded-xl border border-track/40 bg-white p-2.5 shadow-sm space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-deep">
                          {player.role || `Player ${index + 1}`}
                        </span>
                        <span className="text-[10px] font-semibold text-primary bg-cardBg px-2 py-0.5 rounded-full">
                          Slot #{index + 1}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
                        <div>
                          <input
                            type="text"
                            value={player.studentId}
                            aria-label={'Student ID for player ' + (index + 1)}
                            onChange={(e) => {
                              const newRoster = [...roster]
                              newRoster[index] = { ...newRoster[index] }
                              newRoster[index].studentId = e.target.value
                              setRoster(newRoster)
                            }}
                            placeholder="Student ID"
                            className="h-11 w-full rounded-lg border border-track px-2 text-[12px] text-textPrimary"
                            required
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={player.name}
                            aria-label={'Name for player ' + (index + 1)}
                            onChange={(e) => {
                              const newRoster = [...roster]
                              newRoster[index] = { ...newRoster[index] }
                              newRoster[index].name = e.target.value
                              setRoster(newRoster)
                            }}
                            placeholder="Full Name"
                            className="h-11 w-full rounded-lg border border-track px-2 text-[12px] text-textPrimary"
                            required
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={player.section}
                            aria-label={'Section for player ' + (index + 1)}
                            onChange={(e) => {
                              const newRoster = [...roster]
                              newRoster[index] = { ...newRoster[index] }
                              newRoster[index].section = e.target.value
                              setRoster(newRoster)
                            }}
                            placeholder="Section"
                            className="h-11 w-full rounded-lg border border-track px-2 text-[12px] text-textPrimary"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={teamAgreed}
                  onChange={(e) => setTeamAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-track text-primary focus:ring-primary"
                  required
                />
                <span className="text-[12px] text-textSecondary leading-5">
                  {event.registrationOptions?.agreement || 'I confirm that the team registration details are correct.'}
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-track/40">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-[13px] font-semibold text-textSecondary hover:text-textPrimary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit || mutation.busy || mutation.blocked || !teamAgreed || !teamName.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-semibold text-white shadow-card transition-colors duration-150 hover:bg-dark disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>{mutation.busy ? 'Submitting…' : 'Submit Team Bracket'}</span>
                </button>
              </div>
            </fieldset></form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STATE 3: SUCCESS CONFIRMATION                                            */}
        {/* ========================================================================= */}
        {step === 'confirmed' && (
          <div className="py-4 text-center">
            {/* Concentric Green Checkmark Circle */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-cardBg">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                <Check className="h-6 w-6 stroke-[3]" aria-hidden="true" />
              </div>
            </div>

            {/* Title */}
            <h2 ref={heading} tabIndex={-1} id="registration-modal-title" className="mt-4 text-[22px] font-bold text-textPrimary">
              Registration Confirmed
            </h2>

            {/* Confirmation message */}
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-textSecondary">
              Your event registration has been confirmed.
            </p>

            {/* Reference Number Box */}
            <div className="my-5 rounded-2xl border border-ring/40 bg-cardBg p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                Reference Number
              </p>
              <p className="mt-1 text-[18px] font-bold text-deep">
                {mutation.result.id}
              </p>
            </div>

            {/* Return to Dashboard Button */}
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[14px] font-semibold text-white shadow-card transition-colors duration-150 hover:bg-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Return to Dashboard</span>
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  )
}

export default RegistrationModal
