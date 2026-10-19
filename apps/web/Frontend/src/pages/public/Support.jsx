import { LifeBuoy } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader.jsx'
import PageLayout from '../../components/common/PageLayout.jsx'

// Support landing page; contact channels will come from the API once available.
export default function Support() {
  return (
    <PageLayout>
      <PageHeader icon={LifeBuoy} title="Support" subtitle="Help with your IronClad account, bookings, and events." />
      <section className="rounded-panel bg-white p-6 shadow-card">
        <p className="text-[13px] leading-5 text-textSecondary">
          Support channels are not connected yet. Please contact Student Affairs or the campus IT Helpdesk in person.
        </p>
      </section>
    </PageLayout>
  )
}
