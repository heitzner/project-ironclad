import { useState } from 'react'
import CouncilDialog from '../council/CouncilDialog.jsx'

function Footer() {
  const [information, setInformation] = useState(null)
  return (
    <footer className="box-border border-t border-ring/40 bg-footerBg py-1">
      <div className="mx-auto flex max-w-content flex-col items-center justify-between gap-1 px-4 sm:flex-row sm:gap-4 sm:px-8">
        <p className="text-center text-[11px] font-semibold leading-4 tracking-[0.44px] text-deep sm:text-left">
          © 2026 IronClad - University of Caloocan City, Congressional Campus
        </p>
        <nav aria-label="Footer navigation" className="flex items-center gap-4">
          <button type="button" onClick={() => setInformation('Privacy Policy')} className="flex min-h-11 items-center text-[11px] font-medium leading-4 tracking-[0.44px] text-deep transition-colors duration-150 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-0">
            Privacy Policy
          </button>
          <button type="button" onClick={() => setInformation('Support')} className="flex min-h-11 items-center text-[11px] font-medium leading-4 tracking-[0.44px] text-deep transition-colors duration-150 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-0">
            Support
          </button>
        </nav>
      </div>
      {information && <CouncilDialog open title={information} onClose={() => setInformation(null)}>
        <p className="text-sm leading-6 text-textSecondary">{information === 'Privacy Policy' ? 'The campus privacy policy has not been supplied yet.' : 'Campus support contact information has not been supplied yet.'}</p>
        <button type="button" onClick={() => setInformation(null)} className="mt-4 min-h-11 rounded-control bg-dark px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Close</button>
      </CouncilDialog>}
    </footer>
  )
}

export default Footer
