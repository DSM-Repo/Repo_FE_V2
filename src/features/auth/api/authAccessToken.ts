import type { AuthLoginRole } from './authApi.types'

type JsonRecord = {
  readonly [key: string]: unknown
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function decodeBase64Url(value: string) {
  const normalizedValue = value.replace(/-/g, '+').replace(/_/g, '/')
  const paddedValue = normalizedValue.padEnd(normalizedValue.length + ((4 - (normalizedValue.length % 4)) % 4), '=')
  const binaryValue = atob(paddedValue)
  const bytes = Uint8Array.from(binaryValue, (character) => character.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}

export function getAuthRoleFromAccessToken(accessToken: string): AuthLoginRole | undefined {
  const tokenParts = accessToken.split('.')

  if (tokenParts.length !== 3 || tokenParts.some((part) => !part)) {
    return undefined
  }

  let payload: unknown

  try {
    payload = JSON.parse(decodeBase64Url(tokenParts[1]))
  } catch (error) {
    if (error instanceof DOMException || error instanceof SyntaxError || error instanceof TypeError) {
      return undefined
    }

    throw error
  }

  if (!isJsonRecord(payload)) {
    return undefined
  }

  const expiresAt = payload['exp']

  if (expiresAt !== undefined && (typeof expiresAt !== 'number' || expiresAt <= Date.now() / 1_000)) {
    return undefined
  }

  if (payload['role'] === 'STUDENT') {
    return 'student'
  }

  if (payload['role'] === 'TEACHER') {
    return 'teacher'
  }

  return undefined
}
