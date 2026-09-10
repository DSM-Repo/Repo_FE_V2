'use client'

import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'

import { AUTH_ACCESS_TOKEN_STORAGE_KEY } from '@/features/auth/api'
import { getResumeById, updateResumeVisibility, type Resume, type ResumeDetailResult, type ResumeVisibilityResult } from '@/features/resume/api'
import type { AppHeaderItem, ResumeBookSheetContent } from '@/shared/ui'
import { AppHeader, Button, Input, ResumeBookSheet } from '@/shared/ui'

import styles from './page.module.css'

const navigationItems = [
  { href: '/home', label: '홈', value: 'home' },
  { href: '/resume', label: '이력서 관리', value: 'resume' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

type LoadState =
  | {
      readonly kind: 'idle'
    }
  | {
      readonly kind: 'loading'
    }
  | {
      readonly kind: 'success'
      readonly resume: Resume
    }
  | {
      readonly kind: 'failure'
      readonly message: string
    }

type VisibilitySubmitState = 'idle' | 'pending'

function toResumeBookSheetContent(resume: Resume): ResumeBookSheetContent {
  const firstPage = resume.pages.find((page) => page.index === 0) ?? resume.pages[0]

  return {
    activities: [],
    contests: [],
    headline: resume.submissionStatus,
    introduce: resume.introduce,
    majorName: resume.majorName,
    name: resume.name,
    pageContent: firstPage?.content,
    portfolioUrl: resume.portfolioUrl,
    projects: [],
    skills: [],
  }
}

function toFailureMessage(result: Exclude<ResumeDetailResult, { readonly kind: 'success' }>) {
  return result.message
}

function toVisibilityFailureMessage(result: Exclude<ResumeVisibilityResult, { readonly kind: 'success' }>) {
  return result.message
}

export function StudentResumePageContent() {
  const searchParams = useSearchParams()
  const [resumeId, setResumeId] = useState(searchParams.get('resumeId') ?? '')
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'idle' })
  const [visibilitySubmitState, setVisibilitySubmitState] = useState<VisibilitySubmitState>('idle')
  const [visibilityFeedback, setVisibilityFeedback] = useState<string>()

  const loadResume = async (nextResumeId: string) => {
    const trimmedResumeId = nextResumeId.trim()

    if (!trimmedResumeId) {
      setLoadState({ kind: 'failure', message: '조회할 이력서 ID를 입력해주세요.' })
      return
    }

    const accessToken = window.localStorage.getItem(AUTH_ACCESS_TOKEN_STORAGE_KEY)

    if (!accessToken) {
      setLoadState({ kind: 'failure', message: '로그인 후 이력서를 조회할 수 있습니다.' })
      return
    }

    setLoadState({ kind: 'loading' })
    setVisibilityFeedback(undefined)
    const result = await getResumeById({
      accessToken,
      resumeId: trimmedResumeId,
    })

    if (result.kind === 'success') {
      setLoadState({ kind: 'success', resume: result.resume })
      return
    }

    setLoadState({ kind: 'failure', message: toFailureMessage(result) })
  }

  const changeVisibility = async () => {
    if (loadState.kind !== 'success' || visibilitySubmitState === 'pending') {
      return
    }

    const accessToken = window.localStorage.getItem(AUTH_ACCESS_TOKEN_STORAGE_KEY)

    if (!accessToken) {
      setVisibilityFeedback('로그인 후 공개 여부를 변경할 수 있습니다.')
      return
    }

    const nextIsPublic = !loadState.resume.isPublic

    setVisibilitySubmitState('pending')
    setVisibilityFeedback(undefined)

    const result = await updateResumeVisibility({
      accessToken,
      isPublic: nextIsPublic,
    })

    setVisibilitySubmitState('idle')

    if (result.kind !== 'success') {
      setVisibilityFeedback(toVisibilityFailureMessage(result))
      return
    }

    setLoadState({
      kind: 'success',
      resume: {
        ...loadState.resume,
        isPublic: result.isPublic,
      },
    })
    setVisibilityFeedback(result.isPublic ? '이력서를 공개로 변경했습니다.' : '이력서를 비공개로 변경했습니다.')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void loadResume(resumeId)
  }

  const sheetContent = loadState.kind === 'success' ? toResumeBookSheetContent(loadState.resume) : undefined

  return (
    <main className={styles.page}>
      <AppHeader activeItem="resume" items={navigationItems} />

      <section className={styles.workspace} aria-labelledby="student-resume-title">
        <div className={styles.sidebar}>
          <h1 id="student-resume-title">내 이력서 조회</h1>
          <form className={styles.lookupForm} onSubmit={handleSubmit}>
            <label className={styles.label} htmlFor="resume-id">
              이력서 ID
            </label>
            <Input
              id="resume-id"
              name="resumeId"
              onChange={(event) => setResumeId(event.target.value)}
              placeholder="66c73ec4c92f1d2d087e9012"
              required
              value={resumeId}
            />
            <Button disabled={loadState.kind === 'loading'} type="submit">
              {loadState.kind === 'loading' ? '조회 중' : '조회하기'}
            </Button>
          </form>

          {loadState.kind === 'failure' ? (
            <p className={styles.feedback} role="alert">
              {loadState.message}
            </p>
          ) : null}

          {loadState.kind === 'success' ? (
            <dl className={styles.summary} aria-label="조회된 이력서 정보">
              <div>
                <dt>공개 상태</dt>
                <dd>{loadState.resume.isPublic ? '공개' : '비공개'}</dd>
              </div>
              <div>
                <dt>저장 시각</dt>
                <dd>{loadState.resume.savedAt}</dd>
              </div>
            </dl>
          ) : null}

          {loadState.kind === 'success' ? (
            <div className={styles.visibilityActions}>
              <Button disabled={visibilitySubmitState === 'pending'} onClick={changeVisibility} type="button">
                {visibilitySubmitState === 'pending'
                  ? '변경 중'
                  : loadState.resume.isPublic
                    ? '비공개로 변경'
                    : '공개로 변경'}
              </Button>
              {visibilityFeedback ? <p className={styles.visibilityFeedback}>{visibilityFeedback}</p> : null}
            </div>
          ) : null}
        </div>

        <div className={styles.viewer} aria-live="polite">
          {sheetContent ? (
            <ResumeBookSheet ariaLabel={`${sheetContent.name} 내 이력서`} content={sheetContent} />
          ) : (
            <div className={styles.emptyState}>조회된 이력서가 없습니다.</div>
          )}
        </div>
      </section>
    </main>
  )
}
