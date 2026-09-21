'use client'

export const RESUME_ID_STORAGE_KEY = 'repo.resume.id'

export function getSavedResumeId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  try {
    return window.localStorage.getItem(RESUME_ID_STORAGE_KEY)?.trim() || undefined
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

  window.localStorage.setItem(RESUME_ID_STORAGE_KEY, resumeId)
}

export function clearSavedResumeId() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(RESUME_ID_STORAGE_KEY)
}
