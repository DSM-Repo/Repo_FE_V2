'use client'

import type { AuthLoginRole } from './authApi.types'

export const AUTH_ACCESS_TOKEN_STORAGE_KEY = 'repo.auth.accessToken'
export const AUTH_LOGIN_ROLE_STORAGE_KEY = 'repo.auth.loginRole'
export const AUTH_REFRESH_TOKEN_STORAGE_KEY = 'repo.auth.refreshToken'

function isAuthLoginRole(value: string | null): value is AuthLoginRole {
  return value === 'student' || value === 'teacher'
}

export function getSavedAuthRole(): AuthLoginRole | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  const role = window.localStorage.getItem(AUTH_LOGIN_ROLE_STORAGE_KEY)

  return isAuthLoginRole(role) ? role : undefined
}

export function getSavedAccessToken(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  try {
    const accessToken = window.localStorage.getItem(AUTH_ACCESS_TOKEN_STORAGE_KEY)?.trim()

    return accessToken || undefined
  } catch (error) {
    if (error instanceof DOMException || error instanceof Error) {
      console.warn('저장된 인증 토큰을 읽지 못했습니다.', error)
      return undefined
    }

    throw error
  }
}

export function getSavedRefreshToken(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  try {
    const refreshToken = window.localStorage.getItem(AUTH_REFRESH_TOKEN_STORAGE_KEY)?.trim()

    return refreshToken || undefined
  } catch (error) {
    if (error instanceof DOMException || error instanceof Error) {
      console.warn('저장된 refresh 토큰을 읽지 못했습니다.', error)
      return undefined
    }

    throw error
  }
}

export function saveAuthRole(role: AuthLoginRole) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(AUTH_LOGIN_ROLE_STORAGE_KEY, role)
}

export function saveAuthAccessToken(accessToken: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(AUTH_ACCESS_TOKEN_STORAGE_KEY, accessToken)
}

export function saveAuthTokens(input: { readonly accessToken: string; readonly refreshToken: string }) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(AUTH_ACCESS_TOKEN_STORAGE_KEY, input.accessToken)
  window.localStorage.setItem(AUTH_REFRESH_TOKEN_STORAGE_KEY, input.refreshToken)
}

export function clearAuthTokens() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(AUTH_ACCESS_TOKEN_STORAGE_KEY)
  window.localStorage.removeItem(AUTH_REFRESH_TOKEN_STORAGE_KEY)
}
