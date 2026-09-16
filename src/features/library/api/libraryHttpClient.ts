'use client'

import type { LibraryAuthInput, LibraryResumeInput, LibrarySearchInput } from './libraryApi.types'

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
const DEFAULT_LIBRARY_SEARCH_PAGE = 0
const DEFAULT_LIBRARY_SEARCH_SIZE = 20
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

function buildLibraryUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
}

function appendSearchParam(searchParams: URLSearchParams, key: string, value: number | string | undefined) {
  if (value === undefined) {
    return
  }

  const normalizedValue = typeof value === 'string' ? value.trim() : String(value)

  if (!normalizedValue) {
    return
  }

  searchParams.set(key, normalizedValue)
}

function buildLibrarySearchUrl(baseUrl: string, input: LibrarySearchInput) {
  const url = buildLibraryUrl(baseUrl, 'library/search')

  appendSearchParam(url.searchParams, 'keyword', input.keyword)
  appendSearchParam(url.searchParams, 'major', input.major)
  appendSearchParam(url.searchParams, 'date', input.date)
  appendSearchParam(url.searchParams, 'page', input.page ?? DEFAULT_LIBRARY_SEARCH_PAGE)
  appendSearchParam(url.searchParams, 'size', input.size ?? DEFAULT_LIBRARY_SEARCH_SIZE)

  return url.href
}

async function sendLibraryRequest(path: string, init: RequestInit): Promise<LibraryRequestResponse> {
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
    const response = await fetch(buildLibraryUrl(config.baseUrl, path).href, {
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

function buildAuthorizationHeader(input: LibraryAuthInput) {
  return {
    Authorization: `Bearer ${input.accessToken}`,
  }
}

export async function getLibraryRequest(input: LibraryAuthInput): Promise<LibraryRequestResponse> {
  return sendLibraryRequest('library', {
    headers: buildAuthorizationHeader(input),
    method: 'GET',
  })
}

export async function getLibraryResumeRequest(input: LibraryResumeInput): Promise<LibraryRequestResponse> {
  return sendLibraryRequest(`library/${encodeURIComponent(String(input.studentId))}`, {
    headers: buildAuthorizationHeader(input),
    method: 'GET',
  })
}

export async function getLibrarySearchRequest(input: LibrarySearchInput): Promise<LibraryRequestResponse> {
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
    const response = await fetch(buildLibrarySearchUrl(config.baseUrl, input), {
      headers: buildAuthorizationHeader(input),
      method: 'GET',
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
