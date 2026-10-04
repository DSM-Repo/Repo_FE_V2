'use client'

const RESUME_VISIBILITY_OVERRIDES_KEY = 'repo.resume.visibilityOverrides'

type ResumeVisibilityOverride = {
  readonly isPublic: boolean
  readonly studentId: number
}

function isResumeVisibilityOverride(value: unknown): value is ResumeVisibilityOverride {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>

  return Number.isSafeInteger(candidate.studentId) && typeof candidate.isPublic === 'boolean'
}

function readVisibilityOverrides(): ResumeVisibilityOverride[] {
  if (typeof window === 'undefined') {
    return []
  }

  const rawValue = window.localStorage.getItem(RESUME_VISIBILITY_OVERRIDES_KEY)

  if (!rawValue) {
    return []
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue)

    return Array.isArray(parsedValue) ? parsedValue.filter(isResumeVisibilityOverride) : []
  } catch {
    return []
  }
}

function writeVisibilityOverrides(overrides: readonly ResumeVisibilityOverride[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(RESUME_VISIBILITY_OVERRIDES_KEY, JSON.stringify(overrides))
}

export function getSavedResumeVisibility(studentId: number): boolean | undefined {
  return readVisibilityOverrides().find((override) => override.studentId === studentId)?.isPublic
}

export function saveResumeVisibility(input: ResumeVisibilityOverride) {
  const overrides = readVisibilityOverrides().filter((override) => override.studentId !== input.studentId)
  writeVisibilityOverrides([...overrides, input])
}
