'use client'

import type {
  LibraryBookGroup,
  LibraryBookListResult,
  LibraryResume,
  LibraryResumeInput,
  LibraryResumePage,
  LibraryResumeResult,
  LibrarySearchInput,
  LibrarySearchResult,
  LibrarySearchStudent,
} from './libraryApi.types'
import {
  getLibraryRequest,
  getLibraryResumeRequest,
  getLibrarySearchRequest,
  type LibraryRequestFailure,
  type LibraryRequestResponse,
} from './libraryHttpClient'

type JsonRecord = {
  readonly [key: string]: unknown
}

const INVALID_LIBRARY_RESPONSE = {
  kind: 'server-error',
  message: '도서관 조회 응답 형식이 올바르지 않습니다.',
} as const satisfies LibraryBookListResult
const INVALID_LIBRARY_SEARCH_RESPONSE = {
  kind: 'server-error',
  message: '학생 검색 응답 형식이 올바르지 않습니다.',
} as const satisfies LibrarySearchResult
const INVALID_LIBRARY_RESUME_RESPONSE = {
  kind: 'server-error',
  message: '이력서 조회 응답 형식이 올바르지 않습니다.',
} as const satisfies LibraryResumeResult
const RESPONSE_BODY_STREAM_FAILURE = {
  kind: 'network-error',
  message: '도서관 API 응답을 읽지 못했습니다. 잠시 후 다시 시도해주세요.',
} as const satisfies LibraryRequestFailure

type LibraryHttpResponse = Extract<LibraryRequestResponse, { readonly kind: 'response' }>
type InvalidLibraryResponse = typeof INVALID_LIBRARY_RESPONSE | typeof INVALID_LIBRARY_SEARCH_RESPONSE | typeof INVALID_LIBRARY_RESUME_RESPONSE

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseLibraryBookGroup(value: unknown): LibraryBookGroup | undefined {
  if (
    !isJsonRecord(value) ||
    typeof value['cohort'] !== 'number' ||
    typeof value['date'] !== 'number' ||
    typeof value['year'] !== 'number'
  ) {
    return undefined
  }

  return {
    cohort: value['cohort'],
    date: value['date'],
    year: value['year'],
  }
}

function parseLibraryBookGroups(value: unknown): readonly LibraryBookGroup[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const books = value.map(parseLibraryBookGroup)

  if (books.some((book) => book === undefined)) {
    return undefined
  }

  return books.filter((book) => book !== undefined)
}

function parseLibrarySearchStudent(value: unknown): LibrarySearchStudent | undefined {
  if (
    !isJsonRecord(value) ||
    typeof value['major'] !== 'string' ||
    typeof value['studentId'] !== 'number' ||
    typeof value['studentName'] !== 'string'
  ) {
    return undefined
  }

  return {
    major: value['major'],
    studentId: value['studentId'],
    studentName: value['studentName'],
  }
}

function parseLibrarySearchStudents(value: unknown): readonly LibrarySearchStudent[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const students = value.map(parseLibrarySearchStudent)

  if (students.some((student) => student === undefined)) {
    return undefined
  }

  return students.filter((student) => student !== undefined)
}

function parseLibraryResumePage(value: unknown): LibraryResumePage | undefined {
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

function parseLibraryResumePages(value: unknown): readonly LibraryResumePage[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const pages = value.map(parseLibraryResumePage)

  if (pages.some((page) => page === undefined)) {
    return undefined
  }

  return pages.filter((page) => page !== undefined)
}

function parseLibraryResume(value: unknown): LibraryResume | undefined {
  if (
    !isJsonRecord(value) ||
    typeof value['cohort'] !== 'number' ||
    typeof value['date'] !== 'number' ||
    typeof value['email'] !== 'string' ||
    typeof value['introduce'] !== 'string' ||
    typeof value['majorName'] !== 'string' ||
    typeof value['name'] !== 'string' ||
    typeof value['portfolioUrl'] !== 'string' ||
    typeof value['profileImageUrl'] !== 'string' ||
    typeof value['releasedAt'] !== 'string' ||
    typeof value['resumeId'] !== 'string' ||
    typeof value['studentId'] !== 'number' ||
    typeof value['studentNumber'] !== 'string' ||
    typeof value['year'] !== 'number'
  ) {
    return undefined
  }

  const pages = parseLibraryResumePages(value['pages'])

  if (!pages) {
    return undefined
  }

  return {
    cohort: value['cohort'],
    date: value['date'],
    email: value['email'],
    introduce: value['introduce'],
    majorName: value['majorName'],
    name: value['name'],
    pages,
    portfolioUrl: value['portfolioUrl'],
    profileImageUrl: value['profileImageUrl'],
    releasedAt: value['releasedAt'],
    resumeId: value['resumeId'],
    studentId: value['studentId'],
    studentNumber: value['studentNumber'],
    year: value['year'],
  }
}

function toResponseBodyReadFailure(error: unknown, invalidResponse: InvalidLibraryResponse): InvalidLibraryResponse | LibraryRequestFailure {
  if (error instanceof SyntaxError) {
    return invalidResponse
  }

  if (error instanceof DOMException || error instanceof TypeError || error instanceof Error) {
    return RESPONSE_BODY_STREAM_FAILURE
  }

  throw error
}

async function readLibraryResponseBody(response: LibraryHttpResponse): Promise<LibraryBookListResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toResponseBodyReadFailure(error, INVALID_LIBRARY_RESPONSE)
  } finally {
    response.complete()
  }

  const books = parseLibraryBookGroups(responseBody)

  if (!books) {
    return INVALID_LIBRARY_RESPONSE
  }

  return {
    books,
    kind: 'success',
  }
}

async function readLibrarySearchResponseBody(response: LibraryHttpResponse): Promise<LibrarySearchResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toResponseBodyReadFailure(error, INVALID_LIBRARY_SEARCH_RESPONSE)
  } finally {
    response.complete()
  }

  if (!isJsonRecord(responseBody) || typeof responseBody['totalElements'] !== 'number') {
    return INVALID_LIBRARY_SEARCH_RESPONSE
  }

  const students = parseLibrarySearchStudents(responseBody['content'])

  if (!students) {
    return INVALID_LIBRARY_SEARCH_RESPONSE
  }

  return {
    kind: 'success',
    students,
    totalElements: responseBody['totalElements'],
  }
}

async function readLibraryResumeResponseBody(response: LibraryHttpResponse): Promise<LibraryResumeResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toResponseBodyReadFailure(error, INVALID_LIBRARY_RESUME_RESPONSE)
  } finally {
    response.complete()
  }

  const resume = parseLibraryResume(responseBody)

  if (!resume) {
    return INVALID_LIBRARY_RESUME_RESPONSE
  }

  return {
    kind: 'success',
    resume,
  }
}

export async function getLibraryBooks(): Promise<LibraryBookListResult> {
  const response = await getLibraryRequest()

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readLibraryResponseBody(response)
  }

  response.complete()

  return {
    kind: 'server-error',
    message: '도서관 조회 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function searchLibraryStudents(input: LibrarySearchInput): Promise<LibrarySearchResult> {
  const response = await getLibrarySearchRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readLibrarySearchResponseBody(response)
  }

  response.complete()

  return {
    kind: 'server-error',
    message: '학생 검색 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function getLibraryResumeByStudentId(input: LibraryResumeInput): Promise<LibraryResumeResult> {
  const response = await getLibraryResumeRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readLibraryResumeResponseBody(response)
  }

  response.complete()

  if (response.value.status === 404) {
    return {
      kind: 'not-found',
      message: '공개된 이력서를 찾을 수 없습니다.',
    }
  }

  return {
    kind: 'server-error',
    message: '이력서 조회 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}
