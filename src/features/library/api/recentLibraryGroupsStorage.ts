'use client'

import type { LibraryBookGroup } from './libraryApi.types'

const RECENT_LIBRARY_GROUPS_KEY = 'repo.library.recentGroups'
const FIRST_COHORT_GRADUATION_YEAR = 2015
const DEFAULT_RELEASED_LIBRARY_YEAR = 2

function getGroupKey(group: LibraryBookGroup) {
  return `${group.date}:${group.cohort}:${group.year}`
}

function toLibraryBookGroup(value: unknown): LibraryBookGroup | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const candidate = value as Record<string, unknown>

  const isValidGroup =
    Number.isSafeInteger(candidate.cohort) &&
    Number.isSafeInteger(candidate.date) &&
    Number.isSafeInteger(candidate.year) &&
    Number(candidate.cohort) > 0 &&
    Number(candidate.date) > 0 &&
    Number(candidate.year) > 0

  if (!isValidGroup) {
    return undefined
  }

  return {
    cohort: Number(candidate.cohort),
    date: Number(candidate.date),
    year: DEFAULT_RELEASED_LIBRARY_YEAR,
  }
}

function readRecentGroups(): LibraryBookGroup[] {
  if (typeof window === 'undefined') {
    return []
  }

  const rawValue = window.localStorage.getItem(RECENT_LIBRARY_GROUPS_KEY)

  if (!rawValue) {
    return []
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue)

    return Array.isArray(parsedValue) ? parsedValue.map(toLibraryBookGroup).filter((group) => group !== undefined) : []
  } catch {
    return []
  }
}

function writeRecentGroups(groups: readonly LibraryBookGroup[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(RECENT_LIBRARY_GROUPS_KEY, JSON.stringify(groups))
}

function sortLibraryGroups(groups: readonly LibraryBookGroup[]) {
  return [...groups].sort((left, right) => right.date - left.date || right.cohort - left.cohort || right.year - left.year)
}

export function toReleasedLibraryBookGroup(savedAt: string): LibraryBookGroup {
  const savedYear = new Date(savedAt).getFullYear()
  const date = Number.isSafeInteger(savedYear) ? savedYear : new Date().getFullYear()

  return {
    cohort: Math.max(1, date - FIRST_COHORT_GRADUATION_YEAR),
    date,
    year: DEFAULT_RELEASED_LIBRARY_YEAR,
  }
}

export function getRecentLibraryBookGroups(): readonly LibraryBookGroup[] {
  return readRecentGroups()
}

export function saveRecentLibraryBookGroup(group: LibraryBookGroup) {
  const groupsByKey = new Map(readRecentGroups().map((recentGroup) => [getGroupKey(recentGroup), recentGroup]))
  groupsByKey.set(getGroupKey(group), group)
  writeRecentGroups(sortLibraryGroups([...groupsByKey.values()]))
}

export function removeRecentLibraryBookGroup(group: LibraryBookGroup) {
  writeRecentGroups(readRecentGroups().filter((recentGroup) => getGroupKey(recentGroup) !== getGroupKey(group)))
}

export function mergeLibraryBookGroups(
  books: readonly LibraryBookGroup[],
  recentBooks: readonly LibraryBookGroup[],
): readonly LibraryBookGroup[] {
  const groupsByKey = new Map<string, LibraryBookGroup>()

  for (const book of books) {
    groupsByKey.set(getGroupKey(book), book)
  }

  for (const recentBook of recentBooks) {
    groupsByKey.set(getGroupKey(recentBook), recentBook)
  }

  return sortLibraryGroups([...groupsByKey.values()])
}
