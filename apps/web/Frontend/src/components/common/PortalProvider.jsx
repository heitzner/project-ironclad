import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import { normalizeSession } from '../../context/session.js'
import LogIn from '../auth/LogIn.jsx'
import { PortalContext, roleDestination } from './portal.context.js'

export default function PortalProvider({ children, authActions }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [login, setLogin] = useState(null)
  const previousPage = useRef(null)
  const scope = JSON.stringify([auth.status, auth.user?.id, auth.user?.role, auth.user?.disabled, auth.user?.status, auth.user?.program, auth.user?.council, auth.user?.councilId, auth.capabilities])
  useEffect(() => {
    const next = `${scope}:${pathname}`
    if (previousPage.current !== null && previousPage.current !== next) document.getElementById('portal-content')?.focus({ preventScroll: true })
    previousPage.current = next
  }, [scope, pathname])
  return <PortalContext.Provider value={{ authActions, openLogin: (mode = 'signin') => setLogin({ mode, scope }) }}>
    <div key={scope}>{children}</div>
    {login?.scope === scope && <LogIn
      initialMode={login.mode}
      handlers={authActions}
      onClose={() => setLogin(null)}
      onSignedIn={async (result) => {
        const current = normalizeSession(result)
        if (!current.user) throw new Error('Sign-in has not been confirmed. Please try again.')
        if (auth.refetch) await auth.refetch()
        setLogin(null)
        navigate(roleDestination(current.user))
      }}
    />}
  </PortalContext.Provider>
}
