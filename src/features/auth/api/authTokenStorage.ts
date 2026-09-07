'use client'

export const AUTH_ACCESS_TOKEN_STORAGE_KEY = 'repo.auth.accessToken'
export const AUTH_REFRESH_TOKEN_STORAGE_KEY = 'repo.auth.refreshToken'

export function saveAuthTokens(input: { readonly accessToken: string; readonly refreshToken: string }) {
  window.localStorage.setItem(AUTH_ACCESS_TOKEN_STORAGE_KEY, input.accessToken)
  window.localStorage.setItem(AUTH_REFRESH_TOKEN_STORAGE_KEY, input.refreshToken)
}
