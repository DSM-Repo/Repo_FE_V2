'use client'

import type {
  FeedbackApplyInput,
  FeedbackCompleteInput,
  FeedbackCreateInput,
  FeedbackDeleteInput,
  FeedbackDetailInput,
  FeedbackListInput,
  FeedbackPendingInput,
  FeedbackUpdateInput,
} from './feedbackApi.types'

type FeedbackApiConfig =
  | {
      readonly baseUrl: string
      readonly kind: 'ready'
    }
  | {
      readonly kind: 'invalid'
      readonly message: string
    }

export type FeedbackRequestFailure = {
  readonly kind: 'configuration-error' | 'network-error'
  readonly message: string
}

export type FeedbackRequestResponse =
  | FeedbackRequestFailure
  | {
      readonly complete: () => void
      readonly kind: 'response'
      readonly value: Response
    }

const FEEDBACK_REQUEST_TIMEOUT_MS = 8_000
const FEEDBACK_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? process.env.NEXT_PUBLIC_AUTH_API_BASE_URL?.trim()

function getFeedbackApiConfig(): FeedbackApiConfig {
  if (!FEEDBACK_API_BASE_URL) {
    return {
      kind: 'invalid',
      message: 'API 주소가 설정되지 않았습니다.',
    }
  }

  try {
    return {
      baseUrl: new URL(FEEDBACK_API_BASE_URL).href,
      kind: 'ready',
    }
  } catch (error) {
    if (error instanceof TypeError) {
      return {
        kind: 'invalid',
        message: 'API 주소 형식이 올바르지 않습니다.',
      }
    }

    throw error
  }
}

function buildFeedbackUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).href
}

async function sendFeedbackRequest(path: string, init: RequestInit): Promise<FeedbackRequestResponse> {
  const config = getFeedbackApiConfig()

  if (config.kind === 'invalid') {
    return {
      kind: 'configuration-error',
      message: config.message,
    }
  }

  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(() => controller.abort(), FEEDBACK_REQUEST_TIMEOUT_MS)
  const complete = () => globalThis.clearTimeout(timeoutId)

  try {
    const response = await fetch(buildFeedbackUrl(config.baseUrl, path), {
      ...init,
      signal: controller.signal,
    })

    return {
      complete,
      kind: 'response',
      value: response,
    }
  } catch (error) {
    complete()

    if (error instanceof DOMException || error instanceof TypeError) {
      return {
        kind: 'network-error',
        message: '피드백 API에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.',
      }
    }

    throw error
  }
}

export async function postFeedbackRequest(input: FeedbackCreateInput): Promise<FeedbackRequestResponse> {
  return sendFeedbackRequest('feedback', {
    body: JSON.stringify({
      comment: input.comment,
      documentId: input.documentId,
      pageId: input.pageId,
      x: input.x,
      y: input.y,
    }),
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
}

export async function getFeedbackRequest(input: FeedbackDetailInput): Promise<FeedbackRequestResponse> {
  const encodedFeedbackId = encodeURIComponent(input.feedbackId)

  return sendFeedbackRequest(`feedback/${encodedFeedbackId}`, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    method: 'GET',
  })
}

export async function deleteFeedbackRequest(input: FeedbackDeleteInput): Promise<FeedbackRequestResponse> {
  const encodedFeedbackId = encodeURIComponent(input.feedbackId)

  return sendFeedbackRequest(`feedback/${encodedFeedbackId}`, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    method: 'DELETE',
  })
}

export async function getFeedbacksRequest(input: FeedbackListInput): Promise<FeedbackRequestResponse> {
  const searchParams = new URLSearchParams({ documentId: input.documentId })

  if (input.pageId) {
    searchParams.set('pageId', input.pageId)
  }

  return sendFeedbackRequest(`feedback?${searchParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    method: 'GET',
  })
}

export async function patchFeedbackApplyRequest(input: FeedbackApplyInput): Promise<FeedbackRequestResponse> {
  return sendFeedbackRequest('feedback/apply', {
    body: JSON.stringify({
      applied: input.applied,
      feedbackIds: input.feedbackIds,
    }),
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'PATCH',
  })
}

export async function patchFeedbackCompleteRequest(input: FeedbackCompleteInput): Promise<FeedbackRequestResponse> {
  const encodedFeedbackId = encodeURIComponent(input.feedbackId)

  return sendFeedbackRequest(`feedback/${encodedFeedbackId}/complete`, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    method: 'PATCH',
  })
}

export async function patchFeedbackPendingRequest(input: FeedbackPendingInput): Promise<FeedbackRequestResponse> {
  const encodedFeedbackId = encodeURIComponent(input.feedbackId)

  return sendFeedbackRequest(`feedback/${encodedFeedbackId}/pending`, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    method: 'PATCH',
  })
}

export async function patchFeedbackRequest(input: FeedbackUpdateInput): Promise<FeedbackRequestResponse> {
  const encodedFeedbackId = encodeURIComponent(input.feedbackId)

  return sendFeedbackRequest(`feedback/${encodedFeedbackId}`, {
    body: JSON.stringify({
      comment: input.comment,
      pageId: input.pageId,
      x: input.x,
      y: input.y,
    }),
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'PATCH',
  })
}
