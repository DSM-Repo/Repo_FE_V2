'use client'

import { sendAuthenticatedRequest } from '../../auth/api/authenticatedRequest'
import type {
  NotificationAuthInput,
  NotificationDeleteInput,
  NotificationReadInput,
} from './notificationApi.types'
import { buildClientApiUrl, getClientApiConfig } from '../../../shared/api/clientApiBaseUrl'

type NotificationApiConfig =
  | {
      readonly baseUrl: string
      readonly kind: 'ready'
    }
  | {
      readonly kind: 'invalid'
      readonly message: string
    }

export type NotificationRequestFailure = {
  readonly kind: 'configuration-error' | 'network-error'
  readonly message: string
}

export type NotificationRequestResponse =
  | NotificationRequestFailure
  | {
      readonly complete: () => void
      readonly kind: 'response'
      readonly value: Response
    }

const NOTIFICATION_REQUEST_TIMEOUT_MS = 8_000
const NOTIFICATION_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()

function getNotificationApiConfig(): NotificationApiConfig {
  return getClientApiConfig(NOTIFICATION_API_BASE_URL, 'API 주소가 설정되지 않았습니다.')
}

function buildNotificationUrl(baseUrl: string, path: string) {
  return buildClientApiUrl(baseUrl, path).href
}

function buildAuthorizationHeader(input: NotificationAuthInput) {
  return {
    Authorization: `Bearer ${input.accessToken}`,
  }
}

async function sendNotificationRequest(path: string, init: RequestInit): Promise<NotificationRequestResponse> {
  const config = getNotificationApiConfig()

  if (config.kind === 'invalid') {
    return {
      kind: 'configuration-error',
      message: config.message,
    }
  }

  return sendAuthenticatedRequest({
    init,
    networkErrorMessage: '알림 API에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.',
    timeoutMs: NOTIFICATION_REQUEST_TIMEOUT_MS,
    url: buildNotificationUrl(config.baseUrl, path),
  })
}

export async function getNotificationsRequest(input: NotificationAuthInput): Promise<NotificationRequestResponse> {
  return sendNotificationRequest('alram', {
    headers: buildAuthorizationHeader(input),
    method: 'GET',
  })
}

export async function patchNotificationReadRequest(
  input: NotificationReadInput,
): Promise<NotificationRequestResponse> {
  return sendNotificationRequest(`alram/${encodeURIComponent(input.alramId)}`, {
    headers: buildAuthorizationHeader(input),
    method: 'PATCH',
  })
}

export async function deleteNotificationRequest(
  input: NotificationDeleteInput,
): Promise<NotificationRequestResponse> {
  return sendNotificationRequest(`alram/${encodeURIComponent(input.alramId)}`, {
    headers: buildAuthorizationHeader(input),
    method: 'DELETE',
  })
}
