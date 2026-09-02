'use client'

export type AuthLoginRole = 'student' | 'teacher'
export type AuthSignupRole = 'STUDENT'

export type AuthEmailSendInput = {
  readonly email: string
}

export type AuthEmailVerifyInput = {
  readonly code: string
  readonly email: string
}

export type AuthEmailSendResult =
  | {
      readonly kind: 'success'
      readonly message: string
    }
  | {
      readonly kind: 'configuration-error' | 'network-error' | 'server-error'
      readonly message: string
    }

export type AuthEmailVerifyResult =
  | {
      readonly kind: 'success'
      readonly message: string
    }
  | {
      readonly kind: 'configuration-error' | 'invalid-code' | 'network-error' | 'server-error'
      readonly message: string
    }

export type AuthLoginInput = {
  readonly email: string
  readonly password: string
}

export type AuthLoginToken = {
  readonly accessToken: string
  readonly refreshToken: string
  readonly tokenType: string
}

export type AuthLoginResult =
  | {
      readonly kind: 'success'
      readonly message: string
      readonly token: AuthLoginToken
    }
  | {
      readonly kind: 'configuration-error' | 'invalid-credentials' | 'network-error' | 'server-error'
      readonly message: string
    }

export type AuthSignupInput = {
  readonly email: string
  readonly password: string
  readonly role: AuthSignupRole
  readonly studentClass: number
  readonly studentGrade: number
  readonly studentName: string
  readonly studentNumber: number
}

export type AuthSignupResult =
  | {
      readonly kind: 'success'
      readonly message: string
    }
  | {
      readonly kind: 'configuration-error' | 'network-error' | 'server-error'
      readonly message: string
    }

type AuthApiConfig =
  | {
      readonly kind: 'ready'
      readonly baseUrl: string
    }
  | {
      readonly kind: 'invalid'
      readonly message: string
    }

type AuthRequestInput = AuthEmailSendInput | AuthEmailVerifyInput | AuthLoginInput | AuthSignupInput
type AuthRequestPath = 'user/email/send' | 'user/email/verify' | 'user/login' | 'user/signup'
type AuthRequestFailure = {
  readonly kind: 'configuration-error' | 'network-error'
  readonly message: string
}
type AuthRequestResponse =
  | AuthRequestFailure
  | {
      readonly kind: 'response'
      readonly value: Response
    }
type JsonRecord = {
  readonly [key: string]: unknown
}

const AUTH_REQUEST_TIMEOUT_MS = 8_000
const AUTH_API_BASE_URL = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL?.trim()

function getAuthApiConfig(): AuthApiConfig {
  if (!AUTH_API_BASE_URL) {
    return {
      kind: 'invalid',
      message: 'auth API 주소가 설정되지 않았습니다.',
    }
  }

  try {
    return {
      kind: 'ready',
      baseUrl: new URL(AUTH_API_BASE_URL).href,
    }
  } catch (error) {
    if (error instanceof TypeError) {
      return {
        kind: 'invalid',
        message: 'auth API 주소 형식이 올바르지 않습니다.',
      }
    }

    throw error
  }
}

function buildAuthUrl(baseUrl: string, path: AuthRequestPath) {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).href
}

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

async function postAuthRequest(path: AuthRequestPath, input: AuthRequestInput): Promise<AuthRequestResponse> {
  const config = getAuthApiConfig()

  if (config.kind === 'invalid') {
    return {
      kind: 'configuration-error',
      message: config.message,
    }
  }

  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(buildAuthUrl(config.baseUrl, path), {
      body: JSON.stringify(input),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: controller.signal,
    })

    return {
      kind: 'response',
      value: response,
    }
  } catch (error) {
    if (error instanceof DOMException || error instanceof TypeError) {
      return {
        kind: 'network-error',
        message: 'auth API에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.',
      }
    }

    throw error
  } finally {
    globalThis.clearTimeout(timeoutId)
  }
}

export async function loginWithAuthApi(input: AuthLoginInput): Promise<AuthLoginResult> {
  const response = await postAuthRequest('user/login', input)

  if (response.kind !== 'response') {
    return response
  }

  if (response.value.ok) {
    const responseBody: unknown = await response.value.json()
    const token = parseAuthLoginToken(responseBody)

    if (!token) {
      return {
        kind: 'server-error',
        message: '로그인 응답 형식이 올바르지 않습니다.',
      }
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

export async function signupWithAuthApi(input: AuthSignupInput): Promise<AuthSignupResult> {
  const response = await postAuthRequest('user/signup', input)

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
  const response = await postAuthRequest('user/email/send', input)

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
  const response = await postAuthRequest('user/email/verify', input)

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
