function Footer() {
  return (
    <footer className="box-border border-t border-ring/40 bg-footerBg py-1">
      <div className="mx-auto flex max-w-content items-center justify-between px-8">
        <p className="text-[11px] font-semibold leading-4 tracking-[0.44px] text-deep">
          © 2026 IronClad - University of Caloocan City, Congressional Campus
        </p>
        <nav aria-label="Footer navigation" className="flex items-center gap-4">
          <a href="#privacy-policy" className="text-[11px] font-medium leading-4 tracking-[0.44px] text-deep transition-colors duration-150 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Privacy Policy
          </a>
          <a href="#support" className="text-[11px] font-medium leading-4 tracking-[0.44px] text-deep transition-colors duration-150 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Support
          </a>
        </nav>
      </div>
    </footer>
  )
}

export default Footer
