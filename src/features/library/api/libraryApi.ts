'use client'

import type { LibraryBookGroup, LibraryBookListResult } from './libraryApi.types'
import { getLibraryRequest, type LibraryRequestFailure, type LibraryRequestResponse } from './libraryHttpClient'

type JsonRecord = {
  readonly [key: string]: unknown
}

const INVALID_LIBRARY_RESPONSE = {
  kind: 'server-error',
  message: '도서관 조회 응답 형식이 올바르지 않습니다.',
} as const satisfies LibraryBookListResult
const RESPONSE_BODY_STREAM_FAILURE = {
  kind: 'network-error',
  message: '도서관 API 응답을 읽지 못했습니다. 잠시 후 다시 시도해주세요.',
} as const satisfies LibraryRequestFailure

type LibraryHttpResponse = Extract<LibraryRequestResponse, { readonly kind: 'response' }>

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

function toResponseBodyReadFailure(error: unknown): typeof INVALID_LIBRARY_RESPONSE | LibraryRequestFailure {
  if (error instanceof SyntaxError) {
    return INVALID_LIBRARY_RESPONSE
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
    return toResponseBodyReadFailure(error)
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
