'use client'

type LibraryApiConfig =
  | {
      readonly baseUrl: string
      readonly kind: 'ready'
    }
  | {
      readonly kind: 'invalid'
      readonly message: string
    }

export type LibraryRequestFailure = {
  readonly kind: 'configuration-error' | 'network-error'
  readonly message: string
}

export type LibraryRequestResponse =
  | LibraryRequestFailure
  | {
      readonly complete: () => void
      readonly kind: 'response'
      readonly value: Response
    }

const LIBRARY_REQUEST_TIMEOUT_MS = 8_000
const LIBRARY_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? process.env.NEXT_PUBLIC_AUTH_API_BASE_URL?.trim()

function getLibraryApiConfig(): LibraryApiConfig {
  if (!LIBRARY_API_BASE_URL) {
    return {
      kind: 'invalid',
      message: 'API 주소가 설정되지 않았습니다.',
    }
  }

  try {
    return {
      baseUrl: new URL(LIBRARY_API_BASE_URL).href,
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

function buildLibraryUrl(baseUrl: string, path: 'library') {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).href
}

async function sendLibraryRequest(path: 'library', init: RequestInit): Promise<LibraryRequestResponse> {
  const config = getLibraryApiConfig()

  if (config.kind === 'invalid') {
    return {
      kind: 'configuration-error',
      message: config.message,
    }
  }

  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(() => controller.abort(), LIBRARY_REQUEST_TIMEOUT_MS)
  const complete = () => globalThis.clearTimeout(timeoutId)

  try {
    const response = await fetch(buildLibraryUrl(config.baseUrl, path), {
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
        message: '도서관 API에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.',
      }
    }

    throw error
  }
}

export async function getLibraryRequest(): Promise<LibraryRequestResponse> {
  return sendLibraryRequest('library', {
    method: 'GET',
  })
}
