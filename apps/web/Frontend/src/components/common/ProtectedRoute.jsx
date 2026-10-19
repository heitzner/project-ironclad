import { Link } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import PageLayout from './PageLayout.jsx'
import ViewState from './ViewState.jsx'

// Route gate for signed-in pages. requireAuth stays off until a session source
// is connected, so pages stay reachable and show their own signed-out states.
export default function ProtectedRoute({ children, requireAuth = false }) {
  const { user, loading } = useAuth()
  if (!requireAuth || user) return children

  return (
    <PageLayout>
      <ViewState state={loading ? 'loading' : 'signed-out'}>
        {!loading && (
          <Link
            to="/login"
            className="rounded-control bg-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Go to sign in
          </Link>
        )}
      </ViewState>
    </PageLayout>
  )
}
