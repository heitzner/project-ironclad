import { useState } from 'react'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Gamepad2,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react'
import ModalShell from './ModalShell.jsx'

export function RegistrationModal({ isOpen, onClose, event, onSuccess }) {
  // Step state: 'individual' (State 1), 'team' (State 2), or 'confirmed' (State 3)
  const [step, setStep] = useState('individual')

  // Form state for Individual Registration (State 1)
  const [studentId, setStudentId] = useState('2024-00123')
  const [fullName, setFullName] = useState('Ashley Gabrielle C. Alcantara')
  const [section, setSection] = useState('CS 3A')
  const [playingCategory, setPlayingCategory] = useState("Women's Singles")
  const [emergencyContact, setEmergencyContact] = useState('+63 912 345 6789')
  const [individualAgreed, setIndividualAgreed] = useState(true)

  // Form state for Team Registration (State 2)
  const [teamName, setTeamName] = useState('Cyber Knights')
  const [teamAgreed, setTeamAgreed] = useState(true)
  const [roster, setRoster] = useState([
    { id: '1', role: 'Team Captain', studentId: '2024-00123', name: 'Ashley Gabrielle C. Alcantara', section: 'CS 3A' },
    { id: '2', role: 'Player 2', studentId: '2024-00188', name: 'Marco Luis Santos', section: 'CS 3A' },
    { id: '3', role: 'Player 3', studentId: '2024-00245', name: 'Elijah Lance Reyes', section: 'CS 3B' },
    { id: '4', role: 'Player 4', studentId: '2024-00312', name: 'Janine Rose Cruz', section: 'CS 3A' },
    { id: '5', role: 'Player 5', studentId: '2024-00450', name: 'Derrick James Tan', section: 'CS 3C' },
  ])

  // When a new event is opened, automatically pick State 1 (individual) or State 2 (team).
  // Adjusting state during render (not in an effect) avoids a cascading re-render.
  const openedEvent = isOpen ? event : null
  const [lastOpenedEvent, setLastOpenedEvent] = useState(null)
  if (openedEvent !== lastOpenedEvent) {
    setLastOpenedEvent(openedEvent)
    if (openedEvent) {
      // Check if event is a team event based on actionLabel or category
      const isTeamEvent =
        openedEvent.actionLabel?.toLowerCase().includes('team') ||
        openedEvent.category?.toLowerCase() === 'esports' ||
        openedEvent.title?.toLowerCase().includes('tournament') ||
        openedEvent.metricLabel?.toLowerCase().includes('team')

      // Set modal to 'team' if team event, otherwise 'individual'
      setStep(isTeamEvent ? 'team' : 'individual')
    }
  }

  // Reset and close handler
  const handleClose = () => {
    onClose?.()
  }

  // Handle successful form submission (transitions to State 3: Confirmed)
  const handleConfirmSubmit = (e) => {
    e.preventDefault()
    // Transition modal into confirmation state
    setStep('confirmed')
    // Notify parent component to update mock numbers
    onSuccess?.()
  }

  if (!event) return null

  // Format short subtitle for the event header without any em-dashes
  const eventSubtitle = `Event: ${event.title} • ${event.venue}`

  return (
    <ModalShell
      isOpen={isOpen}
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
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-textMuted transition-colors duration-150 hover:bg-pageBg hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

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

            <form onSubmit={handleConfirmSubmit} className="mt-5 space-y-4">
              {/* Participant Details Card */}
              <div className="rounded-2xl border border-track/50 bg-selectBg/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.44px] text-textPrimary">
                    Participant Details
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-cardBg px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                    <RefreshCw className="h-3 w-3 animate-spin-slow text-primary" aria-hidden="true" />
                    <span>Auto-lookup Active</span>
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
                    value={playingCategory}
                    onChange={(e) => setPlayingCategory(e.target.value)}
                    className="h-11 w-full appearance-none rounded-xl border border-track bg-white px-3.5 pr-10 text-[13px] font-medium text-textPrimary focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="Women's Singles">Women's Singles</option>
                    <option value="Men's Singles">Men's Singles</option>
                    <option value="Women's Doubles">Women's Doubles</option>
                    <option value="Men's Doubles">Men's Doubles</option>
                    <option value="Mixed Doubles">Mixed Doubles</option>
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
                  I confirm I am physically fit to participate in CSD athletic events.
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
                  disabled={!individualAgreed}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-semibold text-white shadow-card transition-colors duration-150 hover:bg-dark disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>Confirm Registration</span>
                </button>
              </div>
            </form>
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

            <form onSubmit={handleConfirmSubmit} className="mt-5 space-y-4">
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

              {/* Roster Setup: 5 Players list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.44px] text-textPrimary">
                    Roster Setup (5 Players)
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>5 of 5 Required</span>
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
                            onChange={(e) => {
                              const newRoster = [...roster]
                              newRoster[index].studentId = e.target.value
                              setRoster(newRoster)
                            }}
                            placeholder="Student ID"
                            className="h-8 w-full rounded-lg border border-track px-2 text-[12px] text-textPrimary"
                            required
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={player.name}
                            onChange={(e) => {
                              const newRoster = [...roster]
                              newRoster[index].name = e.target.value
                              setRoster(newRoster)
                            }}
                            placeholder="Full Name"
                            className="h-8 w-full rounded-lg border border-track px-2 text-[12px] text-textPrimary"
                            required
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={player.section}
                            onChange={(e) => {
                              const newRoster = [...roster]
                              newRoster[index].section = e.target.value
                              setRoster(newRoster)
                            }}
                            placeholder="Section"
                            className="h-8 w-full rounded-lg border border-track px-2 text-[12px] text-textPrimary"
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
                  I confirm all 5 team members are active CSD enrolled students.
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
                  disabled={!teamAgreed || !teamName.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-semibold text-white shadow-card transition-colors duration-150 hover:bg-dark disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>Submit Team Bracket</span>
                </button>
              </div>
            </form>
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
            <h2 id="registration-modal-title" className="mt-4 text-[22px] font-bold text-textPrimary">
              Registration Confirmed
            </h2>

            {/* Confirmation message */}
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-textSecondary">
              Your registration has been successfully recorded for the event. A copy of your digital pass and confirmation details have been synced to your school email.
            </p>

            {/* Reference Number Box */}
            <div className="my-5 rounded-2xl border border-ring/40 bg-cardBg p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                Reference Number
              </p>
              <p className="mt-1 text-[18px] font-bold text-deep">
                #REG-2026-0042
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
