'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import { getSavedAccessToken } from '@/features/auth/api'
import {
  getLibraryResumeByStudentId,
  getRecentLibraryResume,
  type LibraryResume,
  type LibraryResumePage,
} from '@/features/library/api'
import type { AppHeaderItem, ResumeBookSheetContent } from '@/shared/ui'
import { AppHeader, Button, ResumeBookSheet, SearchField } from '@/shared/ui'

import styles from './page.module.css'

const navigationItems = [
  { href: '/home', label: '홈', value: 'home' },
  { href: '/resume', label: '이력서 관리', value: 'resume' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

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

function subscribeToSavedAccessToken(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)

  return () => window.removeEventListener('storage', onStoreChange)
}

function getSavedAccessTokenSnapshot(): string | undefined {
  return getSavedAccessToken()
}

function getServerAccessTokenSnapshot(): string | undefined {
  return undefined
}

function parseStudentId(value: string): number | undefined {
  const studentId = Number(value)

  if (!Number.isSafeInteger(studentId) || studentId <= 0) {
    return undefined
  }

  return studentId
}

function toHeadline(resume: LibraryResume) {
  return `${resume.date}학년도 ${resume.cohort}기 ${resume.year}학년`
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

export default function ResumeBookPage() {
  const params = useParams<{ readonly bookId: string }>()
  const accessToken = useSyncExternalStore(
    subscribeToSavedAccessToken,
    getSavedAccessTokenSnapshot,
    getServerAccessTokenSnapshot,
  )
  const studentId = parseStudentId(params.bookId)
  const [loadState, setLoadState] = useState<ResumeLoadState>({ kind: 'loading' })
  const pageState: ResumeLoadState = useMemo(
    () =>
      studentId === undefined
        ? {
            kind: 'failure',
            message: '학생 ID 형식이 올바르지 않습니다.',
          }
        : loadState,
    [loadState, studentId],
  )
  const sortedPages = useMemo(
    () => (pageState.kind === 'success' ? sortResumePages(pageState.resume.pages) : []),
    [pageState],
  )

  useEffect(() => {
    if (studentId === undefined) {
      return
    }

    let ignoresResult = false
    const validStudentId = studentId

    async function loadResume() {
      if (!accessToken) {
        setLoadState({
          kind: 'failure',
          message: '공개된 포트폴리오 문서가 없습니다.',
        })
        return
      }

      setLoadState({ kind: 'loading' })
      const result = await getLibraryResumeByStudentId({ accessToken, studentId: validStudentId })

      if (ignoresResult) {
        return
      }

      if (result.kind === 'success') {
        setLoadState({
          kind: 'success',
          resume: result.resume,
        })
        return
      }

      const recentResume = getRecentLibraryResume(validStudentId)

      if (recentResume) {
        setLoadState({
          kind: 'success',
          resume: recentResume,
        })
        return
      }

      setLoadState({
        kind: 'failure',
        message: result.message,
      })
    }

    void loadResume()

    return () => {
      ignoresResult = true
    }
  }, [accessToken, studentId])

  return (
    <main className={styles.page}>
      <AppHeader activeItem="library" items={navigationItems} />
      <section className={styles.workspace} aria-label="레주메북 포트폴리오 열람">
        <div className={styles.contentLayer}>
          {pageState.kind === 'loading' ? (
            <section className={styles.emptyState} aria-live="polite">
              <p className={styles.emptyMessage}>공개 이력서를 불러오는 중입니다.</p>
            </section>
          ) : null}
          {pageState.kind === 'failure' ? (
            <section className={styles.emptyState} aria-live="polite">
              <p className={styles.emptyMessage}>{pageState.message}</p>
              <Link className={styles.returnButton} href="/library">
                도서관 돌아가기
              </Link>
            </section>
          ) : null}
          {pageState.kind === 'success' ? (
            <section className={styles.viewer} aria-labelledby="resume-book-title">
              <h1 className={styles.visuallyHidden} id="resume-book-title">
                {pageState.resume.name} 이력서
              </h1>
              {sortedPages.length > 0 ? (
                <>
                  <div className={styles.toolbar}>
                    <Link className={styles.filterButton} href={`/library?date=${pageState.resume.date}`} aria-label="목록으로 돌아가기">
                      ←
                    </Link>
                    <SearchField className={styles.searchField} placeholder="이름으로 학생을 찾아보세요." readOnly />
                    <Button className={styles.downloadButton} variant="bordered-dark">
                      전체 PDF 다운로드
                    </Button>
                  </div>
                  <div className={styles.sheets}>
                    {sortedPages.map((page) => (
                      <ResumeBookSheet
                        ariaLabel={`${pageState.resume.name} 이력서 ${page.index + 1}쪽`}
                        content={toSheetContent(pageState.resume, page)}
                        key={page.id}
                      />
                    ))}
                  </div>
                  <p className={styles.pageIndicator}>
                    <strong>1</strong> / {sortedPages.length}
                  </p>
                </>
              ) : (
                <section className={styles.emptyState} aria-live="polite">
                  <p className={styles.emptyMessage}>공개된 포트폴리오 문서가 없습니다.</p>
                </section>
              )}
            </section>
          ) : null}
        </div>
      </section>
    </main>
  )
}
