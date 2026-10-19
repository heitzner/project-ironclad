function Footer() {
  return (
    <footer className="box-border border-t border-ring/40 bg-footerBg py-1">
      <div className="mx-auto flex max-w-content flex-col items-center justify-between gap-1 px-4 sm:flex-row sm:gap-4 sm:px-8">
        <p className="text-center text-[11px] font-semibold leading-4 tracking-[0.44px] text-deep sm:text-left">
          © 2026 IronClad - University of Caloocan City, Congressional Campus
        </p>
        <nav aria-label="Footer navigation" className="flex items-center gap-4">
          <a href="#privacy-policy" className="flex min-h-11 items-center text-[11px] font-medium leading-4 tracking-[0.44px] text-deep transition-colors duration-150 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-0">
            Privacy Policy
          </a>
          <a href="#support" className="flex min-h-11 items-center text-[11px] font-medium leading-4 tracking-[0.44px] text-deep transition-colors duration-150 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-0">
            Support
          </a>
        </nav>
      </div>
    </footer>
  )
}

export default Footer
