'use client'

type ClientApiConfig =
  | {
      readonly baseUrl: string
      readonly kind: 'ready'
    }
  | {
      readonly kind: 'invalid'
      readonly message: string
    }

const API_PROXY_BASE_PATH = '/api/backend/'

function shouldProxyThroughSameOrigin(apiUrl: URL) {
  if (typeof window === 'undefined') {
    return false
  }

  return window.location.protocol === 'https:' && apiUrl.protocol === 'http:'
}

export function getClientApiConfig(apiBaseUrl: string | undefined, invalidMessage: string): ClientApiConfig {
  if (!apiBaseUrl) {
    return {
      kind: 'invalid',
      message: invalidMessage,
    }
  }

  try {
    const parsedApiUrl = new URL(apiBaseUrl)

    if (shouldProxyThroughSameOrigin(parsedApiUrl)) {
      return {
        baseUrl: new URL(API_PROXY_BASE_PATH, window.location.origin).href,
        kind: 'ready',
      }
    }

    return {
      baseUrl: parsedApiUrl.href,
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

export function buildClientApiUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
}
