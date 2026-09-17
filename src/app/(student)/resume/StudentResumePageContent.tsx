'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { AUTH_ACCESS_TOKEN_STORAGE_KEY } from '@/features/auth/api'
import {
  autoSaveResume,
  cancelResumeSubmission,
  getResumeById,
  saveResume,
  submitResume,
  updateResumeVisibility,
  type Resume,
  type ResumeDetailResult,
  type ResumePage,
  type ResumeSubmissionResult,
  type ResumeVisibilityResult,
} from '@/features/resume/api'
import type { AppHeaderItem, ResumeBookSheetContent } from '@/shared/ui'
import { AppHeader, Icon, ResumeBookSheet } from '@/shared/ui'

import { ResumeEditorSheet, type ResumeDraft } from './ResumeEditorSheet'
import styles from './page.module.css'

const navigationItems = [
  { href: '/home', label: '홈', value: 'home' },
  { href: '/resume', label: '이력서 관리', value: 'resume' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

const defaultResumeDraft = {
  activities: [],
  contests: [],
  email: '',
  headline: '전공미정',
  introTitle: '',
  introduce: '',
  majorName: '2415 인공지능소프트웨어과',
  name: '홍길동',
  pageContents: ['', ''],
  portfolioUrl: '',
  projects: [],
  skills: [],
} satisfies ResumeDraft

const feedbackItems = [
  {
    detail: '피드백에 대한 상세 내용',
    id: 'feedback-1',
    isOpen: false,
    title: '피드백 제목',
  },
  {
    detail: '피드백에 대한 상세 내용',
    id: 'feedback-2',
    isOpen: true,
    title: '피드백 제목',
  },
  {
    detail: '피드백에 대한 상세 내용',
    id: 'feedback-3',
    isOpen: false,
    title: '피드백 제목',
  },
  {
    detail: '피드백에 대한 상세 내용',
    id: 'feedback-4',
    isOpen: false,
    title: '피드백 제목',
  },
  {
    detail: '피드백에 대한 상세 내용',
    id: 'feedback-5',
    isOpen: false,
    title: '피드백 제목',
  },
  {
    detail: '피드백에 대한 상세 내용',
    id: 'feedback-6',
    isOpen: false,
    title: '피드백 제목',
  },
  {
    detail: '피드백에 대한 상세 내용',
    id: 'feedback-7',
    isOpen: false,
    title: '피드백 제목',
  },
  {
    detail: '피드백에 대한 상세 내용',
    id: 'feedback-8',
    isOpen: false,
    title: '피드백 제목',
  },
] as const

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

type ViewMode = 'view' | 'edit' | 'feedback'
type VisibilitySubmitState = 'idle' | 'pending'
type SubmissionSubmitState = 'idle' | 'submit' | 'cancel'
type SaveSubmitState = 'auto-save' | 'idle' | 'save'
type ActionFeedback = {
  readonly message: string
  readonly tone: 'error' | 'neutral'
}

function toInitialViewMode(mode: string | null, resumeId: string): ViewMode {
  if (mode === 'edit') {
    return 'edit'
  }

  if (mode === 'feedback') {
    return 'feedback'
  }

  if (!resumeId.trim()) {
    return 'edit'
  }

  return 'view'
}

function toResumeBookSheetContent(resume: Resume, pageIndex: number): ResumeBookSheetContent {
  const page = resume.pages.find((resumePage) => resumePage.index === pageIndex) ?? resume.pages[pageIndex] ?? resume.pages[0]

  return {
    activities: [],
    contests: [],
    headline: resume.submissionStatus,
    introduce: resume.introduce,
    majorName: resume.majorName,
    name: resume.name,
    pageContent: page?.content,
    portfolioUrl: resume.portfolioUrl,
    projects: [],
    skills: [],
  }
}

function toDraftSheetContent(draft: ResumeDraft, pageIndex: 0 | 1): ResumeBookSheetContent {
  return {
    activities: draft.activities,
    contests: draft.contests,
    email: draft.email,
    headline: draft.headline,
    introTitle: draft.introTitle,
    introduce: draft.introduce,
    majorName: draft.majorName,
    name: draft.name,
    pageContent: draft.pageContents[pageIndex],
    portfolioUrl: draft.portfolioUrl,
    projects: draft.projects,
    skills: draft.skills,
  }
}

function toResumeDraft(resume: Resume): ResumeDraft {
  const firstPage = resume.pages.find((resumePage) => resumePage.index === 0) ?? resume.pages[0]
  const secondPage = resume.pages.find((resumePage) => resumePage.index === 1) ?? resume.pages[1]

  return {
    ...defaultResumeDraft,
    headline: resume.submissionStatus,
    introduce: resume.introduce,
    majorName: resume.majorName,
    name: resume.name,
    pageContents: [firstPage?.content ?? '', secondPage?.content ?? ''],
    portfolioUrl: resume.portfolioUrl,
  }
}

function toSheetSpreadContent(resume: Resume | undefined, draft: ResumeDraft): readonly [ResumeBookSheetContent, ResumeBookSheetContent] {
  if (!resume) {
    return [toDraftSheetContent(draft, 0), toDraftSheetContent(draft, 1)]
  }

  return [toResumeBookSheetContent(resume, 0), toResumeBookSheetContent(resume, 1)]
}

function toResumePages(draft: ResumeDraft, resume?: Resume): readonly ResumePage[] {
  return draft.pageContents.map((content, index) => {
    const existingPage = resume?.pages.find((resumePage) => resumePage.index === index) ?? resume?.pages[index]

    return {
      content,
      id: existingPage?.id ?? `page-${index + 1}`,
      index,
    }
  })
}

function toSavedDraftResume(input: {
  readonly draft: ResumeDraft
  readonly pages: readonly ResumePage[]
  readonly resumeId: string
  readonly savedAt: string
}): Resume {
  return {
    id: input.resumeId,
    introduce: input.draft.introduce,
    isPublic: false,
    majorName: input.draft.majorName,
    name: input.draft.name,
    pages: input.pages,
    portfolioUrl: input.draft.portfolioUrl,
    profileImageUrl: '',
    savedAt: input.savedAt,
    submissionStatus: 'ONGOING',
  }
}

function toFailureMessage(result: Exclude<ResumeDetailResult, { readonly kind: 'success' }>) {
  return result.message
}

function toVisibilityFailureMessage(result: Exclude<ResumeVisibilityResult, { readonly kind: 'success' }>) {
  return result.message
}

function toSubmissionFailureMessage(result: Exclude<ResumeSubmissionResult, { readonly kind: 'success' }>) {
  return result.message
}

function isSubmittedResume(resume: Resume) {
  return resume.submissionStatus !== 'ONGOING'
}

export function StudentResumePageContent() {
  const searchParams = useSearchParams()
  const requestedResumeId = searchParams.get('resumeId') ?? ''
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'idle' })
  const [viewMode, setViewMode] = useState<ViewMode>(() => toInitialViewMode(searchParams.get('mode'), requestedResumeId))
  const [draft, setDraft] = useState<ResumeDraft>(defaultResumeDraft)
  const [visibilitySubmitState, setVisibilitySubmitState] = useState<VisibilitySubmitState>('idle')
  const [submissionSubmitState, setSubmissionSubmitState] = useState<SubmissionSubmitState>('idle')
  const [saveSubmitState, setSaveSubmitState] = useState<SaveSubmitState>('idle')
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>()
  const viewedResumeIdRef = useRef<string | undefined>(undefined)
  const requestedResumeIdRef = useRef<string | undefined>(undefined)

  const loadResume = useCallback(async (nextResumeId: string) => {
    const trimmedResumeId = nextResumeId.trim()

    if (!trimmedResumeId) {
      return
    }

    const accessToken = window.localStorage.getItem(AUTH_ACCESS_TOKEN_STORAGE_KEY)

    if (!accessToken) {
      setLoadState({ kind: 'failure', message: '로그인 후 이력서를 조회할 수 있습니다.' })
      return
    }

    setLoadState({ kind: 'loading' })
    viewedResumeIdRef.current = undefined
    setActionFeedback(undefined)

    const result = await getResumeById({
      accessToken,
      resumeId: trimmedResumeId,
    })

    if (result.kind === 'success') {
      viewedResumeIdRef.current = result.resume.id
      setDraft(toResumeDraft(result.resume))
      setLoadState({ kind: 'success', resume: result.resume })
      return
    }

    viewedResumeIdRef.current = undefined
    setLoadState({ kind: 'failure', message: toFailureMessage(result) })
  }, [])

  useEffect(() => {
    if (!requestedResumeId || requestedResumeIdRef.current === requestedResumeId) {
      return
    }

    requestedResumeIdRef.current = requestedResumeId
    void loadResume(requestedResumeId)
  }, [loadResume, requestedResumeId])

  const changeVisibility = async () => {
    if (
      loadState.kind !== 'success' ||
      visibilitySubmitState === 'pending' ||
      submissionSubmitState !== 'idle' ||
      saveSubmitState !== 'idle'
    ) {
      return
    }

    const accessToken = window.localStorage.getItem(AUTH_ACCESS_TOKEN_STORAGE_KEY)

    if (!accessToken) {
      setActionFeedback({ message: '로그인 후 공개 여부를 변경할 수 있습니다.', tone: 'error' })
      return
    }

    const nextIsPublic = !loadState.resume.isPublic
    const activeResumeId = loadState.resume.id

    setVisibilitySubmitState('pending')
    setActionFeedback(undefined)

    const result = await updateResumeVisibility({
      accessToken,
      isPublic: nextIsPublic,
    })

    setVisibilitySubmitState('idle')

    if (viewedResumeIdRef.current !== activeResumeId) {
      return
    }

    if (result.kind !== 'success') {
      setActionFeedback({ message: toVisibilityFailureMessage(result), tone: 'error' })
      return
    }

    setLoadState({
      kind: 'success',
      resume: {
        ...loadState.resume,
        isPublic: result.isPublic,
      },
    })
    setActionFeedback({
      message: result.isPublic ? '이력서를 공개로 변경했습니다.' : '이력서를 비공개로 변경했습니다.',
      tone: 'neutral',
    })
  }

  const changeSubmissionStatus = async () => {
    if (
      loadState.kind !== 'success' ||
      visibilitySubmitState === 'pending' ||
      submissionSubmitState !== 'idle' ||
      saveSubmitState !== 'idle'
    ) {
      setActionFeedback({ message: '조회된 이력서가 없어 제출할 수 없습니다.', tone: 'error' })
      return
    }

    const accessToken = window.localStorage.getItem(AUTH_ACCESS_TOKEN_STORAGE_KEY)

    if (!accessToken) {
      setActionFeedback({ message: '로그인 후 이력서를 제출하거나 취소할 수 있습니다.', tone: 'error' })
      return
    }

    const nextAction: Exclude<SubmissionSubmitState, 'idle'> = isSubmittedResume(loadState.resume) ? 'cancel' : 'submit'
    const activeResumeId = loadState.resume.id

    setSubmissionSubmitState(nextAction)
    setActionFeedback(undefined)

    const result =
      nextAction === 'submit'
        ? await submitResume({
            accessToken,
          })
        : await cancelResumeSubmission({
            accessToken,
          })

    setSubmissionSubmitState('idle')

    if (viewedResumeIdRef.current !== activeResumeId) {
      return
    }

    if (result.kind !== 'success') {
      setActionFeedback({ message: toSubmissionFailureMessage(result), tone: 'error' })
      return
    }

    setLoadState({
      kind: 'success',
      resume: {
        ...loadState.resume,
        submissionStatus: result.submissionStatus,
      },
    })
    setActionFeedback({
      message: result.submissionStatus === 'ONGOING' ? '이력서 제출을 취소했습니다.' : '이력서를 제출했습니다.',
      tone: 'neutral',
    })
  }

  const handleSave = async (isTemporary: boolean) => {
    if (saveSubmitState !== 'idle' || visibilitySubmitState === 'pending' || submissionSubmitState !== 'idle') {
      return
    }

    const accessToken = window.localStorage.getItem(AUTH_ACCESS_TOKEN_STORAGE_KEY)

    if (!accessToken) {
      setActionFeedback({ message: '로그인 후 이력서를 저장할 수 있습니다.', tone: 'error' })
      return
    }

    const activeResume = loadState.kind === 'success' ? loadState.resume : undefined
    const activeResumeId = activeResume?.id
    const pages = toResumePages(draft, activeResume)

    setActionFeedback(undefined)
    setSaveSubmitState(isTemporary ? 'auto-save' : 'save')

    const result = isTemporary
      ? await autoSaveResume({
          accessToken,
          pages,
        })
      : await saveResume({
          accessToken,
          introduce: draft.introduce,
          pages,
          portfolioUrl: draft.portfolioUrl,
        })

    setSaveSubmitState('idle')

    if (activeResumeId && viewedResumeIdRef.current !== activeResumeId) {
      return
    }

    if (result.kind !== 'success') {
      setActionFeedback({ message: result.message, tone: 'error' })
      return
    }

    viewedResumeIdRef.current = result.resumeId

    if (activeResume) {
      setLoadState({
        kind: 'success',
        resume: {
          ...activeResume,
          introduce: draft.introduce,
          pages,
          portfolioUrl: draft.portfolioUrl,
          savedAt: result.savedAt,
        },
      })
    } else {
      setLoadState({
        kind: 'success',
        resume: toSavedDraftResume({
          draft,
          pages,
          resumeId: result.resumeId,
          savedAt: result.savedAt,
        }),
      })
    }

    setActionFeedback({
      message: isTemporary ? '이력서를 임시저장했습니다.' : '이력서를 저장했습니다.',
      tone: 'neutral',
    })
  }

  const resume = loadState.kind === 'success' ? loadState.resume : undefined
  const sheetContents = toSheetSpreadContent(resume, draft)
  const isResumeActionPending =
    visibilitySubmitState === 'pending' || submissionSubmitState !== 'idle' || saveSubmitState !== 'idle'
  const isEditing = viewMode === 'edit' || viewMode === 'feedback'

  return (
    <main className={styles.page}>
      <AppHeader activeItem="resume" items={navigationItems} />

      <section className={`${styles.workspace} ${viewMode === 'feedback' ? styles.withFeedback : ''}`} aria-label="이력서 관리">
        <div className={styles.stage} aria-live="polite">
          <div className={styles.topActions}>
            {isEditing ? (
              <>
                <button className={styles.secondaryAction} disabled={isResumeActionPending} onClick={() => void handleSave(true)} type="button">
                  {saveSubmitState === 'auto-save' ? '임시저장 중' : '임시저장'}
                </button>
                <button className={styles.primaryAction} disabled={isResumeActionPending} onClick={() => void handleSave(false)} type="button">
                  {saveSubmitState === 'save' ? '저장 중' : '저장'}
                </button>
              </>
            ) : (
              <>
                <button className={styles.secondaryAction} onClick={() => setViewMode('edit')} type="button">
                  이력서 수정하기
                </button>
                <button className={styles.primaryAction} disabled={isResumeActionPending} onClick={changeSubmissionStatus} type="button">
                  {submissionSubmitState === 'submit'
                    ? '제출 중'
                    : submissionSubmitState === 'cancel'
                      ? '취소 중'
                      : resume && isSubmittedResume(resume)
                        ? '제출 취소'
                        : '제출'}
                </button>
              </>
            )}
          </div>

          <div className={styles.sheetViewport}>
            <button className={styles.pageArrow} type="button" aria-label="이전 페이지">
              <Icon name="chevron-left" />
            </button>
            <div className={styles.spread} aria-label={isEditing ? '이력서 작성' : '이력서 미리보기'}>
              {isEditing ? (
                <>
                  <ResumeEditorSheet className={styles.documentSheet} draft={draft} onChange={setDraft} pageIndex={0} />
                  <ResumeEditorSheet className={styles.documentSheet} draft={draft} onChange={setDraft} pageIndex={1} />
                </>
              ) : (
                sheetContents.map((content, index) => (
                  <ResumeBookSheet
                    ariaLabel={`${content.name} 이력서 ${index + 1}쪽`}
                    className={styles.documentSheet}
                    content={content}
                    key={`${content.name}-${index}`}
                  />
                ))
              )}
            </div>
            <button className={styles.pageArrow} type="button" aria-label="다음 페이지">
              <Icon name="chevron-right" />
            </button>
          </div>

          <p className={styles.pageCount}>2 / 5</p>

          {isEditing ? (
            <>
              <label className={styles.feedbackToggle}>
                <span>피드백 보기</span>
                <input
                  checked={viewMode === 'feedback'}
                  onChange={(event) => setViewMode(event.target.checked ? 'feedback' : 'edit')}
                  type="checkbox"
                />
                <span className={styles.switchTrack} aria-hidden="true" />
              </label>
            </>
          ) : null}

          {loadState.kind === 'loading' ? <p className={styles.statusMessage}>이력서를 불러오는 중입니다.</p> : null}
          {loadState.kind === 'failure' ? (
            <p className={styles.statusMessage} role="alert">
              {loadState.message}
            </p>
          ) : null}
          {actionFeedback ? (
            <p
              aria-live={actionFeedback.tone === 'error' ? 'assertive' : 'polite'}
              className={styles.statusMessage}
              role={actionFeedback.tone === 'error' ? 'alert' : 'status'}
            >
              {actionFeedback.message}
            </p>
          ) : null}

          {resume ? (
            <button className={styles.visibilityButton} disabled={isResumeActionPending} onClick={changeVisibility} type="button">
              {visibilitySubmitState === 'pending' ? '공개 변경 중' : resume.isPublic ? '공개 중' : '비공개'}
            </button>
          ) : null}
        </div>

        {viewMode === 'feedback' ? (
          <aside className={styles.feedbackPanel} aria-label="피드백 목록">
            <div className={styles.feedbackHeader}>
              <h2>피드백 목록</h2>
              <button className={styles.closeButton} onClick={() => setViewMode('edit')} type="button" aria-label="피드백 목록 닫기">
                ×
              </button>
            </div>
            <div className={styles.feedbackListHeader}>선택하기</div>
            <ul className={styles.feedbackList}>
              {feedbackItems.map((item) => (
                <li className={`${styles.feedbackItem} ${item.isOpen ? styles.openFeedbackItem : ''}`} key={item.id}>
                  <button className={styles.feedbackItemButton} type="button">
                    <span className={styles.feedbackTitle}>
                      {item.title}
                      <span>1일 전</span>
                    </span>
                    <span aria-hidden="true">{item.isOpen ? '⌃' : '⌄'}</span>
                  </button>
                  {item.isOpen ? <p>{item.detail}</p> : null}
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </section>
    </main>
  )
}
