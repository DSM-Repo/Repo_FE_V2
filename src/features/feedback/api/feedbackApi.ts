'use client'

import type {
  FeedbackApply,
  FeedbackApplyFailure,
  FeedbackApplyInput,
  FeedbackApplyResult,
  FeedbackComplete,
  FeedbackCompleteInput,
  FeedbackCompleteResult,
  FeedbackCreate,
  FeedbackCreateInput,
  FeedbackCreateResult,
  FeedbackDetail,
  FeedbackDetailInput,
  FeedbackDetailResult,
  FeedbackPendingInput,
  FeedbackPendingResult,
  FeedbackUpdate,
  FeedbackUpdateInput,
  FeedbackUpdateResult,
} from './feedbackApi.types'
import {
  getFeedbackRequest,
  patchFeedbackApplyRequest,
  patchFeedbackCompleteRequest,
  patchFeedbackPendingRequest,
  patchFeedbackRequest,
  postFeedbackRequest,
  type FeedbackRequestFailure,
  type FeedbackRequestResponse,
} from './feedbackHttpClient'

type JsonRecord = {
  readonly [key: string]: unknown
}

const INVALID_CREATE_RESPONSE = {
  kind: 'server-error',
  message: '피드백 생성 응답 형식이 올바르지 않습니다.',
} as const satisfies FeedbackCreateResult
const INVALID_APPLY_RESPONSE = {
  kind: 'server-error',
  message: '피드백 일괄 반영 응답 형식이 올바르지 않습니다.',
} as const satisfies FeedbackApplyResult
const INVALID_COMPLETE_RESPONSE = {
  kind: 'server-error',
  message: '피드백 완료 응답 형식이 올바르지 않습니다.',
} as const satisfies FeedbackCompleteResult
const INVALID_PENDING_RESPONSE = {
  kind: 'server-error',
  message: '피드백 미반영 응답 형식이 올바르지 않습니다.',
} as const satisfies FeedbackPendingResult
const INVALID_UPDATE_RESPONSE = {
  kind: 'server-error',
  message: '피드백 수정 응답 형식이 올바르지 않습니다.',
} as const satisfies FeedbackUpdateResult
const INVALID_DETAIL_RESPONSE = {
  kind: 'server-error',
  message: '피드백 조회 응답 형식이 올바르지 않습니다.',
} as const satisfies FeedbackDetailResult
const RESPONSE_BODY_STREAM_FAILURE = {
  kind: 'network-error',
  message: '피드백 API 응답을 읽지 못했습니다. 잠시 후 다시 시도해주세요.',
} as const satisfies FeedbackRequestFailure

type FeedbackHttpResponse = Extract<FeedbackRequestResponse, { readonly kind: 'response' }>

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseFeedbackCreate(value: unknown): FeedbackCreate | undefined {
  if (
    !isJsonRecord(value) ||
    typeof value['createdAt'] !== 'string' ||
    typeof value['feedbackId'] !== 'string' ||
    typeof value['pageId'] !== 'string' ||
    typeof value['x'] !== 'number' ||
    typeof value['y'] !== 'number'
  ) {
    return undefined
  }

  return {
    createdAt: value['createdAt'],
    feedbackId: value['feedbackId'],
    pageId: value['pageId'],
    x: value['x'],
    y: value['y'],
  }
}

function parseFeedbackApplyFailure(value: unknown): FeedbackApplyFailure | undefined {
  if (!isJsonRecord(value) || typeof value['feedbackId'] !== 'string' || typeof value['reason'] !== 'string') {
    return undefined
  }

  return {
    feedbackId: value['feedbackId'],
    reason: value['reason'],
  }
}

function parseFeedbackApplyFailures(value: unknown): readonly FeedbackApplyFailure[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const failures = value.map(parseFeedbackApplyFailure)

  if (failures.some((failure) => failure === undefined)) {
    return undefined
  }

  return failures.filter((failure) => failure !== undefined)
}

function parseFeedbackApply(value: unknown): FeedbackApply | undefined {
  if (!isJsonRecord(value) || typeof value['successCount'] !== 'number') {
    return undefined
  }

  const failed = parseFeedbackApplyFailures(value['failed'])

  if (!failed) {
    return undefined
  }

  return {
    failed,
    successCount: value['successCount'],
  }
}

function parseFeedbackComplete(value: unknown): FeedbackComplete | undefined {
  if (!isJsonRecord(value) || typeof value['feedbackId'] !== 'string' || typeof value['status'] !== 'string') {
    return undefined
  }

  return {
    feedbackId: value['feedbackId'],
    status: value['status'],
  }
}

function parseFeedbackUpdate(value: unknown): FeedbackUpdate | undefined {
  if (
    !isJsonRecord(value) ||
    typeof value['content'] !== 'string' ||
    typeof value['id'] !== 'string' ||
    typeof value['pageId'] !== 'string' ||
    typeof value['teacherName'] !== 'string' ||
    typeof value['updatedAt'] !== 'string' ||
    typeof value['x'] !== 'number' ||
    typeof value['y'] !== 'number'
  ) {
    return undefined
  }

  return {
    content: value['content'],
    id: value['id'],
    pageId: value['pageId'],
    teacherName: value['teacherName'],
    updatedAt: value['updatedAt'],
    x: value['x'],
    y: value['y'],
  }
}

function parseFeedbackDetail(value: unknown): FeedbackDetail | undefined {
  if (
    !isJsonRecord(value) ||
    typeof value['content'] !== 'string' ||
    typeof value['createdAt'] !== 'string' ||
    typeof value['feedbackId'] !== 'string' ||
    typeof value['pageDeleted'] !== 'boolean' ||
    typeof value['pageId'] !== 'string' ||
    typeof value['status'] !== 'string' ||
    typeof value['x'] !== 'number' ||
    typeof value['y'] !== 'number'
  ) {
    return undefined
  }

  return {
    content: value['content'],
    createdAt: value['createdAt'],
    feedbackId: value['feedbackId'],
    pageDeleted: value['pageDeleted'],
    pageId: value['pageId'],
    status: value['status'],
    x: value['x'],
    y: value['y'],
  }
}

function toResponseBodyReadFailure<InvalidResponse extends { readonly kind: 'server-error'; readonly message: string }>(
  error: unknown,
  invalidResponse: InvalidResponse,
): InvalidResponse | FeedbackRequestFailure {
  if (error instanceof SyntaxError) {
    return invalidResponse
  }

  if (error instanceof DOMException || error instanceof TypeError || error instanceof Error) {
    return RESPONSE_BODY_STREAM_FAILURE
  }

  throw error
}

async function readCreateResponseBody(response: FeedbackHttpResponse): Promise<FeedbackCreateResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toResponseBodyReadFailure(error, INVALID_CREATE_RESPONSE)
  } finally {
    response.complete()
  }

  const createdFeedback = parseFeedbackCreate(responseBody)

  if (!createdFeedback) {
    return INVALID_CREATE_RESPONSE
  }

  return {
    createdAt: createdFeedback.createdAt,
    feedbackId: createdFeedback.feedbackId,
    kind: 'success',
    pageId: createdFeedback.pageId,
    x: createdFeedback.x,
    y: createdFeedback.y,
  }
}

async function readApplyResponseBody(response: FeedbackHttpResponse): Promise<FeedbackApplyResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toResponseBodyReadFailure(error, INVALID_APPLY_RESPONSE)
  } finally {
    response.complete()
  }

  const appliedFeedback = parseFeedbackApply(responseBody)

  if (!appliedFeedback) {
    return INVALID_APPLY_RESPONSE
  }

  return {
    failed: appliedFeedback.failed,
    kind: 'success',
    successCount: appliedFeedback.successCount,
  }
}

async function readStatusResponseBody<InvalidResponse extends { readonly kind: 'server-error'; readonly message: string }>(
  response: FeedbackHttpResponse,
  invalidResponse: InvalidResponse,
): Promise<FeedbackCompleteResult | FeedbackPendingResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toResponseBodyReadFailure(error, invalidResponse)
  } finally {
    response.complete()
  }

  const completedFeedback = parseFeedbackComplete(responseBody)

  if (!completedFeedback) {
    return invalidResponse
  }

  return {
    feedbackId: completedFeedback.feedbackId,
    kind: 'success',
    status: completedFeedback.status,
  }
}

async function readUpdateResponseBody(response: FeedbackHttpResponse): Promise<FeedbackUpdateResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toResponseBodyReadFailure(error, INVALID_UPDATE_RESPONSE)
  } finally {
    response.complete()
  }

  const updatedFeedback = parseFeedbackUpdate(responseBody)

  if (!updatedFeedback) {
    return INVALID_UPDATE_RESPONSE
  }

  return {
    content: updatedFeedback.content,
    id: updatedFeedback.id,
    kind: 'success',
    pageId: updatedFeedback.pageId,
    teacherName: updatedFeedback.teacherName,
    updatedAt: updatedFeedback.updatedAt,
    x: updatedFeedback.x,
    y: updatedFeedback.y,
  }
}

async function readDetailResponseBody(response: FeedbackHttpResponse): Promise<FeedbackDetailResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toResponseBodyReadFailure(error, INVALID_DETAIL_RESPONSE)
  } finally {
    response.complete()
  }

  const feedback = parseFeedbackDetail(responseBody)

  if (!feedback) {
    return INVALID_DETAIL_RESPONSE
  }

  return {
    content: feedback.content,
    createdAt: feedback.createdAt,
    feedbackId: feedback.feedbackId,
    kind: 'success',
    pageDeleted: feedback.pageDeleted,
    pageId: feedback.pageId,
    status: feedback.status,
    x: feedback.x,
    y: feedback.y,
  }
}

export async function createFeedback(input: FeedbackCreateInput): Promise<FeedbackCreateResult> {
  const response = await postFeedbackRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.status === 201) {
    return readCreateResponseBody(response)
  }

  response.complete()

  if (response.value.status === 401 || response.value.status === 403) {
    return {
      kind: 'forbidden',
      message: '피드백을 작성할 권한이 없습니다. 다시 로그인해주세요.',
    }
  }

  return {
    kind: 'server-error',
    message: '피드백 생성 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function applyFeedback(input: FeedbackApplyInput): Promise<FeedbackApplyResult> {
  const response = await patchFeedbackApplyRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readApplyResponseBody(response)
  }

  response.complete()

  if (response.value.status === 401 || response.value.status === 403) {
    return {
      kind: 'forbidden',
      message: '피드백을 반영할 권한이 없습니다. 다시 로그인해주세요.',
    }
  }

  return {
    kind: 'server-error',
    message: '피드백 일괄 반영 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function completeFeedback(input: FeedbackCompleteInput): Promise<FeedbackCompleteResult> {
  const response = await patchFeedbackCompleteRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readStatusResponseBody(response, INVALID_COMPLETE_RESPONSE)
  }

  response.complete()

  if (response.value.status === 401 || response.value.status === 403) {
    return {
      kind: 'forbidden',
      message: '피드백을 완료 처리할 권한이 없습니다. 다시 로그인해주세요.',
    }
  }

  return {
    kind: 'server-error',
    message: '피드백 완료 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function pendingFeedback(input: FeedbackPendingInput): Promise<FeedbackPendingResult> {
  const response = await patchFeedbackPendingRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readStatusResponseBody(response, INVALID_PENDING_RESPONSE)
  }

  response.complete()

  if (response.value.status === 401 || response.value.status === 403) {
    return {
      kind: 'forbidden',
      message: '피드백을 미반영 처리할 권한이 없습니다. 다시 로그인해주세요.',
    }
  }

  return {
    kind: 'server-error',
    message: '피드백 미반영 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function updateFeedback(input: FeedbackUpdateInput): Promise<FeedbackUpdateResult> {
  const response = await patchFeedbackRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readUpdateResponseBody(response)
  }

  response.complete()

  if (response.value.status === 401 || response.value.status === 403) {
    return {
      kind: 'forbidden',
      message: '피드백을 수정할 권한이 없습니다. 다시 로그인해주세요.',
    }
  }

  return {
    kind: 'server-error',
    message: '피드백 수정 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function getFeedbackById(input: FeedbackDetailInput): Promise<FeedbackDetailResult> {
  const response = await getFeedbackRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readDetailResponseBody(response)
  }

  response.complete()

  if (response.value.status === 401 || response.value.status === 403) {
    return {
      kind: 'forbidden',
      message: '피드백을 조회할 권한이 없습니다. 다시 로그인해주세요.',
    }
  }

  if (response.value.status === 404) {
    return {
      kind: 'not-found',
      message: '피드백을 찾을 수 없습니다.',
    }
  }

  return {
    kind: 'server-error',
    message: '피드백 조회 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}
