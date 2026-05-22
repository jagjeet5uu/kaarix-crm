'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, createElement } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/api'
import { setAuthData, clearAuthData, getStoredUser, getAccessToken } from '@/lib/auth'
import { User } from '@/types'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const storedUser = getStoredUser()
    const token = getAccessToken()
    if (storedUser && token) {
      setUser(storedUser)
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const response = await authAPI.login({ username, password })
    const { access_token, refresh_token, user: userData } = response.data
    setAuthData({ access: access_token, refresh: refresh_token, user: userData })
    setUser(userData)
    router.push('/dashboard')
  }, [router])

  const logout = useCallback(() => {
    clearAuthData()
    setUser(null)
    router.push('/login')
  }, [router])

  return createElement(
    AuthContext.Provider,
    { value: { user, isAuthenticated: !!user, isLoading, login, logout } },
    children
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
