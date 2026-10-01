'use client'

import { refreshAuthToken } from './authApi'
import type { AuthLoginRole } from './authApi.types'
import { clearAuthTokens, getAuthSessionGeneration, getSavedAccessToken, getSavedAuthRole, getSavedRefreshToken, saveAuthAccessToken } from './authTokenStorage'

export function captureAuthSession() {
  return { generation: getAuthSessionGeneration(), refreshToken: getSavedRefreshToken(), accessToken: getSavedAccessToken() }
}

type AuthSession = ReturnType<typeof captureAuthSession>
type SessionFailure =
  | { readonly kind: 'invalid' | 'stale'; readonly session: AuthSession }
  | { readonly kind: 'retryable'; readonly message: string; readonly session: AuthSession }
type SessionRefreshResult = SessionFailure | { readonly kind: 'ready'; readonly accessToken: string; readonly session: AuthSession }
type AuthorizedRoleResult = SessionFailure | { readonly kind: 'authorized'; readonly role: AuthLoginRole; readonly session: AuthSession }

export function isCurrentAuthSession(session: AuthSession) {
  return session.generation === getAuthSessionGeneration() && session.refreshToken === getSavedRefreshToken()
}

let refreshFlight: { readonly session: AuthSession; readonly promise: Promise<SessionRefreshResult> } | undefined

export async function refreshAuthSession(session: AuthSession): Promise<SessionRefreshResult> {
  if (!isCurrentAuthSession(session)) return { kind: 'stale', session }
  if (!session.refreshToken) return { kind: 'invalid', session }
  if (refreshFlight && isCurrentAuthSession(refreshFlight.session)) return refreshFlight.promise
  const accessToken = getSavedAccessToken()
  if (accessToken && accessToken !== session.accessToken) return { kind: 'ready', accessToken, session }

  const promise = refreshAuthToken({ refreshToken: session.refreshToken }).then((result): SessionRefreshResult => {
    if (!isCurrentAuthSession(session)) return { kind: 'stale', session }
    switch (result.kind) {
      case 'success':
        saveAuthAccessToken(result.token.accessToken)
        return { kind: 'ready', accessToken: result.token.accessToken, session }
      case 'invalid-refresh-token':
        clearAuthTokens()
        return { kind: 'invalid', session: captureAuthSession() }
      case 'configuration-error':
      case 'network-error':
      case 'server-error':
        return { kind: 'retryable', message: result.message, session }
    }
  }).finally(() => {
    if (refreshFlight?.promise === promise) refreshFlight = undefined
  })
  refreshFlight = { session, promise }
  return promise
}

export async function getAuthorizedRole(): Promise<AuthorizedRoleResult> {
  const session = captureAuthSession()
  const savedRole = getSavedAuthRole()
  if (savedRole) return { kind: 'authorized', role: savedRole, session }
  const result = await refreshAuthSession(session)
  if (!isCurrentAuthSession(result.session)) return { kind: 'stale', session }
  if (result.kind !== 'ready') return result
  const role = getSavedAuthRole()
  return role
    ? { kind: 'authorized', role, session }
    : { kind: 'retryable', message: '인증 응답을 확인하지 못했습니다. 다시 시도해주세요.', session }
}
