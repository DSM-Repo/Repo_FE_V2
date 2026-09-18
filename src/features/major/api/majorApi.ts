'use client'

import type {
  Major,
  MajorAuthInput,
  MajorCreateInput,
  MajorCreateResult,
  MajorDeleteInput,
  MajorDeleteResult,
  MajorList,
  MajorListResult,
} from './majorApi.types'
import { deleteMajorRequest, getMajorsRequest, type MajorRequestFailure, type MajorRequestResponse, postMajorRequest } from './majorHttpClient'

type JsonRecord = {
  readonly [key: string]: unknown
}

const INVALID_MAJOR_RESPONSE = {
  kind: 'server-error',
  message: '전공 API 응답 형식이 올바르지 않습니다.',
} as const
const RESPONSE_BODY_STREAM_FAILURE = {
  kind: 'network-error',
  message: '전공 API 응답을 읽지 못했습니다. 잠시 후 다시 시도해주세요.',
} as const satisfies MajorRequestFailure

type MajorHttpResponse = Extract<MajorRequestResponse, { readonly kind: 'response' }>

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseMajor(value: unknown): Major | undefined {
  if (!isJsonRecord(value) || typeof value['majorId'] !== 'number' || typeof value['name'] !== 'string') {
    return undefined
  }

  return {
    majorId: value['majorId'],
    name: value['name'],
  }
}

function parseMajorList(value: unknown): MajorList | undefined {
  if (!isJsonRecord(value) || !Array.isArray(value['majors']) || typeof value['numberOfData'] !== 'number') {
    return undefined
  }

  const majors = value['majors'].map(parseMajor)

  if (majors.some((major) => major === undefined)) {
    return undefined
  }

  return {
    majors: majors.filter((major) => major !== undefined),
    numberOfData: value['numberOfData'],
  }
}

function toResponseBodyReadFailure(error: unknown) {
  if (error instanceof SyntaxError) {
    return INVALID_MAJOR_RESPONSE
  }

  if (error instanceof DOMException || error instanceof TypeError || error instanceof Error) {
    return RESPONSE_BODY_STREAM_FAILURE
  }

  throw error
}

function toForbiddenResult(message: string) {
  return {
    kind: 'forbidden',
    message,
  } as const
}

async function readMajorListResponseBody(response: MajorHttpResponse): Promise<MajorListResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toResponseBodyReadFailure(error)
  } finally {
    response.complete()
  }

  const value = parseMajorList(responseBody)

  if (!value) {
    return INVALID_MAJOR_RESPONSE
  }

  return {
    kind: 'success',
    value,
  }
}

async function readMajorCreateResponseBody(response: MajorHttpResponse): Promise<MajorCreateResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toResponseBodyReadFailure(error)
  } finally {
    response.complete()
  }

  const major = parseMajor(responseBody)

  if (!major) {
    return INVALID_MAJOR_RESPONSE
  }

  return {
    kind: 'success',
    major,
  }
}

export async function getMajors(input: MajorAuthInput): Promise<MajorListResult> {
  const response = await getMajorsRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readMajorListResponseBody(response)
  }

  response.complete()

  if (response.value.status === 401 || response.value.status === 403) {
    return toForbiddenResult('전공 목록을 조회할 권한이 없습니다. 다시 로그인해주세요.')
  }

  return {
    kind: 'server-error',
    message: '전공 목록 조회 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function createMajor(input: MajorCreateInput): Promise<MajorCreateResult> {
  const response = await postMajorRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.status === 201) {
    return readMajorCreateResponseBody(response)
  }

  response.complete()

  if (response.value.status === 401 || response.value.status === 403) {
    return toForbiddenResult('전공을 추가할 권한이 없습니다. 다시 로그인해주세요.')
  }

  return {
    kind: 'server-error',
    message: '전공 추가 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function deleteMajor(input: MajorDeleteInput): Promise<MajorDeleteResult> {
  const response = await deleteMajorRequest(input)

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
    return toForbiddenResult('전공을 삭제할 권한이 없습니다. 다시 로그인해주세요.')
  }

  return {
    kind: 'server-error',
    message: '전공 삭제 요청을 처리하지 못했습니다. 학생이 사용 중인 전공인지 확인해주세요.',
  }
}
