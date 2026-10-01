'use client'

import { captureAuthSession, isCurrentAuthSession, refreshAuthSession } from './authSessionRefresh'

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

export async function sendAuthenticatedRequest(input: AuthenticatedRequestInput): Promise<AuthenticatedRequestResponse> {
  const session = captureAuthSession()
  const firstResponse = await sendRequest(input)

  if (firstResponse.kind !== 'response' || !isAuthRejectedResponse(firstResponse.value)) {
    return firstResponse
  }

  if (!session.refreshToken) return firstResponse
  const result = await refreshAuthSession(session)
  if (!isCurrentAuthSession(result.session)) return firstResponse
  if (result.kind !== 'ready') {
    if (result.kind === 'invalid') redirectToLogin()
    return firstResponse
  }

  firstResponse.complete()
  return sendRequest({
    ...input,
    init: withAccessToken(input.init, result.accessToken),
  })
}
