'use client'

import { sendAuthenticatedRequest } from '../../auth/api/authenticatedRequest'
import { buildClientApiUrl, getClientApiConfig } from '../../../shared/api/clientApiBaseUrl'
import type {
  HistoryAuthInput,
  HistoryDeleteInput,
  HistoryMutationInput,
  HistoryUpdateInput,
} from './historyApi.types'

type HistoryApiConfig =
  | {
      readonly baseUrl: string
      readonly kind: 'ready'
    }
  | {
      readonly kind: 'invalid'
      readonly message: string
    }

export type HistoryRequestFailure = {
  readonly kind: 'configuration-error' | 'network-error'
  readonly message: string
}

export type HistoryRequestResponse =
  | HistoryRequestFailure
  | {
      readonly complete: () => void
      readonly kind: 'response'
      readonly value: Response
    }

const HISTORY_REQUEST_TIMEOUT_MS = 8_000
const HISTORY_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()

function getHistoryApiConfig(): HistoryApiConfig {
  return getClientApiConfig(HISTORY_API_BASE_URL, 'API 주소가 설정되지 않았습니다.')
}

function buildHistoryUrl(baseUrl: string, path: string) {
  return buildClientApiUrl(baseUrl, path).href
}

function buildAuthorizationHeader(input: HistoryAuthInput) {
  return {
    Authorization: `Bearer ${input.accessToken}`,
  }
}

function toHistoryMutationBody(input: HistoryMutationInput) {
  return {
    content: input.content,
    date: input.date,
  }
}

async function sendHistoryRequest(path: string, init: RequestInit): Promise<HistoryRequestResponse> {
  const config = getHistoryApiConfig()

  if (config.kind === 'invalid') {
    return {
      kind: 'configuration-error',
      message: config.message,
    }
  }

  return sendAuthenticatedRequest({
    init,
    networkErrorMessage: '히스토리 API에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.',
    timeoutMs: HISTORY_REQUEST_TIMEOUT_MS,
    url: buildHistoryUrl(config.baseUrl, path),
  })
}

export async function getHistoriesRequest(input: HistoryAuthInput): Promise<HistoryRequestResponse> {
  return sendHistoryRequest('history', {
    headers: buildAuthorizationHeader(input),
    method: 'GET',
  })
}

export async function postHistoryRequest(input: HistoryMutationInput): Promise<HistoryRequestResponse> {
  return sendHistoryRequest('history', {
    body: JSON.stringify(toHistoryMutationBody(input)),
    headers: {
      ...buildAuthorizationHeader(input),
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
}

export async function patchHistoryRequest(input: HistoryUpdateInput): Promise<HistoryRequestResponse> {
  return sendHistoryRequest(`history/${encodeURIComponent(input.historyId)}`, {
    body: JSON.stringify(toHistoryMutationBody(input)),
    headers: {
      ...buildAuthorizationHeader(input),
      'Content-Type': 'application/json',
    },
    method: 'PATCH',
  })
}

export async function deleteHistoryRequest(input: HistoryDeleteInput): Promise<HistoryRequestResponse> {
  return sendHistoryRequest(`history/${encodeURIComponent(input.historyId)}`, {
    headers: buildAuthorizationHeader(input),
    method: 'DELETE',
  })
}
