import { Link } from 'react-router-dom'
import PageLayout from '../../components/common/PageLayout.jsx'

// Fallback for unknown URLs.
export default function NotFound() {
  return (
    <PageLayout>
      <section className="flex flex-col items-start gap-3 rounded-panel bg-white p-6 shadow-card">
        <h1 className="text-[20px] font-semibold leading-7 tracking-[-0.5px] text-textPrimary">Page not found</h1>
        <p className="text-[13px] leading-5 text-textSecondary">The page you are looking for does not exist or has moved.</p>
        <Link
          to="/"
          className="rounded-control bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to portal
        </Link>
      </section>
    </PageLayout>
  )
}
