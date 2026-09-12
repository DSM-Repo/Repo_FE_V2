'use client'

import type {
  Resume,
  ResumeAutoSave,
  ResumeAutoSaveInput,
  ResumeAutoSaveResult,
  ResumeDetailInput,
  ResumeDetailResult,
  ResumePage,
  ResumeSave,
  ResumeSaveInput,
  ResumeSaveResult,
  ResumeSubmission,
  ResumeSubmissionInput,
  ResumeSubmissionResult,
  ResumeVisibility,
  ResumeVisibilityInput,
  ResumeVisibilityResult,
} from './resumeApi.types'
import {
  getResumeRequest,
  patchResumeVisibilityRequest,
  postResumeAutoSaveRequest,
  postResumeSaveRequest,
  postResumeSubmitCancelRequest,
  postResumeSubmitRequest,
  type ResumeRequestFailure,
  type ResumeRequestResponse,
} from './resumeHttpClient'

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
const INVALID_SAVE_RESPONSE = {
  kind: 'server-error',
  message: '이력서 저장 응답 형식이 올바르지 않습니다.',
} as const satisfies ResumeSaveResult
const INVALID_AUTO_SAVE_RESPONSE = {
  kind: 'server-error',
  message: '이력서 자동 저장 응답 형식이 올바르지 않습니다.',
} as const satisfies ResumeAutoSaveResult
const RESPONSE_BODY_STREAM_FAILURE = {
  kind: 'network-error',
  message: '이력서 API 응답을 읽지 못했습니다. 잠시 후 다시 시도해주세요.',
} as const satisfies ResumeRequestFailure

type ResumeHttpResponse = Extract<ResumeRequestResponse, { readonly kind: 'response' }>

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

function parseResumeSave(value: unknown): ResumeSave | undefined {
  if (!isJsonRecord(value) || typeof value['resumeId'] !== 'string' || typeof value['savedAt'] !== 'string') {
    return undefined
  }

  return {
    resumeId: value['resumeId'],
    savedAt: value['savedAt'],
  }
}

function parseResumeAutoSave(value: unknown): ResumeAutoSave | undefined {
  const savedResume = parseResumeSave(value)

  if (!savedResume || !isJsonRecord(value) || typeof value['autoSaved'] !== 'boolean') {
    return undefined
  }

  return {
    autoSaved: value['autoSaved'],
    resumeId: savedResume.resumeId,
    savedAt: savedResume.savedAt,
  }
}

function toResponseBodyReadFailure<InvalidResponse extends { readonly kind: 'server-error'; readonly message: string }>(
  error: unknown,
  invalidResponse: InvalidResponse,
): InvalidResponse | ResumeRequestFailure {
  if (error instanceof SyntaxError) {
    return invalidResponse
  }

  if (error instanceof DOMException || error instanceof TypeError || error instanceof Error) {
    return RESPONSE_BODY_STREAM_FAILURE
  }

  throw error
}

async function readResumeResponseBody(response: ResumeHttpResponse): Promise<ResumeDetailResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toResponseBodyReadFailure(error, INVALID_RESUME_RESPONSE)
  } finally {
    response.complete()
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

async function readVisibilityResponseBody(response: ResumeHttpResponse): Promise<ResumeVisibilityResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toResponseBodyReadFailure(error, INVALID_VISIBILITY_RESPONSE)
  } finally {
    response.complete()
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

async function readSubmissionResponseBody(response: ResumeHttpResponse): Promise<ResumeSubmissionResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toResponseBodyReadFailure(error, INVALID_SUBMISSION_RESPONSE)
  } finally {
    response.complete()
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

async function readSaveResponseBody(response: ResumeHttpResponse): Promise<ResumeSaveResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toResponseBodyReadFailure(error, INVALID_SAVE_RESPONSE)
  } finally {
    response.complete()
  }

  const savedResume = parseResumeSave(responseBody)

  if (!savedResume) {
    return INVALID_SAVE_RESPONSE
  }

  return {
    kind: 'success',
    resumeId: savedResume.resumeId,
    savedAt: savedResume.savedAt,
  }
}

async function readAutoSaveResponseBody(response: ResumeHttpResponse): Promise<ResumeAutoSaveResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toResponseBodyReadFailure(error, INVALID_AUTO_SAVE_RESPONSE)
  } finally {
    response.complete()
  }

  const autoSavedResume = parseResumeAutoSave(responseBody)

  if (!autoSavedResume) {
    return INVALID_AUTO_SAVE_RESPONSE
  }

  return {
    autoSaved: autoSavedResume.autoSaved,
    kind: 'success',
    resumeId: autoSavedResume.resumeId,
    savedAt: autoSavedResume.savedAt,
  }
}

export async function getResumeById(input: ResumeDetailInput): Promise<ResumeDetailResult> {
  const response = await getResumeRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readResumeResponseBody(response)
  }

  response.complete()

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
    return readVisibilityResponseBody(response)
  }

  response.complete()

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
    return readSubmissionResponseBody(response)
  }

  response.complete()

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
    return readSubmissionResponseBody(response)
  }

  response.complete()

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

export async function saveResume(input: ResumeSaveInput): Promise<ResumeSaveResult> {
  const response = await postResumeSaveRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readSaveResponseBody(response)
  }

  response.complete()

  if (response.value.status === 401 || response.value.status === 403) {
    return {
      kind: 'forbidden',
      message: '이력서를 저장할 권한이 없습니다. 다시 로그인해주세요.',
    }
  }

  return {
    kind: 'server-error',
    message: '이력서 저장 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function autoSaveResume(input: ResumeAutoSaveInput): Promise<ResumeAutoSaveResult> {
  const response = await postResumeAutoSaveRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readAutoSaveResponseBody(response)
  }

  response.complete()

  if (response.value.status === 401 || response.value.status === 403) {
    return {
      kind: 'forbidden',
      message: '이력서를 자동 저장할 권한이 없습니다. 다시 로그인해주세요.',
    }
  }

  return {
    kind: 'server-error',
    message: '이력서 자동 저장 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}
