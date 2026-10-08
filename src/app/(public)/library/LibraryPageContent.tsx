'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
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
import { AppHeader, Button, CheckboxOption, LibraryBookCard, ResumeBookSheet, SearchField, Tag, Toast } from '@/shared/ui'

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

const LIBRARY_STUDENT_FETCH_SIZE = 100
const fallbackClassFilters = [1, 2, 3, 4] as const

type LibraryPageContentProps = {
  readonly showsLoadError: boolean
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
      readonly resumes: readonly LibraryResume[]
    }

type LibrarySheetPage = {
  readonly key: string
  readonly page: LibraryResumePage
  readonly resume: LibraryResume
}

type LibraryFilters = {
  readonly classes: readonly number[]
  readonly majors: readonly string[]
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
    pageType: page.type,
    portfolioUrl: resume.portfolioUrl,
    profileImageUrl: resume.profileImageUrl,
    project: page.project,
    projects: [],
    skills: [],
  }
}

function sortResumePages(pages: readonly LibraryResumePage[]) {
  return [...pages].sort((leftPage, rightPage) => leftPage.index - rightPage.index)
}

function getComparableStudentNumber(value: string | undefined) {
  const digits = value?.match(/\d+/g)?.join('')

  return digits ? Number(digits) : Number.POSITIVE_INFINITY
}

function sortLibraryResumes(resumes: readonly LibraryResume[], students: readonly LibrarySearchStudent[]) {
  const studentNumberById = new Map(students.map((student) => [student.studentId, student.studentNumber]))

  return [...resumes].sort((leftResume, rightResume) => {
    const leftStudentNumber = studentNumberById.get(leftResume.studentId) ?? leftResume.studentNumber
    const rightStudentNumber = studentNumberById.get(rightResume.studentId) ?? rightResume.studentNumber
    const leftComparableStudentNumber = getComparableStudentNumber(leftStudentNumber)
    const rightComparableStudentNumber = getComparableStudentNumber(rightStudentNumber)
    const hasLeftComparableStudentNumber = Number.isFinite(leftComparableStudentNumber)
    const hasRightComparableStudentNumber = Number.isFinite(rightComparableStudentNumber)

    if (hasLeftComparableStudentNumber !== hasRightComparableStudentNumber) {
      return hasLeftComparableStudentNumber ? -1 : 1
    }

    const hasComparableStudentNumbers =
      hasLeftComparableStudentNumber && hasRightComparableStudentNumber
    const studentNumberOrder = hasComparableStudentNumbers ? leftComparableStudentNumber - rightComparableStudentNumber : 0

    if (studentNumberOrder !== 0) {
      return studentNumberOrder
    }

    const textStudentNumberOrder = leftStudentNumber.localeCompare(rightStudentNumber, 'ko-KR', {
      numeric: true,
      sensitivity: 'base',
    })

    if (textStudentNumberOrder !== 0) {
      return textStudentNumberOrder
    }

    return rightResume.name.localeCompare(leftResume.name, 'ko-KR') || leftResume.studentId - rightResume.studentId
  })
}

function getStudentClassNumber(studentNumber: string | undefined) {
  const digits = studentNumber?.match(/\d/g)?.join('')

  if (!digits || digits.length < 2) {
    return undefined
  }

  const classNumber = Number(digits[1])

  return Number.isSafeInteger(classNumber) && classNumber > 0 ? classNumber : undefined
}

function getUniqueSortedMajors(students: readonly LibrarySearchStudent[]) {
  return [...new Set(students.map((student) => student.major.trim()).filter(Boolean))].sort((leftMajor, rightMajor) =>
    leftMajor.localeCompare(rightMajor, 'ko-KR', { numeric: true, sensitivity: 'base' }),
  )
}

function getUniqueSortedClasses(students: readonly LibrarySearchStudent[]) {
  const classNumbers = students.map((student) => getStudentClassNumber(student.studentNumber)).filter((classNumber) => classNumber !== undefined)
  const uniqueClassNumbers = classNumbers.length > 0 ? [...new Set(classNumbers)] : [...fallbackClassFilters]

  return uniqueClassNumbers.sort((leftClass, rightClass) => leftClass - rightClass)
}

function toggleStringFilter(values: readonly string[], value: string) {
  return values.includes(value) ? values.filter((currentValue) => currentValue !== value) : [...values, value]
}

function toggleNumberFilter(values: readonly number[], value: number) {
  return values.includes(value) ? values.filter((currentValue) => currentValue !== value) : [...values, value]
}

function hasActiveFilters(filters: LibraryFilters) {
  return filters.majors.length > 0 || filters.classes.length > 0
}

function filterLibraryStudents(students: readonly LibrarySearchStudent[], filters: LibraryFilters) {
  if (!hasActiveFilters(filters)) {
    return students
  }

  return students.filter((student) => {
    const classNumber = getStudentClassNumber(student.studentNumber)
    const matchesMajor = filters.majors.length === 0 || filters.majors.includes(student.major)
    const matchesClass = filters.classes.length === 0 || (classNumber !== undefined && filters.classes.includes(classNumber))

    return matchesMajor && matchesClass
  })
}

function toLibrarySheetPages(resumes: readonly LibraryResume[], students: readonly LibrarySearchStudent[]): readonly LibrarySheetPage[] {
  const studentIds = new Set(students.map((student) => student.studentId))
  const filteredResumes = resumes.filter((resume) => studentIds.has(resume.studentId))

  return sortLibraryResumes(filteredResumes, students).flatMap((resume) =>
    sortResumePages(resume.pages).map((page) => ({
      key: `${resume.studentId}:${page.id}`,
      page,
      resume,
    })),
  )
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
  const [resumeLoadState, setResumeLoadState] = useState<ResumeLoadState>({ kind: 'loading' })
  const [visiblePageIndex, setVisiblePageIndex] = useState(0)
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<LibraryFilters>({ classes: [], majors: [] })
  const [draftFilters, setDraftFilters] = useState<LibraryFilters>({ classes: [], majors: [] })
  const selectedDate = parseSelectedDate(searchParams.get('date'))
  const navigationItems = role === 'teacher' ? teacherNavigationItems : studentNavigationItems
  const libraryBooks = loadState.kind === 'success' ? loadState.books.map(toLibraryBookCard) : []
  const normalizedSearchKeyword = searchKeyword.trim()
  const searchedStudents = useMemo(
    () => (studentSearchState.kind === 'success' ? studentSearchState.students : []),
    [studentSearchState],
  )
  const filteredStudents = useMemo(() => filterLibraryStudents(searchedStudents, activeFilters), [activeFilters, searchedStudents])
  const filterMajorOptions = useMemo(() => getUniqueSortedMajors(searchedStudents), [searchedStudents])
  const filterClassOptions = useMemo(() => getUniqueSortedClasses(searchedStudents), [searchedStudents])
  const activeFilterCount = activeFilters.majors.length + activeFilters.classes.length
  const librarySheetPages = useMemo(
    () => (resumeLoadState.kind === 'success' ? toLibrarySheetPages(resumeLoadState.resumes, filteredStudents) : []),
    [filteredStudents, resumeLoadState],
  )
  const visibleResumePages = librarySheetPages.slice(visiblePageIndex, visiblePageIndex + 2)
  const displayedPageNumber = Math.min(librarySheetPages.length, visiblePageIndex + visibleResumePages.length)

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
    if (!isFilterPanelOpen) {
      return undefined
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFilterPanelOpen(false)
      }
    }

    window.addEventListener('keydown', closeOnEscape)

    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isFilterPanelOpen])

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

      setStudentSearchState({ kind: 'loading' })

      const result = await searchLibraryStudents({
        accessToken,
        date: selectedLibraryDate,
        keyword: normalizedSearchKeyword,
        page: 0,
        size: LIBRARY_STUDENT_FETCH_SIZE,
      })
      const recentStudents = getRecentLibraryStudents({ date: selectedLibraryDate, keyword: normalizedSearchKeyword })

      if (ignoresResult) {
        return
      }

      if (result.kind === 'success') {
        let searchedStudents = result.students
        let loadedStudentCount = result.students.length
        let nextPage = 1

        while (loadedStudentCount < result.totalElements) {
          const nextResult = await searchLibraryStudents({
            accessToken,
            date: selectedLibraryDate,
            keyword: normalizedSearchKeyword,
            page: nextPage,
            size: LIBRARY_STUDENT_FETCH_SIZE,
          })

          if (ignoresResult || nextResult.kind !== 'success' || nextResult.students.length === 0) {
            break
          }

          searchedStudents = [...searchedStudents, ...nextResult.students]
          loadedStudentCount += nextResult.students.length
          nextPage += 1
        }

        if (ignoresResult) {
          return
        }

        const mergedStudents = mergeLibrarySearchStudents(searchedStudents, recentStudents)

        setStudentSearchState({
          kind: 'success',
          students: mergedStudents,
          totalElements: Math.max(result.totalElements, mergedStudents.length),
        })
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
  }, [accessToken, normalizedSearchKeyword, selectedDate])

  useEffect(() => {
    if (selectedDate === undefined) {
      return
    }

    if (studentSearchState.kind !== 'success') {
      return
    }

    if (searchedStudents.length === 0) {
      return
    }

    let ignoresResult = false
    const students = searchedStudents

    async function loadLibraryResumes() {
      if (!accessToken) {
        setResumeLoadState({
          kind: 'failure',
          message: '로그인 후 도서관을 이용할 수 있습니다.',
        })
        return
      }

      setResumeLoadState({ kind: 'loading' })
      const resumeResults = await Promise.all(
        students.map(async (student) => {
          const result = await getLibraryResumeByStudentId({ accessToken, studentId: student.studentId })

          if (result.kind === 'success') {
            return result.resume
          }

          return getRecentLibraryResume(student.studentId)
        }),
      )

      if (ignoresResult) {
        return
      }

      const resumes = resumeResults.filter((resume) => resume !== undefined)

      if (resumes.length > 0) {
        setResumeLoadState({
          kind: 'success',
          resumes,
        })
        return
      }

      setResumeLoadState({
        kind: 'failure',
        message: '공개된 이력서를 찾을 수 없습니다.',
      })
    }

    void loadLibraryResumes()

    return () => {
      ignoresResult = true
    }
  }, [accessToken, normalizedSearchKeyword, searchedStudents, selectedDate, studentSearchState.kind])

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
              <button
                className={styles.filterButton}
                type="button"
                aria-label="도서관 필터 열기"
                aria-pressed={isFilterPanelOpen}
                onClick={() => {
                  setDraftFilters(activeFilters)
                  setIsFilterPanelOpen(true)
                }}
              >
                <span aria-hidden="true" />
              </button>
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
            {hasActiveFilters(activeFilters) ? (
              <div className={styles.activeFilters} aria-label="적용된 필터">
                {activeFilters.classes.map((classNumber) => (
                  <Tag
                    key={`class-${classNumber}`}
                    removeLabel={`${classNumber}반 필터 삭제`}
                    onRemove={() => {
                      setActiveFilters((currentFilters) => ({
                        ...currentFilters,
                        classes: currentFilters.classes.filter((currentClass) => currentClass !== classNumber),
                      }))
                      setVisiblePageIndex(0)
                    }}
                  >
                    {classNumber}반
                  </Tag>
                ))}
                {activeFilters.majors.map((major) => (
                  <Tag
                    key={`major-${major}`}
                    removeLabel={`${major} 필터 삭제`}
                    onRemove={() => {
                      setActiveFilters((currentFilters) => ({
                        ...currentFilters,
                        majors: currentFilters.majors.filter((currentMajor) => currentMajor !== major),
                      }))
                      setVisiblePageIndex(0)
                    }}
                  >
                    {major}
                  </Tag>
                ))}
              </div>
            ) : null}
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
              {studentSearchState.kind === 'success' && studentSearchState.students.length > 0 && filteredStudents.length === 0 ? (
                <p className={styles.emptyMessage}>
                  {activeFilterCount > 0 ? '필터와 일치하는 학생이 없습니다.' : '공개된 학생 이력서가 없습니다.'}
                </p>
              ) : null}
              {studentSearchState.kind === 'success' && filteredStudents.length > 0 && resumeLoadState.kind === 'loading' ? (
                <p className={styles.emptyMessage}>공개 이력서를 불러오는 중입니다.</p>
              ) : null}
              {studentSearchState.kind === 'success' && filteredStudents.length > 0 && resumeLoadState.kind === 'failure' ? (
                <p className={styles.emptyMessage} role="alert">
                  {resumeLoadState.message}
                </p>
              ) : null}
              {studentSearchState.kind === 'success' && filteredStudents.length > 0 && resumeLoadState.kind === 'success' && librarySheetPages.length === 0 ? (
                <p className={styles.emptyMessage}>공개된 포트폴리오 문서가 없습니다.</p>
              ) : null}
              {studentSearchState.kind === 'success' && filteredStudents.length > 0 && resumeLoadState.kind === 'success' && librarySheetPages.length > 0 ? (
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
                    {visibleResumePages.map(({ key, page, resume }) => (
                      <ResumeBookSheet
                        ariaLabel={`${resume.name} 이력서 ${page.index + 1}쪽`}
                        className={styles.documentSheet}
                        content={toSheetContent(resume, page)}
                        key={key}
                      />
                    ))}
                  </div>
                  <button
                    aria-label="다음 페이지"
                    className={`${styles.pageArrow} ${styles.nextArrow}`}
                    disabled={visiblePageIndex + 2 >= librarySheetPages.length}
                    type="button"
                    onClick={() =>
                      setVisiblePageIndex((currentIndex) =>
                        Math.min(Math.max(0, librarySheetPages.length - 1), currentIndex + 2),
                      )
                    }
                  >
                    ›
                  </button>
                  <p className={styles.pageIndicator}>
                    {displayedPageNumber} / {librarySheetPages.length}
                  </p>
                </>
              ) : null}
            </div>
            {isFilterPanelOpen ? (
              <div className={styles.filterLayer} role="presentation">
                <button
                  className={styles.filterScrim}
                  type="button"
                  aria-label="필터 닫기"
                  onClick={() => setIsFilterPanelOpen(false)}
                />
                <aside className={styles.filterPanel} aria-label="도서관 필터">
                  <header className={styles.filterPanelHeader}>
                    <h2>필터링</h2>
                    <button className={styles.filterCloseButton} type="button" aria-label="필터 닫기" onClick={() => setIsFilterPanelOpen(false)}>
                      ×
                    </button>
                  </header>
                  <div className={styles.filterPanelBody}>
                    <section className={styles.filterGroup}>
                      <h3>전공</h3>
                      <div className={styles.filterOptions}>
                        {filterMajorOptions.length > 0 ? (
                          filterMajorOptions.map((major) => (
                            <CheckboxOption
                              checked={draftFilters.majors.includes(major)}
                              key={major}
                              onCheckedChange={() =>
                                setDraftFilters((currentFilters) => ({
                                  ...currentFilters,
                                  majors: toggleStringFilter(currentFilters.majors, major),
                                }))
                              }
                            >
                              {major}
                            </CheckboxOption>
                          ))
                        ) : (
                          <p className={styles.filterEmptyMessage}>선택할 전공이 없습니다.</p>
                        )}
                      </div>
                    </section>
                    <section className={styles.filterGroup}>
                      <h3>반</h3>
                      <div className={styles.filterOptions}>
                        {filterClassOptions.map((classNumber) => (
                          <CheckboxOption
                            checked={draftFilters.classes.includes(classNumber)}
                            key={classNumber}
                            onCheckedChange={() =>
                              setDraftFilters((currentFilters) => ({
                                ...currentFilters,
                                classes: toggleNumberFilter(currentFilters.classes, classNumber),
                              }))
                            }
                          >
                            {classNumber}반
                          </CheckboxOption>
                        ))}
                      </div>
                    </section>
                  </div>
                  <footer className={styles.filterActions}>
                    <button
                      className={styles.filterResetButton}
                      type="button"
                      onClick={() => setDraftFilters({ classes: [], majors: [] })}
                    >
                      초기화
                    </button>
                    <button
                      className={styles.filterApplyButton}
                      type="button"
                      onClick={() => {
                        setActiveFilters(draftFilters)
                        setVisiblePageIndex(0)
                        setIsFilterPanelOpen(false)
                      }}
                    >
                      적용하기
                    </button>
                  </footer>
                </aside>
              </div>
            ) : null}
          </section>
        )}
      </section>
    </main>
  )
}
