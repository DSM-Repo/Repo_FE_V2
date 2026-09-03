'use client'

import type { AuthEmailSendInput, AuthEmailVerifyInput, AuthLoginInput, AuthRefreshInput, AuthSignupInput } from './authApi.types'

type AuthApiConfig =
  | {
      readonly kind: 'ready'
      readonly baseUrl: string
    }
  | {
      readonly kind: 'invalid'
      readonly message: string
    }

type AuthJsonRequestInput = AuthEmailSendInput | AuthEmailVerifyInput | AuthLoginInput | AuthSignupInput
type AuthJsonRequestPath = 'user/email/send' | 'user/email/verify' | 'user/login' | 'user/signup'
type AuthRefreshRequestPath = 'user/refresh'
export type AuthRequestFailure = {
  readonly kind: 'configuration-error' | 'network-error'
  readonly message: string
}
export type AuthRequestResponse =
  | AuthRequestFailure
  | {
      readonly kind: 'response'
      readonly value: Response
    }

const AUTH_REQUEST_TIMEOUT_MS = 8_000
const AUTH_API_BASE_URL = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL?.trim()

function getAuthApiConfig(): AuthApiConfig {
  if (!AUTH_API_BASE_URL) {
    return {
      kind: 'invalid',
      message: 'auth API 주소가 설정되지 않았습니다.',
    }
  }

  try {
    return {
      kind: 'ready',
      baseUrl: new URL(AUTH_API_BASE_URL).href,
    }
  } catch (error) {
    if (error instanceof TypeError) {
      return {
        kind: 'invalid',
        message: 'auth API 주소 형식이 올바르지 않습니다.',
      }
    }

    throw error
  }
}

function buildAuthUrl(baseUrl: string, path: AuthJsonRequestPath | AuthRefreshRequestPath) {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).href
}

async function postAuthRequest(path: AuthJsonRequestPath | AuthRefreshRequestPath, init: RequestInit): Promise<AuthRequestResponse> {
  const config = getAuthApiConfig()

  if (config.kind === 'invalid') {
    return {
      kind: 'configuration-error',
      message: config.message,
    }
  }

  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(buildAuthUrl(config.baseUrl, path), {
      ...init,
      method: 'POST',
      signal: controller.signal,
    })

    return {
      kind: 'response',
      value: response,
    }
  } catch (error) {
    if (error instanceof DOMException || error instanceof TypeError) {
      return {
        kind: 'network-error',
        message: 'auth API에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.',
      }
    }

    throw error
  } finally {
    globalThis.clearTimeout(timeoutId)
  }
}

export async function postAuthJsonRequest(path: AuthJsonRequestPath, input: AuthJsonRequestInput): Promise<AuthRequestResponse> {
  return postAuthRequest(path, {
    body: JSON.stringify(input),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export async function postAuthRefreshRequest(input: AuthRefreshInput): Promise<AuthRequestResponse> {
  return postAuthRequest('user/refresh', {
    headers: {
      'Refresh-Token': input.refreshToken,
    },
  })
}
