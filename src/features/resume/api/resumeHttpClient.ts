'use client'

import type { ResumeDetailInput } from './resumeApi.types'

type ResumeApiConfig =
  | {
      readonly baseUrl: string
      readonly kind: 'ready'
    }
  | {
      readonly kind: 'invalid'
      readonly message: string
    }

export type ResumeRequestFailure = {
  readonly kind: 'configuration-error' | 'network-error'
  readonly message: string
}

export type ResumeRequestResponse =
  | ResumeRequestFailure
  | {
      readonly kind: 'response'
      readonly value: Response
    }

const RESUME_REQUEST_TIMEOUT_MS = 8_000
const RESUME_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? process.env.NEXT_PUBLIC_AUTH_API_BASE_URL?.trim()

function getResumeApiConfig(): ResumeApiConfig {
  if (!RESUME_API_BASE_URL) {
    return {
      kind: 'invalid',
      message: 'API 주소가 설정되지 않았습니다.',
    }
  }

  try {
    return {
      baseUrl: new URL(RESUME_API_BASE_URL).href,
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

function buildResumeUrl(baseUrl: string, resumeId: string) {
  const encodedResumeId = encodeURIComponent(resumeId)
  return new URL(`resume/${encodedResumeId}`, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).href
}

export async function getResumeRequest(input: ResumeDetailInput): Promise<ResumeRequestResponse> {
  const config = getResumeApiConfig()

  if (config.kind === 'invalid') {
    return {
      kind: 'configuration-error',
      message: config.message,
    }
  }

  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(() => controller.abort(), RESUME_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(buildResumeUrl(config.baseUrl, input.resumeId), {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
      method: 'GET',
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
        message: '이력서 API에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.',
      }
    }

    throw error
  } finally {
    globalThis.clearTimeout(timeoutId)
  }
}
