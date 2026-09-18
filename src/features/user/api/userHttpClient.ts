'use client'

import type { UserMeInput } from './userApi.types'
import { sendAuthenticatedRequest } from '../../auth/api/authenticatedRequest'

type UserApiConfig =
  | {
      readonly baseUrl: string
      readonly kind: 'ready'
    }
  | {
      readonly kind: 'invalid'
      readonly message: string
    }

export type UserRequestFailure = {
  readonly kind: 'configuration-error' | 'network-error'
  readonly message: string
}

export type UserRequestResponse =
  | UserRequestFailure
  | {
      readonly complete: () => void
      readonly kind: 'response'
      readonly value: Response
    }

const USER_REQUEST_TIMEOUT_MS = 8_000
const USER_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()

function getUserApiConfig(): UserApiConfig {
  if (!USER_API_BASE_URL) {
    return {
      kind: 'invalid',
      message: 'API 주소가 설정되지 않았습니다.',
    }
  }

  try {
    return {
      baseUrl: new URL(USER_API_BASE_URL).href,
      kind: 'ready',
    }
  } catch (error) {
    if (error instanceof TypeError) {
      return {
        kind: 'invalid',
        message: 'API 주소 형식이 올바르지 않습니다.',
      }
    }

    throw error
  }
}

function buildUserUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).href
}

async function sendUserRequest(path: string, init: RequestInit): Promise<UserRequestResponse> {
  const config = getUserApiConfig()

  if (config.kind === 'invalid') {
    return {
      kind: 'configuration-error',
      message: config.message,
    }
  }

  return sendAuthenticatedRequest({
    init,
    networkErrorMessage: '내 정보 API에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.',
    timeoutMs: USER_REQUEST_TIMEOUT_MS,
    url: buildUserUrl(config.baseUrl, path),
  })
}

export async function getUserMeRequest(input: UserMeInput): Promise<UserRequestResponse> {
  return sendUserRequest('user', {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    method: 'GET',
  })
}
