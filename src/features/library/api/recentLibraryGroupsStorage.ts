'use client'

import type { LibraryBookGroup, LibraryResume, LibrarySearchStudent } from './libraryApi.types'

const RECENT_LIBRARY_GROUPS_KEY = 'repo.library.recentGroups'
const RECENT_LIBRARY_RESUMES_KEY = 'repo.library.recentResumes'
const RECENT_LIBRARY_STUDENTS_KEY = 'repo.library.recentStudents'
const FIRST_COHORT_GRADUATION_YEAR = 2015
const DEFAULT_RELEASED_LIBRARY_YEAR = 2

export type RecentLibraryStudent = LibrarySearchStudent & {
  readonly date: number
}

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

function toRecentLibraryStudent(value: unknown): RecentLibraryStudent | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const candidate = value as Record<string, unknown>

  if (
    !Number.isSafeInteger(candidate.date) ||
    !Number.isSafeInteger(candidate.studentId) ||
    typeof candidate.major !== 'string' ||
    typeof candidate.studentName !== 'string' ||
    ('studentNumber' in candidate && typeof candidate.studentNumber !== 'string')
  ) {
    return undefined
  }

  const studentNumber = typeof candidate.studentNumber === 'string' ? candidate.studentNumber : undefined

  return {
    date: Number(candidate.date),
    major: candidate.major,
    studentId: Number(candidate.studentId),
    studentName: candidate.studentName,
    ...(studentNumber === undefined ? {} : { studentNumber }),
  }
}

function readRecentStudents(): RecentLibraryStudent[] {
  if (typeof window === 'undefined') {
    return []
  }

  const rawValue = window.localStorage.getItem(RECENT_LIBRARY_STUDENTS_KEY)

  if (!rawValue) {
    return []
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue)

    return Array.isArray(parsedValue)
      ? parsedValue.map(toRecentLibraryStudent).filter((student) => student !== undefined)
      : []
  } catch {
    return []
  }
}

function writeRecentStudents(students: readonly RecentLibraryStudent[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(RECENT_LIBRARY_STUDENTS_KEY, JSON.stringify(students))
}

function sortLibraryGroups(groups: readonly LibraryBookGroup[]) {
  return [...groups].sort((left, right) => right.date - left.date || right.cohort - left.cohort || right.year - left.year)
}

function getStudentKey(student: Pick<RecentLibraryStudent, 'date' | 'studentId'>) {
  return `${student.date}:${student.studentId}`
}

function toRecentLibraryResume(value: unknown): LibraryResume | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const candidate = value as Record<string, unknown>

  if (
    !Number.isSafeInteger(candidate.cohort) ||
    !Number.isSafeInteger(candidate.date) ||
    !Number.isSafeInteger(candidate.studentId) ||
    !Number.isSafeInteger(candidate.year) ||
    typeof candidate.email !== 'string' ||
    typeof candidate.introduce !== 'string' ||
    typeof candidate.majorName !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.portfolioUrl !== 'string' ||
    typeof candidate.profileImageUrl !== 'string' ||
    typeof candidate.releasedAt !== 'string' ||
    typeof candidate.resumeId !== 'string' ||
    typeof candidate.studentNumber !== 'string' ||
    !Array.isArray(candidate.pages)
  ) {
    return undefined
  }

  const pages = candidate.pages
    .map((page): LibraryResume['pages'][number] | undefined => {
      if (!page || typeof page !== 'object') {
        return undefined
      }

      const pageCandidate = page as Record<string, unknown>

      if (
        typeof pageCandidate.content !== 'string' ||
        typeof pageCandidate.id !== 'string' ||
        !Number.isSafeInteger(pageCandidate.index)
      ) {
        return undefined
      }

      return {
        content: pageCandidate.content,
        id: pageCandidate.id,
        index: Number(pageCandidate.index),
      }
    })
    .filter((page) => page !== undefined)

  return {
    cohort: Number(candidate.cohort),
    date: Number(candidate.date),
    email: candidate.email,
    introduce: candidate.introduce,
    majorName: candidate.majorName,
    name: candidate.name,
    pages,
    portfolioUrl: candidate.portfolioUrl,
    profileImageUrl: candidate.profileImageUrl,
    releasedAt: candidate.releasedAt,
    resumeId: candidate.resumeId,
    studentId: Number(candidate.studentId),
    studentNumber: candidate.studentNumber,
    year: DEFAULT_RELEASED_LIBRARY_YEAR,
  }
}

function readRecentResumes(): LibraryResume[] {
  if (typeof window === 'undefined') {
    return []
  }

  const rawValue = window.localStorage.getItem(RECENT_LIBRARY_RESUMES_KEY)

  if (!rawValue) {
    return []
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue)

    return Array.isArray(parsedValue)
      ? parsedValue.map(toRecentLibraryResume).filter((resume) => resume !== undefined)
      : []
  } catch {
    return []
  }
}

function writeRecentResumes(resumes: readonly LibraryResume[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(RECENT_LIBRARY_RESUMES_KEY, JSON.stringify(resumes))
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

export function saveRecentLibraryStudent(student: RecentLibraryStudent) {
  const studentsByKey = new Map(readRecentStudents().map((recentStudent) => [getStudentKey(recentStudent), recentStudent]))
  studentsByKey.set(getStudentKey(student), student)
  writeRecentStudents([...studentsByKey.values()])
}

export function removeRecentLibraryStudent(student: Pick<RecentLibraryStudent, 'date' | 'studentId'>) {
  writeRecentStudents(readRecentStudents().filter((recentStudent) => getStudentKey(recentStudent) !== getStudentKey(student)))
}

export function getRecentLibraryResume(studentId: number): LibraryResume | undefined {
  return readRecentResumes().find((resume) => resume.studentId === studentId)
}

export function saveRecentLibraryResume(resume: LibraryResume) {
  const resumes = readRecentResumes().filter((recentResume) => recentResume.studentId !== resume.studentId)
  writeRecentResumes([...resumes, resume])
}

export function removeRecentLibraryResume(studentId: number) {
  writeRecentResumes(readRecentResumes().filter((resume) => resume.studentId !== studentId))
}

export function getRecentLibraryStudents(input: { readonly date: number; readonly keyword?: string }): readonly LibrarySearchStudent[] {
  const keyword = input.keyword?.trim().toLowerCase()

  return readRecentStudents()
    .filter((student) => student.date === input.date)
    .filter((student) => (keyword ? student.studentName.toLowerCase().includes(keyword) : true))
    .map(({ major, studentId, studentName, studentNumber }) => ({
      major,
      studentId,
      studentName,
      ...(studentNumber === undefined ? {} : { studentNumber }),
    }))
}

export function mergeLibrarySearchStudents(
  students: readonly LibrarySearchStudent[],
  recentStudents: readonly LibrarySearchStudent[],
): readonly LibrarySearchStudent[] {
  const studentsById = new Map<number, LibrarySearchStudent>()

  for (const student of recentStudents) {
    studentsById.set(student.studentId, student)
  }

  for (const student of students) {
    studentsById.set(student.studentId, student)
  }

  return [...studentsById.values()]
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
