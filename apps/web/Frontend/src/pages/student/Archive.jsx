import PageLayout from '../../components/common/PageLayout.jsx'
import PortalState from '../../components/common/PortalState.jsx'
import useAuth from '../../hooks/useAuth.js'

function Archive() {
  const auth = useAuth()
  return <PageLayout>{auth.status !== 'authenticated' ? <PortalState /> : <PortalState state="unavailable" title="Student archive is not connected yet" description="Archived student content will appear here when this feature is delivered." />}</PageLayout>
}

export default Archive
