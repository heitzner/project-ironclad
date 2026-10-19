import PageLayout from '../../components/common/PageLayout.jsx'
import PortalState from '../../components/common/PortalState.jsx'
import useAuth from '../../hooks/useAuth.js'

function Profile() {
  const auth = useAuth()
  return <PageLayout>{auth.status !== 'authenticated' ? <PortalState /> : <PortalState state="unavailable" title="Account settings are not connected yet" description="Profile details and account changes will be available when this feature is delivered." />}</PageLayout>
}

export default Profile
