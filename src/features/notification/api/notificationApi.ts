'use client'

import type {
  NotificationAuthInput,
  NotificationDeleteInput,
  NotificationDeleteResult,
  NotificationItem,
  NotificationListResult,
  NotificationReadInput,
  NotificationReadResult,
  NotificationType,
} from './notificationApi.types'
import {
  deleteNotificationRequest,
  getNotificationsRequest,
  patchNotificationReadRequest,
  type NotificationRequestFailure,
  type NotificationRequestResponse,
} from './notificationHttpClient'

type JsonRecord = {
  readonly [key: string]: unknown
}

type OptionalStringResult =
  | {
      readonly kind: 'invalid'
    }
  | {
      readonly kind: 'valid'
      readonly value?: string
    }

const INVALID_NOTIFICATION_LIST_RESPONSE = {
  kind: 'server-error',
  message: '알림 목록 응답 형식이 올바르지 않습니다.',
} as const satisfies NotificationListResult
const INVALID_NOTIFICATION_READ_RESPONSE = {
  kind: 'server-error',
  message: '알림 읽음 처리 응답 형식이 올바르지 않습니다.',
} as const satisfies NotificationReadResult
const RESPONSE_BODY_STREAM_FAILURE = {
  kind: 'network-error',
  message: '알림 API 응답을 읽지 못했습니다. 잠시 후 다시 시도해주세요.',
} as const satisfies NotificationRequestFailure

type NotificationHttpResponse = Extract<NotificationRequestResponse, { readonly kind: 'response' }>

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNotificationType(value: unknown): value is NotificationType {
  return value === 'FEEDBACK_CREATED'
}

function parseOptionalString(value: unknown): OptionalStringResult {
  if (value === undefined || value === null) {
    return {
      kind: 'valid',
    }
  }

  if (typeof value !== 'string') {
    return {
      kind: 'invalid',
    }
  }

  return {
    kind: 'valid',
    value,
  }
}

function parseNotification(value: unknown): NotificationItem | undefined {
  if (
    !isJsonRecord(value) ||
    typeof value['alramId'] !== 'string' ||
    typeof value['content'] !== 'string' ||
    typeof value['createdAt'] !== 'string' ||
    typeof value['isRead'] !== 'boolean' ||
    !isNotificationType(value['type'])
  ) {
    return undefined
  }

  const feedbackId = parseOptionalString(value['feedbackId'])
  const resumeId = parseOptionalString(value['resumeId'])

  if (feedbackId.kind === 'invalid' || resumeId.kind === 'invalid') {
    return undefined
  }

  return {
    alramId: value['alramId'],
    content: value['content'],
    createdAt: value['createdAt'],
    ...(feedbackId.value ? { feedbackId: feedbackId.value } : {}),
    isRead: value['isRead'],
    ...(resumeId.value ? { resumeId: resumeId.value } : {}),
    type: value['type'],
  }
}

function parseNotifications(value: unknown): readonly NotificationItem[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const notifications = value.map(parseNotification)

  if (notifications.some((notification) => notification === undefined)) {
    return undefined
  }

  return notifications.filter((notification) => notification !== undefined)
}

function parseNotificationRead(value: unknown): NotificationReadResult | undefined {
  if (!isJsonRecord(value) || typeof value['isRead'] !== 'boolean') {
    return undefined
  }

  return {
    isRead: value['isRead'],
    kind: 'success',
  }
}

function toNotificationListReadFailure(error: unknown): NotificationListResult {
  if (error instanceof SyntaxError) {
    return INVALID_NOTIFICATION_LIST_RESPONSE
  }

  if (error instanceof DOMException || error instanceof TypeError || error instanceof Error) {
    return RESPONSE_BODY_STREAM_FAILURE
  }

  throw error
}

function toNotificationReadReadFailure(error: unknown): NotificationReadResult {
  if (error instanceof SyntaxError) {
    return INVALID_NOTIFICATION_READ_RESPONSE
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

async function readNotificationListResponseBody(
  response: NotificationHttpResponse,
): Promise<NotificationListResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toNotificationListReadFailure(error)
  } finally {
    response.complete()
  }

  const notifications = parseNotifications(responseBody)

  if (!notifications) {
    return INVALID_NOTIFICATION_LIST_RESPONSE
  }

  return {
    kind: 'success',
    notifications,
  }
}

async function readNotificationReadResponseBody(
  response: NotificationHttpResponse,
): Promise<NotificationReadResult> {
  let responseBody: unknown

  try {
    responseBody = await response.value.json()
  } catch (error) {
    return toNotificationReadReadFailure(error)
  } finally {
    response.complete()
  }

  return parseNotificationRead(responseBody) ?? INVALID_NOTIFICATION_READ_RESPONSE
}

export async function getNotifications(input: NotificationAuthInput): Promise<NotificationListResult> {
  const response = await getNotificationsRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readNotificationListResponseBody(response)
  }

  response.complete()

  if (response.value.status === 401 || response.value.status === 403) {
    return toForbiddenResult('알림 목록을 조회할 권한이 없습니다. 다시 로그인해주세요.')
  }

  return {
    kind: 'server-error',
    message: '알림 목록 조회 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function markNotificationRead(input: NotificationReadInput): Promise<NotificationReadResult> {
  const response = await patchNotificationReadRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    return readNotificationReadResponseBody(response)
  }

  response.complete()

  if (response.value.status === 401 || response.value.status === 403) {
    return toForbiddenResult('알림을 읽음 처리할 권한이 없습니다. 다시 로그인해주세요.')
  }

  return {
    kind: 'server-error',
    message: '알림 읽음 처리 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function removeNotification(input: NotificationDeleteInput): Promise<NotificationDeleteResult> {
  const response = await deleteNotificationRequest(input)

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
    return toForbiddenResult('알림을 삭제할 권한이 없습니다. 다시 로그인해주세요.')
  }

  return {
    kind: 'server-error',
    message: '알림 삭제 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}
