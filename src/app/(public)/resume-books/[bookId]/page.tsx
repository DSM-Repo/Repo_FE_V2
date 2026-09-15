'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import { getSavedAccessToken } from '@/features/auth/api'
import {
  getLibraryResumeByStudentId,
  type LibraryResume,
  type LibraryResumePage,
} from '@/features/library/api'
import type { AppHeaderItem, ResumeBookSheetContent } from '@/shared/ui'
import { AppHeader, ResumeBookSheet } from '@/shared/ui'

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
    portfolioUrl: resume.portfolioUrl,
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
          message: '로그인 후 도서관을 이용할 수 있습니다.',
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
              <header className={styles.resumeHeader}>
                <Link className={styles.backLink} href={`/library?date=${pageState.resume.date}`}>
                  {pageState.resume.date}학년도 목록
                </Link>
                <h1 className={styles.resumeTitle} id="resume-book-title">
                  {pageState.resume.name} 이력서
                </h1>
                <p className={styles.resumeMeta}>
                  {[pageState.resume.studentNumber, pageState.resume.majorName, pageState.resume.email]
                    .filter(Boolean)
                    .join(' | ')}
                </p>
              </header>
              {sortedPages.length > 0 ? (
                <>
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
                    <strong>{sortedPages.length}</strong>쪽 공개됨
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
