import { useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import PageLayout from '../../components/common/PageLayout.jsx'
import { roleDestination, usePortal } from '../../components/common/portal.context.js'
import useAuth from '../../hooks/useAuth.js'

// Incoming /login links open the established modal and its shared session callbacks.
export default function LoginModal() {
  const auth = useAuth()
  const portal = usePortal()
  const openLogin = portal?.openLogin
  useEffect(() => { if (auth.status === 'signed-out') openLogin?.() }, [auth.status, openLogin])
  if (auth.status === 'authenticated') return <Navigate to={roleDestination(auth.user)} replace />
  return <PageLayout>
    <section className="mx-auto grid w-full max-w-[420px] gap-4 rounded-card bg-white p-6 shadow-card">
      <h1 className="text-xl font-semibold text-textPrimary">Sign in</h1>
      <button type="button" onClick={() => openLogin?.()} disabled={!openLogin} className="min-h-11 rounded-control bg-dark px-4 text-sm font-semibold text-white">Open sign in</button>
      <Link to="/account-reset" className="text-sm font-semibold text-dark underline">Reset account</Link>
    </section>
  </PageLayout>
}
