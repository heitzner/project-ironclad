import { CheckCircle2, ShieldCheck, X } from 'lucide-react'
import ModalShell from './ModalShell.jsx'

export function PrivacyPolicyModal({ isOpen, onClose, sections }) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      titleId="privacy-policy-title"
      maxWidth="max-w-[660px]"
      showTopBar={true}
    >
      <div className="p-6">
        <div className="flex flex-col-reverse items-stretch justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cardBg text-dark">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.44px] text-dark">
                Campus Information
              </p>
              <h2 id="privacy-policy-title" className="text-[20px] font-bold leading-7 text-textPrimary">
                Privacy Policy & Data Governance
              </h2>
              <p className="mt-0.5 text-[12px] leading-[18px] text-textSecondary">
                Campus policy information will appear here when it is available.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-full text-textMuted transition-colors duration-150 hover:bg-pageBg hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:self-auto"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 max-h-[300px] overflow-y-auto rounded-2xl bg-selectBg/50 p-5 space-y-4 border border-track/40">
          {Array.isArray(sections) && sections.length ? sections.map((section, index) => <section key={index}>
            <h3 className="text-sm font-bold text-textPrimary">{section.title}</h3>
            <p className="mt-1 text-xs leading-5 text-textSecondary">{section.body}</p>
          </section>) : <p className="text-sm text-textSecondary">The campus privacy policy has not been supplied yet.</p>}
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
