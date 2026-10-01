'use client'

import type {
  HistoryAuthInput,
  HistoryDeleteInput,
  HistoryDeleteResult,
  HistoryItem,
  HistoryListResult,
  HistoryMutationInput,
  HistoryMutationResult,
  HistoryUpdateInput,
} from './historyApi.types'
import {
  deleteHistoryRequest,
  getHistoriesRequest,
  patchHistoryRequest,
  postHistoryRequest,
  type HistoryRequestFailure,
  type HistoryRequestResponse,
} from './historyHttpClient'

type JsonRecord = {
  readonly [key: string]: unknown
}

const INVALID_HISTORY_LIST_RESPONSE = {
  kind: 'server-error',
  message: '히스토리 목록 응답 형식이 올바르지 않습니다.',
} as const satisfies HistoryListResult
const INVALID_HISTORY_MUTATION_RESPONSE = {
  kind: 'server-error',
  message: '히스토리 저장 응답 형식이 올바르지 않습니다.',
} as const satisfies HistoryMutationResult
const RESPONSE_BODY_STREAM_FAILURE = {
  kind: 'network-error',
  message: '히스토리 API 응답을 읽지 못했습니다. 잠시 후 다시 시도해주세요.',
} as const satisfies HistoryRequestFailure

type HistoryHttpResponse = Extract<HistoryRequestResponse, { readonly kind: 'response' }>

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseHistoryId(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return undefined
}

function parseHistory(value: unknown): HistoryItem | undefined {
  if (!isJsonRecord(value) || typeof value['content'] !== 'string' || typeof value['date'] !== 'string') {
    return undefined
  }

  const historyId = parseHistoryId(value['historyId'])

  if (!historyId) {
    return undefined
  }

  return {
    content: value['content'],
    date: value['date'],
    historyId,
  }
}

function parseHistories(value: unknown): readonly HistoryItem[] | undefined {
  const source = isJsonRecord(value) && Array.isArray(value['histories']) ? value['histories'] : value

  if (!Array.isArray(source)) {
    return undefined
  }

  const histories = source.map(parseHistory)

  if (histories.some((history) => history === undefined)) {
    return undefined
  }

  return histories.filter((history) => history !== undefined)
}

function compareHistoryByDateDesc(left: HistoryItem, right: HistoryItem) {
  const leftTime = new Date(left.date).getTime()
  const rightTime = new Date(right.date).getTime()

  const leftInvalid = Number.isNaN(leftTime)
  const rightInvalid = Number.isNaN(rightTime)

  if (leftInvalid && rightInvalid) {
    return right.date.localeCompare(left.date)
  }

  if (leftInvalid) return 1
  if (rightInvalid) return -1

  return rightTime - leftTime
}

function toResponseBodyReadFailure<InvalidResponse extends { readonly kind: 'server-error'; readonly message: string }>(
  error: unknown,
  invalidResponse: InvalidResponse,
): InvalidResponse | HistoryRequestFailure {
  if (error instanceof SyntaxError) {
    return invalidResponse
  }

  if (error instanceof DOMException || error instanceof TypeError || error instanceof Error) {
    return RESPONSE_BODY_STREAM_FAILURE
  }

  throw error
}

async function readHistoryListResponseBody(response: HistoryHttpResponse): Promise<HistoryListResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toResponseBodyReadFailure(error, INVALID_HISTORY_LIST_RESPONSE)
  } finally {
    response.complete()
  }

  const histories = parseHistories(responseBody)

  if (!histories) {
    return INVALID_HISTORY_LIST_RESPONSE
  }

  return {
    histories: [...histories].sort(compareHistoryByDateDesc),
    kind: 'success',
  }
}

async function readHistoryMutationResponseBody(response: HistoryHttpResponse): Promise<HistoryMutationResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toResponseBodyReadFailure(error, INVALID_HISTORY_MUTATION_RESPONSE)
  } finally {
    response.complete()
  }

  const history = parseHistory(responseBody)

  if (!history) {
    return INVALID_HISTORY_MUTATION_RESPONSE
  }

  return {
    ...history,
    kind: 'success',
  }
}

function toHistoryForbidden(message: string) {
  return {
    kind: 'forbidden',
    message,
  } as const
}

export async function getHistories(input: HistoryAuthInput): Promise<HistoryListResult> {
  const response = await getHistoriesRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readHistoryListResponseBody(response)
  }

  response.complete()

  if (response.value.status === 401 || response.value.status === 403) {
    return toHistoryForbidden('히스토리 목록을 조회할 권한이 없습니다. 다시 로그인해주세요.')
  }

  return {
    kind: 'server-error',
    message: '히스토리 목록 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function createHistory(input: HistoryMutationInput): Promise<HistoryMutationResult> {
  const response = await postHistoryRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readHistoryMutationResponseBody(response)
  }

  response.complete()

  if (response.value.status === 401 || response.value.status === 403) {
    return toHistoryForbidden('히스토리를 등록할 권한이 없습니다.')
  }

  return {
    kind: 'server-error',
    message: '히스토리 등록 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function updateHistory(input: HistoryUpdateInput): Promise<HistoryMutationResult> {
  const response = await patchHistoryRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readHistoryMutationResponseBody(response)
  }

  response.complete()

  if (response.value.status === 401 || response.value.status === 403) {
    return toHistoryForbidden('히스토리를 수정할 권한이 없습니다.')
  }

  return {
    kind: 'server-error',
    message: '히스토리 수정 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function removeHistory(input: HistoryDeleteInput): Promise<HistoryDeleteResult> {
  const response = await deleteHistoryRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    response.complete()
    return {
      kind: 'success',
    }
  }

  response.complete()

  if (response.value.status === 401 || response.value.status === 403) {
    return toHistoryForbidden('히스토리를 삭제할 권한이 없습니다.')
  }

  return {
    kind: 'server-error',
    message: '히스토리 삭제 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}
