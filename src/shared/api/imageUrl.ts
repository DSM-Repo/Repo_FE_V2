'use client'

import { buildClientApiUrl, getClientApiConfig } from './clientApiBaseUrl'

export function normalizeHttpImageUrl(value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return ''
  }

  try {
    const url = trimmedValue.startsWith('//') ? new URL(`https:${trimmedValue}`) : new URL(trimmedValue)

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.href
    }
  } catch (error) {
    if (error instanceof TypeError) {
      return ''
    }

    throw error
  }

  return ''
}

export function normalizeApiImageUrl(value: string, apiBaseUrl: string | undefined) {
  const httpImageUrl = normalizeHttpImageUrl(value)

  if (httpImageUrl) {
    return httpImageUrl
  }

  const trimmedValue = value.trim()

  if (!trimmedValue || trimmedValue.startsWith('data:') || !trimmedValue.startsWith('/')) {
    return ''
  }

  const apiConfig = getClientApiConfig(apiBaseUrl?.trim(), '')

  if (apiConfig.kind !== 'ready') {
    return ''
  }

  return normalizeHttpImageUrl(buildClientApiUrl(apiConfig.baseUrl, trimmedValue).href)
}

export function normalizeDisplayImageUrl(value: string, apiBaseUrl: string | undefined) {
  const trimmedValue = value.trim()

  if (trimmedValue.startsWith('data:image/')) {
    return trimmedValue
  }

  return normalizeApiImageUrl(trimmedValue, apiBaseUrl)
}
