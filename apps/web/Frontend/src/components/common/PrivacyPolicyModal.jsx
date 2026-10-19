import { CheckCircle2, ShieldCheck, X } from 'lucide-react'
import ModalShell from './ModalShell.jsx'

export function PrivacyPolicyModal({ isOpen, onClose }) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      titleId="privacy-policy-title"
      maxWidth="max-w-[660px]"
      showTopBar={true}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cardBg text-dark">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.44px] text-dark">
                Institutional Compliance
              </p>
              <h2 id="privacy-policy-title" className="text-[20px] font-bold leading-7 text-textPrimary">
                Privacy Policy & Data Governance
              </h2>
              <p className="mt-0.5 text-[12px] leading-[18px] text-textSecondary">
                Please review how IronClad handles your student credentials and campus venue records.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-textMuted transition-colors duration-150 hover:bg-pageBg hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 max-h-[300px] overflow-y-auto rounded-2xl bg-selectBg/50 p-5 space-y-4 border border-track/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-dark shrink-0" aria-hidden="true" />
              <h3 className="text-[13px] font-bold text-textPrimary">
                Section 1: Data Synchronization
              </h3>
            </div>
            <p className="mt-1 pl-4 text-[12px] leading-5 text-textSecondary">
              IronClad utilizes your Student ID to fetch official registry data (Name, Course, Section) strictly for venue accountability and campaign asset generation.
            </p>
          </div>

          <div className="border-t border-track/60 pt-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-dark shrink-0" aria-hidden="true" />
              <h3 className="text-[13px] font-bold text-textPrimary">
                Section 2: Usage Context
              </h3>
            </div>
            <p className="mt-1 pl-4 text-[12px] leading-5 text-textSecondary">
              Biometric and physical access data are not stored locally. Venue lock requests are transmitted directly to the MIS Administrator dashboard.
            </p>
          </div>

          <div className="border-t border-track/60 pt-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-dark shrink-0" aria-hidden="true" />
              <h3 className="text-[13px] font-bold text-textPrimary">
                Section 3: Archiving
              </h3>
            </div>
            <p className="mt-1 pl-4 text-[12px] leading-5 text-textSecondary">
              Approved reservations and generated campaign artifacts are permanently retained in the Events Archive for institutional auditing purposes.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-dark text-[14px] font-semibold text-white shadow-card transition-colors duration-150 hover:bg-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>Acknowledge & Close</span>
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

export default PrivacyPolicyModal
