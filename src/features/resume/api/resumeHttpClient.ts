'use client'

import type {
  ResumeAutoSaveInput,
  ResumeDetailInput,
  ResumeSaveInput,
  ResumeStudentStatusListInput,
  ResumeSubmissionInput,
  ResumeVisibilityInput,
} from './resumeApi.types'
import { sendAuthenticatedRequest } from '../../auth/api/authenticatedRequest'

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
      readonly complete: () => void
      readonly kind: 'response'
      readonly value: Response
    }

const RESUME_REQUEST_TIMEOUT_MS = 8_000
const RESUME_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()

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

function buildResumeUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).href
}

async function sendResumeRequest(path: string, init: RequestInit): Promise<ResumeRequestResponse> {
  const config = getResumeApiConfig()

  if (config.kind === 'invalid') {
    return {
      kind: 'configuration-error',
      message: config.message,
    }
  }

  return sendAuthenticatedRequest({
    init,
    networkErrorMessage: '이력서 API에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.',
    timeoutMs: RESUME_REQUEST_TIMEOUT_MS,
    url: buildResumeUrl(config.baseUrl, path),
  })
}

export async function getResumeRequest(input: ResumeDetailInput): Promise<ResumeRequestResponse> {
  const encodedResumeId = encodeURIComponent(input.resumeId)

  return sendResumeRequest(`resume/${encodedResumeId}`, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    method: 'GET',
  })
}

export async function getResumeStudentStatusesRequest(
  input: ResumeStudentStatusListInput,
): Promise<ResumeRequestResponse> {
  const searchParams = new URLSearchParams()

  if (input.grade !== undefined) {
    searchParams.set('grade', String(input.grade))
  }

  if (input.classNumber !== undefined) {
    searchParams.set('classNumber', String(input.classNumber))
  }

  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : ''

  return sendResumeRequest(`resume/students${query}`, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    method: 'GET',
  })
}

export async function patchResumeVisibilityRequest(input: ResumeVisibilityInput): Promise<ResumeRequestResponse> {
  return sendResumeRequest('resume/visibility', {
    body: JSON.stringify({ isPublic: input.isPublic }),
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'PATCH',
  })
}

export async function postResumeSubmitRequest(input: ResumeSubmissionInput): Promise<ResumeRequestResponse> {
  return sendResumeRequest('resume/submit', {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    method: 'POST',
  })
}

export async function postResumeSubmitCancelRequest(input: ResumeSubmissionInput): Promise<ResumeRequestResponse> {
  return sendResumeRequest('resume/submit/cancel', {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    method: 'POST',
  })
}

export async function postResumeSaveRequest(input: ResumeSaveInput): Promise<ResumeRequestResponse> {
  return sendResumeRequest('resume/save', {
    body: JSON.stringify({
      email: input.email,
      introduce: input.introduce,
      pages: input.pages,
      portfolioUrl: input.portfolioUrl,
      skills: input.skills,
    }),
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
}

export async function postResumeAutoSaveRequest(input: ResumeAutoSaveInput): Promise<ResumeRequestResponse> {
  return sendResumeRequest('resume/auto-save', {
    body: JSON.stringify({
      email: input.email,
      introduce: input.introduce,
      pages: input.pages,
      portfolioUrl: input.portfolioUrl,
      skills: input.skills,
    }),
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
}
