import { User } from '@/types'

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const userStr = localStorage.getItem('user')
    if (!userStr) return null
    return JSON.parse(userStr) as User
  } catch {
    return null
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

export function setAuthData(data: { access: string; refresh: string; user: User }) {
  localStorage.setItem('access_token', data.access)
  localStorage.setItem('refresh_token', data.refresh)
  localStorage.setItem('user', JSON.stringify(data.user))
}

export function clearAuthData() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

export function isAuthenticated(): boolean {
  return !!getAccessToken()
}

export function hasRole(user: User | null, roles: string[]): boolean {
  if (!user) return false
  return roles.includes(user.role)
}
