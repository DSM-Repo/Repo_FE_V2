'use client'

import type {
  AuthEmailSendInput,
  AuthEmailSendResult,
  AuthEmailVerifyInput,
  AuthEmailVerifyResult,
  AuthLoginInput,
  AuthLoginResult,
  AuthLoginToken,
  AuthRefreshInput,
  AuthRefreshResult,
  AuthRefreshToken,
  AuthSignupInput,
  AuthSignupResult,
} from './authApi.types'
import { postAuthJsonRequest, postAuthRefreshRequest } from './authHttpClient'

type JsonRecord = {
  readonly [key: string]: unknown
}

const INVALID_LOGIN_RESPONSE = {
  kind: 'server-error',
  message: '로그인 응답 형식이 올바르지 않습니다.',
} as const satisfies AuthLoginResult
const INVALID_REFRESH_RESPONSE = {
  kind: 'server-error',
  message: '토큰 재발급 응답 형식이 올바르지 않습니다.',
} as const satisfies AuthRefreshResult

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseAuthLoginToken(value: unknown): AuthLoginToken | undefined {
  if (
    !isJsonRecord(value) ||
    typeof value['accessToken'] !== 'string' ||
    typeof value['refreshToken'] !== 'string' ||
    typeof value['tokenType'] !== 'string'
  ) {
    return undefined
  }

  return {
    accessToken: value['accessToken'],
    refreshToken: value['refreshToken'],
    tokenType: value['tokenType'],
  }
}

function parseAuthRefreshToken(value: unknown): AuthRefreshToken | undefined {
  if (!isJsonRecord(value) || typeof value['accessToken'] !== 'string') {
    return undefined
  }

  return {
    accessToken: value['accessToken'],
  }
}

export async function loginWithAuthApi(input: AuthLoginInput): Promise<AuthLoginResult> {
  const response = await postAuthJsonRequest('user/login', input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    let responseBody: unknown

    try {
      responseBody = await response.value.json()
    } catch (error) {
      if (error instanceof SyntaxError) {
        return INVALID_LOGIN_RESPONSE
      }

      throw error
    }

    const token = parseAuthLoginToken(responseBody)

    if (!token) {
      return INVALID_LOGIN_RESPONSE
    }

    return {
      kind: 'success',
      message: '로그인 요청이 승인되었습니다.',
      token,
    }
  }

  if (response.value.status === 401 || response.value.status === 403) {
    return {
      kind: 'invalid-credentials',
      message: '이메일 또는 비밀번호를 확인해주세요.',
    }
  }

  return {
    kind: 'server-error',
    message: '로그인 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function refreshAuthToken(input: AuthRefreshInput): Promise<AuthRefreshResult> {
  const response = await postAuthRefreshRequest(input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    let responseBody: unknown

    try {
      responseBody = await response.value.json()
    } catch (error) {
      if (error instanceof SyntaxError) {
        return INVALID_REFRESH_RESPONSE
      }

      throw error
    }

    const token = parseAuthRefreshToken(responseBody)

    if (!token) {
      return INVALID_REFRESH_RESPONSE
    }

    return {
      kind: 'success',
      message: '토큰을 재발급했습니다.',
      token,
    }
  }

  if (response.value.status === 401 || response.value.status === 403) {
    return {
      kind: 'invalid-refresh-token',
      message: '다시 로그인해주세요.',
    }
  }

  return {
    kind: 'server-error',
    message: '토큰 재발급 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function signupWithAuthApi(input: AuthSignupInput): Promise<AuthSignupResult> {
  const response = await postAuthJsonRequest('user/signup', input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.status === 201) {
    return {
      kind: 'success',
      message: '회원가입이 완료되었습니다.',
    }
  }

  return {
    kind: 'server-error',
    message: '회원가입 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  }
}

export async function sendEmailVerificationCode(input: AuthEmailSendInput): Promise<AuthEmailSendResult> {
  const response = await postAuthJsonRequest('user/email/send', input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.status === 204) {
    return {
      kind: 'success',
      message: '인증 코드를 전송했습니다.',
    }
  }

  return {
    kind: 'server-error',
    message: '인증 코드 발송에 실패했습니다.',
  }
}

export async function verifyEmailCode(input: AuthEmailVerifyInput): Promise<AuthEmailVerifyResult> {
  const response = await postAuthJsonRequest('user/email/verify', input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.status === 204) {
    return {
      kind: 'success',
      message: '이메일 인증이 완료되었습니다.',
    }
  }

  if ([400, 401, 404].includes(response.value.status)) {
    return {
      kind: 'invalid-code',
      message: '인증 코드를 확인해주세요.',
    }
  }

  return {
    kind: 'server-error',
    message: '이메일 인증에 실패했습니다.',
  }
}
