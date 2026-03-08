import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { clearAuthToken, getAuthToken, setAuthToken } from '../lib/authToken'

const AuthCtx = createContext({
  user: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  googleLogin: async () => {},
  logout: () => {}
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const bootstrap = async () => {
      const token = getAuthToken()
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const { data } = await api.get('/auth/me')
        setUser(data?.user || null)
      } catch {
        clearAuthToken()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    login: async ({ email, password }) => {
      const { data } = await api.post('/auth/login', { email, password })
      setAuthToken(data?.token)
      setUser(data?.user || null)
      return data
    },
    signup: async ({ email, password, name }) => {
      const { data } = await api.post('/auth/signup', { email, password, name })
      setAuthToken(data?.token)
      setUser(data?.user || null)
      return data
    },
    googleLogin: async ({ credential }) => {
      const { data } = await api.post('/auth/google', { credential })
      setAuthToken(data?.token)
      setUser(data?.user || null)
      return data
    },
    logout: () => {
      clearAuthToken()
      setUser(null)
    }
  }), [loading, user])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
