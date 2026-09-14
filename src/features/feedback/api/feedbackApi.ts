'use client'

import type { FeedbackCreate, FeedbackCreateInput, FeedbackCreateResult } from './feedbackApi.types'
import { postFeedbackRequest, type FeedbackRequestFailure, type FeedbackRequestResponse } from './feedbackHttpClient'

type JsonRecord = {
  readonly [key: string]: unknown
}

const INVALID_CREATE_RESPONSE = {
  kind: 'server-error',
  message: '피드백 생성 응답 형식이 올바르지 않습니다.',
} as const satisfies FeedbackCreateResult
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

function toResponseBodyReadFailure(error: unknown): typeof INVALID_CREATE_RESPONSE | FeedbackRequestFailure {
  if (error instanceof SyntaxError) {
    return INVALID_CREATE_RESPONSE
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
    return toResponseBodyReadFailure(error)
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
