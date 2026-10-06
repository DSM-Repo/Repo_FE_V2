'use client'

import { getAuthSubjectClaimFromAccessToken } from '../../auth/api/authAccessToken'
import { getSavedAccessToken } from '../../auth/api/authTokenStorage'

export const RESUME_ID_STORAGE_KEY = 'repo.resume.id'

function getResumeIdStorageKey(): string | undefined {
  const accessToken = getSavedAccessToken()
  const subject = accessToken ? getAuthSubjectClaimFromAccessToken(accessToken) : undefined

  return subject ? `${RESUME_ID_STORAGE_KEY}.${encodeURIComponent(subject)}` : undefined
}

export function getSavedResumeId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  const storageKey = getResumeIdStorageKey()

  try {
    const resumeId = storageKey ? window.localStorage.getItem(storageKey)?.trim() : undefined

    if (resumeId) {
      return resumeId
    }

    const legacyResumeId = window.localStorage.getItem(RESUME_ID_STORAGE_KEY)?.trim()

    if (legacyResumeId) {
      if (storageKey) {
        window.localStorage.setItem(storageKey, legacyResumeId)
        window.localStorage.removeItem(RESUME_ID_STORAGE_KEY)
      }
      return legacyResumeId
    }

    return undefined
  } catch (error) {
    if (error instanceof DOMException || error instanceof Error) {
      console.warn('저장된 이력서 ID를 읽지 못했습니다.', error)
      return undefined
    }

    throw error
  }
}

export function saveResumeId(resumeId: string) {
  if (typeof window === 'undefined') {
    return
  }

  const storageKey = getResumeIdStorageKey()

  if (storageKey) {
    window.localStorage.setItem(storageKey, resumeId)
    window.localStorage.removeItem(RESUME_ID_STORAGE_KEY)
  } else {
    window.localStorage.setItem(RESUME_ID_STORAGE_KEY, resumeId)
  }
}

export function clearSavedResumeId() {
  if (typeof window === 'undefined') {
    return
  }

  const storageKey = getResumeIdStorageKey()

  if (storageKey) {
    window.localStorage.removeItem(storageKey)
  }

  window.localStorage.removeItem(RESUME_ID_STORAGE_KEY)
}
