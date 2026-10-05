'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { getSavedAccessToken, getSavedAuthRole, type AuthLoginRole } from '@/features/auth/api'
import { getDepartmentFromSchoolNumber } from '@/app/(student)/resume/ResumeEditorSheet'
import {
  getLibraryBooks,
  getRecentLibraryBookGroups,
  getRecentLibraryStudents,
  mergeLibraryBookGroups,
  mergeLibrarySearchStudents,
  getLibraryResumeByStudentId,
  getRecentLibraryResume,
  searchLibraryStudents,
  type LibraryBookGroup,
  type LibraryResume,
  type LibraryResumePage,
  type LibrarySearchStudent,
} from '@/features/library/api'
import type { InternalHref } from '@/shared/lib/internalHref'
import type { AppHeaderItem, LibraryBookCardProps, ResumeBookSheetContent } from '@/shared/ui'
import { AppHeader, Button, LibraryBookCard, ResumeBookSheet, SearchField, Toast } from '@/shared/ui'

import styles from './page.module.css'

const studentNavigationItems = [
  { href: '/home', label: '홈', value: 'home' },
  { href: '/resume', label: '이력서 관리', value: 'resume' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

const teacherNavigationItems = [
  { href: '/majors', label: '전공 관리', value: 'majors' },
  { href: '/students', label: '학생 관리', value: 'students' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

const STUDENT_SEARCH_PAGE_SIZE = 20

type LibraryPageContentProps = {
  readonly showsLoadError: boolean
}

type StudentSearchCursor = {
  readonly key: string
  readonly page: number
}

type LibraryLoadState =
  | {
      readonly kind: 'failure'
      readonly message: string
    }
  | {
      readonly books: readonly LibraryBookGroup[]
      readonly kind: 'success'
    }
  | {
      readonly kind: 'loading'
    }

type StudentSearchState =
  | {
      readonly kind: 'failure'
      readonly message: string
    }
  | {
      readonly kind: 'loading'
    }
  | {
      readonly kind: 'success'
      readonly students: readonly LibrarySearchStudent[]
      readonly totalElements: number
    }

type ResumeLoadState =
  | {
      readonly kind: 'failure'
      readonly message: string
    }
  | {
      readonly kind: 'loading'
    }
  | {
      readonly kind: 'success'
      readonly resume: LibraryResume
    }

function subscribeToSavedAuthRole(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)

  return () => window.removeEventListener('storage', onStoreChange)
}

function getSavedAuthRoleSnapshot(): AuthLoginRole {
  return getSavedAuthRole() ?? 'student'
}

function getSavedAccessTokenSnapshot(): string | undefined {
  return getSavedAccessToken()
}

function getServerAccessTokenSnapshot(): string | undefined {
  return undefined
}

function getServerAuthRoleSnapshot(): AuthLoginRole {
  return 'student'
}

function toLibraryBookCard(book: LibraryBookGroup): LibraryBookCardProps {
  const href: InternalHref = `/library?date=${book.date}`

  return {
    ariaLabel: `${book.date} ${book.cohort}기 ${book.year}학년 포트폴리오 열람`,
    batchLabel: `${book.cohort}기`,
    gradeLabel: `${book.year}학년`,
    href,
    title: String(book.date),
  }
}

function parseSelectedDate(value: string | null): number | undefined {
  if (!value) {
    return undefined
  }

  const parsedDate = Number(value)

  if (!Number.isSafeInteger(parsedDate)) {
    return undefined
  }

  return parsedDate
}

function toHeadline(resume: LibraryResume) {
  return [resume.studentNumber, getDepartmentFromSchoolNumber(resume.studentNumber)].filter(Boolean).join(' ')
}

function toSheetContent(resume: LibraryResume, page: LibraryResumePage): ResumeBookSheetContent {
  return {
    activities: [],
    contests: [],
    email: resume.email,
    headline: toHeadline(resume),
    introduce: resume.introduce,
    majorName: resume.majorName,
    name: resume.name,
    pageContent: page.content,
    portfolioUrl: resume.portfolioUrl,
    profileImageUrl: resume.profileImageUrl,
    projects: [],
    skills: [],
  }
}

function sortResumePages(pages: readonly LibraryResumePage[]) {
  return [...pages].sort((leftPage, rightPage) => leftPage.index - rightPage.index)
}

export function LibraryPageContent({ showsLoadError }: LibraryPageContentProps) {
  const searchParams = useSearchParams()
  const role = useSyncExternalStore(subscribeToSavedAuthRole, getSavedAuthRoleSnapshot, getServerAuthRoleSnapshot)
  const accessToken = useSyncExternalStore(
    subscribeToSavedAuthRole,
    getSavedAccessTokenSnapshot,
    getServerAccessTokenSnapshot,
  )
  const [loadState, setLoadState] = useState<LibraryLoadState>({ kind: 'loading' })
  const [searchKeyword, setSearchKeyword] = useState('')
  const [studentSearchState, setStudentSearchState] = useState<StudentSearchState>({ kind: 'loading' })
  const [studentSearchCursor, setStudentSearchCursor] = useState<StudentSearchCursor>({ key: '', page: 0 })
  const [resumeLoadState, setResumeLoadState] = useState<ResumeLoadState>({ kind: 'loading' })
  const [visiblePageIndex, setVisiblePageIndex] = useState(0)
  const [isLoadingMoreStudents, setIsLoadingMoreStudents] = useState(false)
  const selectedDate = parseSelectedDate(searchParams.get('date'))
  const navigationItems = role === 'teacher' ? teacherNavigationItems : studentNavigationItems
  const libraryBooks = loadState.kind === 'success' ? loadState.books.map(toLibraryBookCard) : []
  const normalizedSearchKeyword = searchKeyword.trim()
  const studentSearchKey = selectedDate === undefined ? '' : `${selectedDate}:${normalizedSearchKeyword}`
  const studentSearchPage = studentSearchCursor.key === studentSearchKey ? studentSearchCursor.page : 0
  const canLoadMoreStudents =
    studentSearchState.kind === 'success' && studentSearchState.students.length < studentSearchState.totalElements
  const activeStudentId = studentSearchState.kind === 'success' ? studentSearchState.students[0]?.studentId : undefined
  const sortedResumePages = useMemo(
    () => (resumeLoadState.kind === 'success' ? sortResumePages(resumeLoadState.resume.pages) : []),
    [resumeLoadState],
  )
  const visibleResumePages = sortedResumePages.slice(visiblePageIndex, visiblePageIndex + 2)
  const displayedPageNumber = Math.min(sortedResumePages.length, visiblePageIndex + visibleResumePages.length)

  useEffect(() => {
    let ignoresResult = false

    async function loadLibraryBooks() {
      if (!accessToken) {
        setLoadState({
          kind: 'failure',
          message: '로그인 후 도서관을 이용할 수 있습니다.',
        })
        return
      }

      const result = await getLibraryBooks({ accessToken })
      const recentLibraryBooks = getRecentLibraryBookGroups()

      if (ignoresResult) {
        return
      }

      if (result.kind === 'success') {
        setLoadState({
          books: mergeLibraryBookGroups(result.books, getRecentLibraryBookGroups()),
          kind: 'success',
        })
        return
      }

      if (recentLibraryBooks.length > 0) {
        setLoadState({
          books: recentLibraryBooks,
          kind: 'success',
        })
        return
      }

      setLoadState({
        kind: 'failure',
        message: result.message,
      })
    }

    void loadLibraryBooks()

    return () => {
      ignoresResult = true
    }
  }, [accessToken])

  useEffect(() => {
    if (selectedDate === undefined) {
      return
    }

    let ignoresResult = false
    const selectedLibraryDate = selectedDate

    async function loadLibraryStudents() {
      if (!accessToken) {
        setStudentSearchState({
          kind: 'failure',
          message: '로그인 후 도서관을 이용할 수 있습니다.',
        })
        return
      }

      if (studentSearchPage === 0) {
        setIsLoadingMoreStudents(false)
        setStudentSearchState({ kind: 'loading' })
      } else {
        setIsLoadingMoreStudents(true)
      }

      const result = await searchLibraryStudents({
        accessToken,
        date: selectedLibraryDate,
        keyword: normalizedSearchKeyword,
        page: studentSearchPage,
        size: STUDENT_SEARCH_PAGE_SIZE,
      })
      const recentStudents = getRecentLibraryStudents({ date: selectedLibraryDate, keyword: normalizedSearchKeyword })

      if (ignoresResult) {
        return
      }

      setIsLoadingMoreStudents(false)

      if (result.kind === 'success') {
        setStudentSearchState((currentState) => ({
          kind: 'success',
          students:
            studentSearchPage === 0 || currentState.kind !== 'success'
              ? mergeLibrarySearchStudents(result.students, recentStudents)
              : [...currentState.students, ...result.students],
          totalElements: Math.max(result.totalElements, mergeLibrarySearchStudents(result.students, recentStudents).length),
        }))
        return
      }

      if (recentStudents.length > 0) {
        setStudentSearchState({
          kind: 'success',
          students: recentStudents,
          totalElements: recentStudents.length,
        })
        return
      }

      setStudentSearchState({
        kind: 'failure',
        message: result.message,
      })
    }

    void loadLibraryStudents()

    return () => {
      ignoresResult = true
    }
  }, [accessToken, normalizedSearchKeyword, selectedDate, studentSearchPage])

  useEffect(() => {
    if (selectedDate === undefined) {
      return
    }

    if (activeStudentId === undefined) {
      return
    }

    let ignoresResult = false
    const studentId = activeStudentId

    async function loadActiveResume() {
      if (!accessToken) {
        setResumeLoadState({
          kind: 'failure',
          message: '로그인 후 도서관을 이용할 수 있습니다.',
        })
        return
      }

      setResumeLoadState({ kind: 'loading' })
      const result = await getLibraryResumeByStudentId({ accessToken, studentId })

      if (ignoresResult) {
        return
      }

      if (result.kind === 'success') {
        setResumeLoadState({
          kind: 'success',
          resume: result.resume,
        })
        return
      }

      const recentResume = getRecentLibraryResume(studentId)

      if (recentResume) {
        setResumeLoadState({
          kind: 'success',
          resume: recentResume,
        })
        return
      }

      setResumeLoadState({
        kind: 'failure',
        message: result.message,
      })
    }

    void loadActiveResume()

    return () => {
      ignoresResult = true
    }
  }, [accessToken, activeStudentId, normalizedSearchKeyword, selectedDate])

  return (
    <main className={styles.page}>
      <AppHeader activeItem="library" items={navigationItems} showLogout={Boolean(accessToken)} />
      {showsLoadError ? (
        <div className={styles.toastLayer}>
          <Toast variant="error">포트폴리오 문서를 불러오는데 실패하였습니다. 잠시 후 다시 시도해 주세요.</Toast>
        </div>
      ) : null}
      <section className={styles.content} aria-labelledby="library-title">
        {selectedDate === undefined ? (
          <div className={styles.hero}>
            <h1 className={styles.title} id="library-title">
              도서관
            </h1>
            <p className={styles.description}>다양한 학생들의 포트폴리오를 둘러보세요.</p>
          </div>
        ) : (
          <h1 className={styles.visuallyHidden} id="library-title">
            {selectedDate}학년도 도서관
          </h1>
        )}
        {selectedDate === undefined ? (
          <div className={styles.books} aria-label="포트폴리오 책 목록">
            {loadState.kind === 'loading' ? <p className={styles.emptyMessage}>도서관을 불러오는 중입니다.</p> : null}
            {loadState.kind === 'failure' ? (
              <p className={styles.emptyMessage} role="alert">
                {loadState.message}
              </p>
            ) : null}
            {loadState.kind === 'success' && libraryBooks.length > 0 ? (
              libraryBooks.map((book) => <LibraryBookCard key={book.ariaLabel} {...book} />)
            ) : null}
            {loadState.kind === 'success' && libraryBooks.length === 0 ? (
              <p className={styles.emptyMessage}>공개된 포트폴리오 책이 없습니다.</p>
            ) : null}
          </div>
        ) : (
          <section className={styles.resumeLibrary} aria-label={`${selectedDate}학년도 학생 이력서 목록`}>
            <div className={styles.viewerToolbar}>
              <Link className={styles.filterButton} href="/library" aria-label="전체 학년도 보기">
                <span aria-hidden="true" />
              </Link>
              <SearchField
                aria-label="학생 이름 검색"
                className={styles.searchField}
                placeholder="이름으로 학생을 찾아보세요."
                spellCheck={false}
                value={searchKeyword}
                onChange={(event) => {
                  setSearchKeyword(event.target.value)
                  setVisiblePageIndex(0)
                }}
              />
              <Button className={styles.downloadButton} disabled variant="filled">
                전체 PDF 다운로드
              </Button>
            </div>
            <div className={styles.resumeViewer} aria-live="polite">
              {studentSearchState.kind === 'loading' ? (
                <p className={styles.emptyMessage}>학생 이력서를 불러오는 중입니다.</p>
              ) : null}
              {studentSearchState.kind === 'failure' ? (
                <p className={styles.emptyMessage} role="alert">
                  {studentSearchState.message}
                </p>
              ) : null}
              {studentSearchState.kind === 'success' && studentSearchState.students.length === 0 ? (
                <p className={styles.emptyMessage}>
                  {normalizedSearchKeyword ? '검색어와 일치하는 학생이 없습니다.' : '공개된 학생 이력서가 없습니다.'}
                </p>
              ) : null}
              {studentSearchState.kind === 'success' && studentSearchState.students.length > 0 && resumeLoadState.kind === 'loading' ? (
                <p className={styles.emptyMessage}>공개 이력서를 불러오는 중입니다.</p>
              ) : null}
              {studentSearchState.kind === 'success' && studentSearchState.students.length > 0 && resumeLoadState.kind === 'failure' ? (
                <p className={styles.emptyMessage} role="alert">
                  {resumeLoadState.message}
                </p>
              ) : null}
              {studentSearchState.kind === 'success' && studentSearchState.students.length > 0 && resumeLoadState.kind === 'success' && sortedResumePages.length === 0 ? (
                <p className={styles.emptyMessage}>공개된 포트폴리오 문서가 없습니다.</p>
              ) : null}
              {studentSearchState.kind === 'success' && studentSearchState.students.length > 0 && resumeLoadState.kind === 'success' && sortedResumePages.length > 0 ? (
                <>
                  <button
                    aria-label="이전 페이지"
                    className={`${styles.pageArrow} ${styles.previousArrow}`}
                    disabled={visiblePageIndex === 0}
                    type="button"
                    onClick={() => setVisiblePageIndex((currentIndex) => Math.max(0, currentIndex - 2))}
                  >
                    ‹
                  </button>
                  <div className={styles.sheets}>
                    {visibleResumePages.map((page) => (
                      <ResumeBookSheet
                        ariaLabel={`${resumeLoadState.resume.name} 이력서 ${page.index + 1}쪽`}
                        className={styles.documentSheet}
                        content={toSheetContent(resumeLoadState.resume, page)}
                        key={page.id}
                      />
                    ))}
                  </div>
                  <button
                    aria-label="다음 페이지"
                    className={`${styles.pageArrow} ${styles.nextArrow}`}
                    disabled={visiblePageIndex + 2 >= sortedResumePages.length}
                    type="button"
                    onClick={() =>
                      setVisiblePageIndex((currentIndex) =>
                        Math.min(Math.max(0, sortedResumePages.length - 1), currentIndex + 2),
                      )
                    }
                  >
                    ›
                  </button>
                  <p className={styles.pageIndicator}>
                    {displayedPageNumber} / {sortedResumePages.length}
                  </p>
                </>
              ) : null}
            </div>
            {canLoadMoreStudents ? (
              <button
                className={styles.loadMoreButton}
                disabled={isLoadingMoreStudents}
                type="button"
                onClick={() =>
                  setStudentSearchCursor({
                    key: studentSearchKey,
                    page: studentSearchPage + 1,
                  })
                }
              >
                {isLoadingMoreStudents ? '불러오는 중' : '더 보기'}
              </button>
            ) : null}
          </section>
        )}
      </section>
    </main>
  )
}
