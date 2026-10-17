import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, setUnauthorizedHandler, tokenStore } from './api'
import type { Role, User } from './types'

interface AuthState {
  user: User | null
  /** true while the stored token is being validated on app start */
  loading: boolean
  isOwner: boolean
  login: (username: string, password: string) => Promise<User>
  logout: () => void
  hasRole: (...roles: Role[]) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(() => tokenStore.get() !== null)

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [logout])

  // Validate the stored token (also picks up role / deactivation changes).
  useEffect(() => {
    if (!tokenStore.get()) return
    api.me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username.trim(), password)
    tokenStore.set(res.accessToken)
    queryClient.clear()
    setUser(res.user)
    return res.user
  }, [queryClient])

  const value = useMemo<AuthState>(() => ({
    user,
    loading,
    isOwner: user?.role === 'OWNER',
    login,
    logout,
    hasRole: (...roles) => !!user && roles.includes(user.role),
  }), [user, loading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
