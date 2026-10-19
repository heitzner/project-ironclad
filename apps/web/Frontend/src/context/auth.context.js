import { createContext } from 'react'

export const signedOutSession = Object.freeze({ user: null, capabilities: Object.freeze({}) })

export const AuthContext = createContext({
  ...signedOutSession, loading: false, error: null, status: 'signed-out', refetch: null,
})
