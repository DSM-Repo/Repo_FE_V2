'use client'

import type {
  UserClassInfo,
  UserMajorUpdateInput,
  UserMajorUpdateResult,
  UserMe,
  UserMeInput,
  UserMeResult,
  UserProgress,
  UserProgressSection,
} from './userApi.types'
import { getUserMeRequest, patchUserMajorRequest, type UserRequestFailure, type UserRequestResponse } from './userHttpClient'

type JsonRecord = {
  readonly [key: string]: unknown
}

const INVALID_USER_RESPONSE = {
  kind: 'server-error',
  message: '내 정보 조회 응답 형식이 올바르지 않습니다.',
} as const satisfies UserMeResult
const RESPONSE_BODY_STREAM_FAILURE = {
  kind: 'network-error',
  message: '내 정보 API 응답을 읽지 못했습니다. 잠시 후 다시 시도해주세요.',
} as const satisfies UserRequestFailure

type UserHttpResponse = Extract<UserRequestResponse, { readonly kind: 'response' }>

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null
}

function parseClassInfo(value: unknown): UserClassInfo | undefined {
  if (
    !isJsonRecord(value) ||
    typeof value['classNumber'] !== 'number' ||
    typeof value['grade'] !== 'number' ||
    typeof value['number'] !== 'number' ||
    typeof value['schoolNumber'] !== 'string'
  ) {
    return undefined
  }

  return {
    classNumber: value['classNumber'],
    grade: value['grade'],
    number: value['number'],
    schoolNumber: value['schoolNumber'],
  }
}

function parseProgressSection(value: unknown): UserProgressSection | undefined {
  if (!isJsonRecord(value) || typeof value['completed'] !== 'boolean' || typeof value['key'] !== 'string' || typeof value['name'] !== 'string') {
    return undefined
  }

  return {
    completed: value['completed'],
    key: value['key'],
    name: value['name'],
  }
}

function parseProgressSections(value: unknown): readonly UserProgressSection[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const sections = value.map(parseProgressSection)

  if (sections.some((section) => section === undefined)) {
    return undefined
  }

  return sections.filter((section) => section !== undefined)
}

function parseProgress(value: unknown): UserProgress | undefined {
  if (!isJsonRecord(value) || typeof value['totalPercent'] !== 'number') {
    return undefined
  }

  const sections = parseProgressSections(value['sections'])

  if (!sections) {
    return undefined
  }

  return {
    sections,
    totalPercent: value['totalPercent'],
  }
}

function parseUserMe(value: unknown): UserMe | undefined {
  if (
    !isJsonRecord(value) ||
    typeof value['introduce'] !== 'string' ||
    !isNullableString(value['major']) ||
    typeof value['name'] !== 'string' ||
    !isNullableString(value['profileImageUrl'])
  ) {
    return undefined
  }

  const classInfo = parseClassInfo(value['classInfo'])
  const progress = parseProgress(value['progress'])

  if (!classInfo || !progress) {
    return undefined
  }

  return {
    classInfo,
    introduce: value['introduce'],
    major: value['major'],
    name: value['name'],
    profileImageUrl: value['profileImageUrl'],
    progress,
  }
}

function toResponseBodyReadFailure(error: unknown) {
  if (error instanceof SyntaxError) {
    return INVALID_USER_RESPONSE
  }

  if (error instanceof DOMException || error instanceof TypeError || error instanceof Error) {
    return RESPONSE_BODY_STREAM_FAILURE
  }

  throw error
}

async function readUserResponseBody(response: UserHttpResponse): Promise<UserMeResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toResponseBodyReadFailure(error)
  } finally {
    response.complete()
  }

  const user = parseUserMe(responseBody)

  if (!user) {
    return INVALID_USER_RESPONSE
  }

  return {
    kind: 'success',
    user,
  }
}

export async function getUserMe(input: UserMeInput): Promise<UserMeResult> {
  const response = await getUserMeRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readUserResponseBody(response)
  }

  response.complete()

  if (response.value.status === 401 || response.value.status === 403) {
    return {
      kind: 'forbidden',
      message: '내 정보를 조회할 권한이 없습니다. 다시 로그인해주세요.',
    }
  }

  return {
    kind: 'server-error',
    message: '내 정보 조회 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function updateUserMajor(input: UserMajorUpdateInput): Promise<UserMajorUpdateResult> {
  const response = await patchUserMajorRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  response.complete()

  if (response.value.status === 204) {
    return {
      kind: 'success',
    }
  }

  if (response.value.status === 401 || response.value.status === 403) {
    return {
      kind: 'forbidden',
      message: '전공을 변경할 권한이 없습니다. 다시 로그인해주세요.',
    }
  }

  return {
    kind: 'server-error',
    message: '전공 변경 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}
