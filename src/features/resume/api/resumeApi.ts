'use client'

import type {
  Resume,
  ResumeAutoSave,
  ResumeAutoSaveInput,
  ResumeAutoSaveResult,
  ResumeDetailInput,
  ResumeDetailResult,
  ResumePage,
  ResumePageType,
  ResumeProject,
  ResumeSave,
  ResumeSaveInput,
  ResumeSaveResult,
  ResumeStudentStatus,
  ResumeStudentStatusListInput,
  ResumeStudentStatusListResult,
  ResumeSubmissionStatus,
  ResumeSubmission,
  ResumeSubmissionInput,
  ResumeSubmissionResult,
  ResumeVisibility,
  ResumeVisibilityInput,
  ResumeVisibilityResult,
} from './resumeApi.types'
import {
  getResumeRequest,
  getResumeStudentStatusesRequest,
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
const INVALID_STUDENT_STATUS_RESPONSE = {
  kind: 'server-error',
  message: '학생 이력서 제출 현황 응답 형식이 올바르지 않습니다.',
} as const satisfies ResumeStudentStatusListResult
const RESPONSE_BODY_STREAM_FAILURE = {
  kind: 'network-error',
  message: '이력서 API 응답을 읽지 못했습니다. 잠시 후 다시 시도해주세요.',
} as const satisfies ResumeRequestFailure

type ResumeHttpResponse = Extract<ResumeRequestResponse, { readonly kind: 'response' }>

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isResumePageType(value: unknown): value is ResumePageType {
  return value === 'PROFILE' || value === 'PROJECT'
}

function inferResumePageType(index: number): ResumePageType {
  return index === 1 ? 'PROJECT' : 'PROFILE'
}

function parseStringList(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    return undefined
  }

  return value
}

function parseResumeProject(value: unknown): ResumeProject | undefined {
  if (
    !isJsonRecord(value) ||
    typeof value['endDate'] !== 'string' ||
    typeof value['imageUrl'] !== 'string' ||
    typeof value['name'] !== 'string' ||
    typeof value['startDate'] !== 'string' ||
    typeof value['summary'] !== 'string'
  ) {
    return undefined
  }

  return {
    endDate: value['endDate'],
    imageUrl: value['imageUrl'],
    name: value['name'],
    startDate: value['startDate'],
    summary: value['summary'],
  }
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

  const type = value['type'] === undefined ? inferResumePageType(value['index']) : value['type']
  const rawProject = value['project']

  if (!isResumePageType(type)) {
    return undefined
  }

  if (rawProject === undefined || rawProject === null) {
    return {
      content: value['content'],
      id: value['id'],
      index: value['index'],
      type,
    }
  }

  const project = parseResumeProject(rawProject)

  if (!project) {
    return undefined
  }

  return {
    content: value['content'],
    id: value['id'],
    index: value['index'],
    project,
    type,
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
  const skills = value['skills'] === undefined ? [] : parseStringList(value['skills'])

  if (!pages || !skills) {
    return undefined
  }

  return {
    email: typeof value['email'] === 'string' ? value['email'] : '',
    id: value['id'],
    introduce: value['introduce'],
    isPublic: value['isPublic'],
    majorName: value['majorName'],
    name: value['name'],
    pages,
    portfolioUrl: value['portfolioUrl'],
    profileImageUrl: value['profileImageUrl'],
    savedAt: value['savedAt'],
    skills,
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

function isResumeSubmissionStatus(value: unknown): value is ResumeSubmissionStatus {
  return value === 'DELETED' || value === 'ONGOING' || value === 'RELEASED' || value === 'SUBMITTED'
}

function parseResumeStudentStatus(value: unknown): ResumeStudentStatus | undefined {
  if (
    !isJsonRecord(value) ||
    typeof value['classNumber'] !== 'number' ||
    typeof value['grade'] !== 'number' ||
    typeof value['majorName'] !== 'string' ||
    typeof value['name'] !== 'string' ||
    typeof value['number'] !== 'number' ||
    typeof value['schoolNumber'] !== 'string' ||
    typeof value['studentId'] !== 'number' ||
    !isResumeSubmissionStatus(value['submissionStatus']) ||
    typeof value['submitted'] !== 'boolean'
  ) {
    return undefined
  }

  const resumeId = value['resumeId']
  const submittedAt = value['submittedAt']

  if (resumeId !== undefined && resumeId !== null && typeof resumeId !== 'string') {
    return undefined
  }

  if (submittedAt !== undefined && submittedAt !== null && typeof submittedAt !== 'string') {
    return undefined
  }

  return {
    classNumber: value['classNumber'],
    grade: value['grade'],
    majorName: value['majorName'],
    name: value['name'],
    number: value['number'],
    ...(typeof resumeId === 'string' ? { resumeId } : {}),
    schoolNumber: value['schoolNumber'],
    studentId: value['studentId'],
    submissionStatus: value['submissionStatus'],
    submitted: value['submitted'],
    ...(typeof submittedAt === 'string' ? { submittedAt } : {}),
  }
}

function parseResumeStudentStatuses(value: unknown): readonly ResumeStudentStatus[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const students = value.map(parseResumeStudentStatus)

  if (students.some((student) => student === undefined)) {
    return undefined
  }

  return students.filter((student) => student !== undefined)
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

async function readStudentStatusResponseBody(response: ResumeHttpResponse): Promise<ResumeStudentStatusListResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toResponseBodyReadFailure(error, INVALID_STUDENT_STATUS_RESPONSE)
  } finally {
    response.complete()
  }

  if (
    !isJsonRecord(responseBody) ||
    (responseBody['classNumber'] !== undefined &&
      responseBody['classNumber'] !== null &&
      typeof responseBody['classNumber'] !== 'number') ||
    (responseBody['grade'] !== undefined && responseBody['grade'] !== null && typeof responseBody['grade'] !== 'number') ||
    typeof responseBody['lastUpdatedAt'] !== 'string' ||
    typeof responseBody['numberOfData'] !== 'number' ||
    (responseBody['schoolYear'] !== undefined &&
      responseBody['schoolYear'] !== null &&
      typeof responseBody['schoolYear'] !== 'number')
  ) {
    return INVALID_STUDENT_STATUS_RESPONSE
  }

  const students = parseResumeStudentStatuses(responseBody['students'])

  if (!students) {
    return INVALID_STUDENT_STATUS_RESPONSE
  }

  return {
    classNumber: typeof responseBody['classNumber'] === 'number' ? responseBody['classNumber'] : undefined,
    grade: typeof responseBody['grade'] === 'number' ? responseBody['grade'] : undefined,
    kind: 'success',
    lastUpdatedAt: responseBody['lastUpdatedAt'],
    numberOfData: responseBody['numberOfData'],
    schoolYear: typeof responseBody['schoolYear'] === 'number' ? responseBody['schoolYear'] : undefined,
    students,
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

export async function getStudentResumeStatuses(
  input: ResumeStudentStatusListInput,
): Promise<ResumeStudentStatusListResult> {
  const response = await getResumeStudentStatusesRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readStudentStatusResponseBody(response)
  }

  response.complete()

  if (response.value.status === 401 || response.value.status === 403) {
    return {
      kind: 'forbidden',
      message: '학생 이력서 제출 현황을 조회할 권한이 없습니다.',
    }
  }

  return {
    kind: 'server-error',
    message: '학생 이력서 제출 현황 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
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
