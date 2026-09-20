'use client'

import type { AuthLoginRole } from './authApi.types'
import { getAuthRoleFromAccessToken } from './authAccessToken'

export const AUTH_ACCESS_TOKEN_STORAGE_KEY = 'repo.auth.accessToken'
export const AUTH_REFRESH_TOKEN_STORAGE_KEY = 'repo.auth.refreshToken'
const LEGACY_AUTH_LOGIN_ROLE_STORAGE_KEY = 'repo.auth.loginRole'

export function getSavedAuthRole(): AuthLoginRole | undefined {
  const accessToken = getSavedAccessToken()

  return accessToken ? getAuthRoleFromAccessToken(accessToken) : undefined
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
  window.localStorage.removeItem(LEGACY_AUTH_LOGIN_ROLE_STORAGE_KEY)
}

export function clearAuthTokens() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(AUTH_ACCESS_TOKEN_STORAGE_KEY)
  window.localStorage.removeItem(AUTH_REFRESH_TOKEN_STORAGE_KEY)
  window.localStorage.removeItem(LEGACY_AUTH_LOGIN_ROLE_STORAGE_KEY)
}
