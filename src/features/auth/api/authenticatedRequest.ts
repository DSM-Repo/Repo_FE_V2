'use client'

import { refreshAuthToken } from './authApi'
import { clearAuthTokens, getSavedRefreshToken, saveAuthAccessToken } from './authTokenStorage'

type AuthenticatedRequestInput = {
  readonly init: RequestInit
  readonly networkErrorMessage: string
  readonly timeoutMs: number
  readonly url: string
}

export type AuthenticatedRequestResponse =
  | {
      readonly kind: 'network-error'
      readonly message: string
    }
  | {
      readonly complete: () => void
      readonly kind: 'response'
      readonly value: Response
    }

function isAuthRejectedResponse(response: Response) {
  return response.status === 401 || response.status === 403
}

function redirectToLogin() {
  clearAuthTokens()

  if (typeof window === 'undefined') {
    return
  }

  if (window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}

function withAccessToken(init: RequestInit, accessToken: string): RequestInit {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${accessToken}`)

  return {
    ...init,
    headers,
  }
}

async function sendRequest(input: AuthenticatedRequestInput): Promise<AuthenticatedRequestResponse> {
  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(() => controller.abort(), input.timeoutMs)
  const complete = () => globalThis.clearTimeout(timeoutId)

  try {
    const response = await fetch(input.url, {
      ...input.init,
      signal: controller.signal,
    })

    return {
      complete,
      kind: 'response',
      value: response,
    }
  } catch (error) {
    complete()

    if (error instanceof DOMException || error instanceof TypeError) {
      return {
        kind: 'network-error',
        message: input.networkErrorMessage,
      }
    }

    throw error
  }
}

function reuseRejectedResponse(response: Response): AuthenticatedRequestResponse {
  return {
    complete: () => undefined,
    kind: 'response',
    value: response,
  }
}

export async function sendAuthenticatedRequest(input: AuthenticatedRequestInput): Promise<AuthenticatedRequestResponse> {
  const firstResponse = await sendRequest(input)

  if (firstResponse.kind !== 'response' || !isAuthRejectedResponse(firstResponse.value)) {
    return firstResponse
  }

  firstResponse.complete()

  const refreshToken = getSavedRefreshToken()

  if (!refreshToken) {
    redirectToLogin()
    return reuseRejectedResponse(firstResponse.value)
  }

  const refreshResult = await refreshAuthToken({ refreshToken })

  if (refreshResult.kind !== 'success') {
    redirectToLogin()
    return reuseRejectedResponse(firstResponse.value)
  }

  saveAuthAccessToken(refreshResult.token.accessToken)

  const retryResponse = await sendRequest({
    ...input,
    init: withAccessToken(input.init, refreshResult.token.accessToken),
  })

  if (retryResponse.kind === 'response' && isAuthRejectedResponse(retryResponse.value)) {
    retryResponse.complete()
    redirectToLogin()
    return reuseRejectedResponse(retryResponse.value)
  }

  return retryResponse
}
