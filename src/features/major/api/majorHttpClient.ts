'use client'

import type { MajorAuthInput, MajorCreateInput, MajorDeleteInput } from './majorApi.types'
import { sendAuthenticatedRequest } from '../../auth/api/authenticatedRequest'

type MajorApiConfig =
  | {
      readonly baseUrl: string
      readonly kind: 'ready'
    }
  | {
      readonly kind: 'invalid'
      readonly message: string
    }

export type MajorRequestFailure = {
  readonly kind: 'configuration-error' | 'network-error'
  readonly message: string
}

export type MajorRequestResponse =
  | MajorRequestFailure
  | {
      readonly complete: () => void
      readonly kind: 'response'
      readonly value: Response
    }

const MAJOR_REQUEST_TIMEOUT_MS = 8_000
const MAJOR_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()

function getMajorApiConfig(): MajorApiConfig {
  if (!MAJOR_API_BASE_URL) {
    return {
      kind: 'invalid',
      message: 'API 주소가 설정되지 않았습니다.',
    }
  }

  try {
    return {
      baseUrl: new URL(MAJOR_API_BASE_URL).href,
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

function buildMajorUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).href
}

function buildAuthorizationHeader(input: MajorAuthInput) {
  return {
    Authorization: `Bearer ${input.accessToken}`,
  }
}

async function sendMajorRequest(path: string, init: RequestInit): Promise<MajorRequestResponse> {
  const config = getMajorApiConfig()

  if (config.kind === 'invalid') {
    return {
      kind: 'configuration-error',
      message: config.message,
    }
  }

  return sendAuthenticatedRequest({
    init,
    networkErrorMessage: '전공 API에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.',
    timeoutMs: MAJOR_REQUEST_TIMEOUT_MS,
    url: buildMajorUrl(config.baseUrl, path),
  })
}

export async function getMajorsRequest(input: MajorAuthInput): Promise<MajorRequestResponse> {
  return sendMajorRequest('major', {
    headers: buildAuthorizationHeader(input),
    method: 'GET',
  })
}

export async function postMajorRequest(input: MajorCreateInput): Promise<MajorRequestResponse> {
  return sendMajorRequest('major', {
    body: JSON.stringify({ name: input.name }),
    headers: {
      ...buildAuthorizationHeader(input),
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
}

export async function deleteMajorRequest(input: MajorDeleteInput): Promise<MajorRequestResponse> {
  return sendMajorRequest(`major/${encodeURIComponent(String(input.majorId))}`, {
    headers: buildAuthorizationHeader(input),
    method: 'DELETE',
  })
}
