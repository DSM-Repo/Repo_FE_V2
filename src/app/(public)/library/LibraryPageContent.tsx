'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { getSavedAccessToken, getSavedAuthRole, type AuthLoginRole } from '@/features/auth/api'
import { getLibraryBooks, searchLibraryStudents, type LibraryBookGroup, type LibrarySearchStudent } from '@/features/library/api'
import type { InternalHref } from '@/shared/lib/internalHref'
import type { AppHeaderItem, LibraryBookCardProps } from '@/shared/ui'
import { AppHeader, LibraryBookCard, LinkRow, SearchField, Toast } from '@/shared/ui'

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
  const [isLoadingMoreStudents, setIsLoadingMoreStudents] = useState(false)
  const selectedDate = parseSelectedDate(searchParams.get('date'))
  const navigationItems = role === 'teacher' ? teacherNavigationItems : studentNavigationItems
  const libraryBooks = loadState.kind === 'success' ? loadState.books.map(toLibraryBookCard) : []
  const normalizedSearchKeyword = searchKeyword.trim()
  const studentSearchKey = selectedDate === undefined ? '' : `${selectedDate}:${normalizedSearchKeyword}`
  const studentSearchPage = studentSearchCursor.key === studentSearchKey ? studentSearchCursor.page : 0
  const canLoadMoreStudents =
    studentSearchState.kind === 'success' && studentSearchState.students.length < studentSearchState.totalElements

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

      if (ignoresResult) {
        return
      }

      if (result.kind === 'success') {
        setLoadState({
          books: result.books,
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
        date: selectedDate,
        keyword: normalizedSearchKeyword,
        page: studentSearchPage,
        size: STUDENT_SEARCH_PAGE_SIZE,
      })

      if (ignoresResult) {
        return
      }

      setIsLoadingMoreStudents(false)

      if (result.kind === 'success') {
        setStudentSearchState((currentState) => ({
          kind: 'success',
          students:
            studentSearchPage === 0 || currentState.kind !== 'success'
              ? result.students
              : [...currentState.students, ...result.students],
          totalElements: result.totalElements,
        }))
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

  return (
    <main className={styles.page}>
      <AppHeader activeItem="library" items={navigationItems} />
      {showsLoadError ? (
        <div className={styles.toastLayer}>
          <Toast variant="error">포트폴리오 문서를 불러오는데 실패하였습니다. 잠시 후 다시 시도해 주세요.</Toast>
        </div>
      ) : null}
      <section className={styles.content} aria-labelledby="library-title">
        <div className={styles.hero}>
          <h1 className={styles.title} id="library-title">
            도서관
          </h1>
          <p className={styles.description}>
            {selectedDate === undefined
              ? '다양한 학생들의 포트폴리오를 둘러보세요.'
              : `${selectedDate}학년도 공개 이력서를 둘러보세요.`}
          </p>
        </div>
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
          <section className={styles.studentSearch} aria-label={`${selectedDate}학년도 학생 이력서 목록`}>
            <div className={styles.studentSearchHeader}>
              <Link className={styles.backLink} href="/library">
                전체 학년도 보기
              </Link>
              <SearchField
                aria-label="학생 이름 검색"
                className={styles.searchField}
                placeholder="이름으로 학생을 찾아보세요."
                spellCheck={false}
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
              />
            </div>
            <div className={styles.studentRows} aria-live="polite">
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
              {studentSearchState.kind === 'success'
                ? studentSearchState.students.map((student) => (
                    <LinkRow
                      actionLabel="이력서 보기"
                      href={`/resume-books/${student.studentId}`}
                      key={student.studentId}
                      status={student.major}
                      surface="muted"
                      title={student.studentName}
                    />
                  ))
                : null}
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
            </div>
          </section>
        )}
      </section>
    </main>
  )
}
