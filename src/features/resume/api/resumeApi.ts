'use client'

import type {
  Resume,
  ResumeDetailInput,
  ResumeDetailResult,
  ResumePage,
  ResumeSubmission,
  ResumeSubmissionInput,
  ResumeSubmissionResult,
  ResumeVisibility,
  ResumeVisibilityInput,
  ResumeVisibilityResult,
} from './resumeApi.types'
import { getResumeRequest, patchResumeVisibilityRequest, postResumeSubmitCancelRequest, postResumeSubmitRequest } from './resumeHttpClient'

type JsonRecord = {
  readonly [key: string]: unknown
}

const INVALID_RESUME_RESPONSE = {
  kind: 'server-error',
  message: '이력서 조회 응답 형식이 올바르지 않습니다.',
} as const satisfies ResumeDetailResult
const INVALID_VISIBILITY_RESPONSE = {
  kind: 'server-error',
  message: '공개 여부 변경 응답 형식이 올바르지 않습니다.',
} as const satisfies ResumeVisibilityResult
const INVALID_SUBMISSION_RESPONSE = {
  kind: 'server-error',
  message: '이력서 제출 응답 형식이 올바르지 않습니다.',
} as const satisfies ResumeSubmissionResult

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseResumePage(value: unknown): ResumePage | undefined {
  if (
    !isJsonRecord(value) ||
    typeof value['content'] !== 'string' ||
    typeof value['id'] !== 'string' ||
    typeof value['index'] !== 'number'
  ) {
    return undefined
  }

  return {
    content: value['content'],
    id: value['id'],
    index: value['index'],
  }
}

function parseResumePages(value: unknown): readonly ResumePage[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const pages = value.map(parseResumePage)

  if (pages.some((page) => page === undefined)) {
    return undefined
  }

  return pages.filter((page) => page !== undefined)
}

function parseResume(value: unknown): Resume | undefined {
  if (
    !isJsonRecord(value) ||
    typeof value['id'] !== 'string' ||
    typeof value['introduce'] !== 'string' ||
    typeof value['isPublic'] !== 'boolean' ||
    typeof value['majorName'] !== 'string' ||
    typeof value['name'] !== 'string' ||
    typeof value['portfolioUrl'] !== 'string' ||
    typeof value['profileImageUrl'] !== 'string' ||
    typeof value['savedAt'] !== 'string' ||
    typeof value['submissionStatus'] !== 'string'
  ) {
    return undefined
  }

  const pages = parseResumePages(value['pages'])

  if (!pages) {
    return undefined
  }

  return {
    id: value['id'],
    introduce: value['introduce'],
    isPublic: value['isPublic'],
    majorName: value['majorName'],
    name: value['name'],
    pages,
    portfolioUrl: value['portfolioUrl'],
    profileImageUrl: value['profileImageUrl'],
    savedAt: value['savedAt'],
    submissionStatus: value['submissionStatus'],
  }
}

function parseResumeVisibility(value: unknown): ResumeVisibility | undefined {
  if (!isJsonRecord(value) || typeof value['isPublic'] !== 'boolean') {
    return undefined
  }

  return {
    isPublic: value['isPublic'],
  }
}

function parseResumeSubmission(value: unknown): ResumeSubmission | undefined {
  if (!isJsonRecord(value) || typeof value['resumeId'] !== 'string' || typeof value['submissionStatus'] !== 'string') {
    return undefined
  }

  return {
    resumeId: value['resumeId'],
    submissionStatus: value['submissionStatus'],
  }
}

async function readResumeResponseBody(response: Response): Promise<ResumeDetailResult> {
  let responseBody: unknown

  try {
    responseBody = await response.json()
  } catch (error) {
    if (error instanceof SyntaxError) {
      return INVALID_RESUME_RESPONSE
    }

    throw error
  }

  const resume = parseResume(responseBody)

  if (!resume) {
    return INVALID_RESUME_RESPONSE
  }

  return {
    kind: 'success',
    resume,
  }
}

async function readVisibilityResponseBody(response: Response): Promise<ResumeVisibilityResult> {
  let responseBody: unknown

  try {
    responseBody = await response.json()
  } catch (error) {
    if (error instanceof SyntaxError) {
      return INVALID_VISIBILITY_RESPONSE
    }

    throw error
  }

  const visibility = parseResumeVisibility(responseBody)

  if (!visibility) {
    return INVALID_VISIBILITY_RESPONSE
  }

  return {
    isPublic: visibility.isPublic,
    kind: 'success',
  }
}

async function readSubmissionResponseBody(response: Response): Promise<ResumeSubmissionResult> {
  let responseBody: unknown

  try {
    responseBody = await response.json()
  } catch (error) {
    if (error instanceof SyntaxError) {
      return INVALID_SUBMISSION_RESPONSE
    }

    throw error
  }

  const submission = parseResumeSubmission(responseBody)

  if (!submission) {
    return INVALID_SUBMISSION_RESPONSE
  }

  return {
    kind: 'success',
    resumeId: submission.resumeId,
    submissionStatus: submission.submissionStatus,
  }
}

export async function getResumeById(input: ResumeDetailInput): Promise<ResumeDetailResult> {
  const response = await getResumeRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readResumeResponseBody(response.value)
  }

  if (response.value.status === 401 || response.value.status === 403) {
    return {
      kind: 'forbidden',
      message: '이력서를 조회할 권한이 없습니다. 다시 로그인해주세요.',
    }
  }

  if (response.value.status === 404) {
    return {
      kind: 'not-found',
      message: '이력서를 찾을 수 없습니다.',
    }
  }

  return {
    kind: 'server-error',
    message: '이력서 조회 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function updateResumeVisibility(input: ResumeVisibilityInput): Promise<ResumeVisibilityResult> {
  const response = await patchResumeVisibilityRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readVisibilityResponseBody(response.value)
  }

  if (response.value.status === 401 || response.value.status === 403) {
    return {
      kind: 'forbidden',
      message: '이력서 공개 여부를 변경할 권한이 없습니다. 다시 로그인해주세요.',
    }
  }

  return {
    kind: 'server-error',
    message: '공개 여부 변경 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function submitResume(input: ResumeSubmissionInput): Promise<ResumeSubmissionResult> {
  const response = await postResumeSubmitRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readSubmissionResponseBody(response.value)
  }

  if (response.value.status === 401 || response.value.status === 403) {
    return {
      kind: 'forbidden',
      message: '이력서를 제출할 권한이 없습니다. 다시 로그인해주세요.',
    }
  }

  return {
    kind: 'server-error',
    message: '이력서 제출 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function cancelResumeSubmission(input: ResumeSubmissionInput): Promise<ResumeSubmissionResult> {
  const response = await postResumeSubmitCancelRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readSubmissionResponseBody(response.value)
  }

  if (response.value.status === 401 || response.value.status === 403) {
    return {
      kind: 'forbidden',
      message: '이력서 제출을 취소할 권한이 없습니다. 다시 로그인해주세요.',
    }
  }

  return {
    kind: 'server-error',
    message: '이력서 제출 취소 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}
