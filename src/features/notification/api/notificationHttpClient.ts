'use client'

import { sendAuthenticatedRequest } from '../../auth/api/authenticatedRequest'
import type {
  NotificationAuthInput,
  NotificationDeleteInput,
  NotificationReadInput,
} from './notificationApi.types'

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
  if (!NOTIFICATION_API_BASE_URL) {
    return {
      kind: 'invalid',
      message: 'API 주소가 설정되지 않았습니다.',
    }
  }

  try {
    return {
      baseUrl: new URL(NOTIFICATION_API_BASE_URL).href,
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

function buildNotificationUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).href
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
