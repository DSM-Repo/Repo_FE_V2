'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'

import { getSavedAccessToken } from '@/features/auth/api'
import { createFeedback, getFeedbacks, type FeedbackListItem } from '@/features/feedback/api'
import {
  removeRecentLibraryBookGroup,
  removeRecentLibraryResume,
  removeRecentLibraryStudent,
  saveRecentLibraryBookGroup,
  saveRecentLibraryResume,
  saveRecentLibraryStudent,
  toReleasedLibraryBookGroup,
} from '@/features/library/api'
import {
  getStudentResumeById,
  getSavedResumeVisibility,
  saveResumeVisibility,
  updateResumeVisibility,
  type Resume,
  type ResumePage,
} from '@/features/resume/api'
import type { AppHeaderItem, ResumeBookSheetContent } from '@/shared/ui'
import { AppHeader, Button, Icon, ResumeBookSheet, Switch, Toast } from '@/shared/ui'

import styles from './page.module.css'

const navigationItems = [
  { href: '/majors', label: '전공 관리', value: 'majors' },
  { href: '/students', label: '학생 관리', value: 'students' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'success'; readonly resume: Resume }
  | { readonly kind: 'failure'; readonly message: string }
type FeedbackLoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly feedbacks: readonly FeedbackListItem[]; readonly kind: 'success'; readonly numberOfData: number }
  | { readonly kind: 'failure'; readonly message: string }
type ActionFeedback = {
  readonly message: string
  readonly tone: 'error' | 'success'
}
type FeedbackSubmitState = 'idle' | 'pending'

function toStudentId(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value
  const studentId = rawValue ? Number(rawValue) : Number.NaN

  return Number.isInteger(studentId) && studentId > 0 ? studentId : undefined
}

function splitIntroduction(value: string) {
  const [introTitle = '', ...introduceLines] = value.replace(/\r/g, '').split('\n')

  return {
    introduce: introduceLines.join('\n'),
    introTitle,
  }
}

function toSheetContent(resume: Resume, page: ResumePage | undefined): ResumeBookSheetContent {
  const introduction = splitIntroduction(resume.introduce)
  const project = page?.project
  const sheetProject =
    page?.type === 'PROJECT'
      ? {
          endDate: project?.endDate ?? '',
          imageUrl: project?.imageUrl ?? '',
          name: project?.name ?? '',
          startDate: project?.startDate ?? '',
          summary: project?.summary ?? '',
        }
      : undefined

  return {
    activities: [],
    contests: project?.summary ? [project.summary] : [],
    email: resume.email,
    headline: '',
    introTitle: introduction.introTitle,
    introduce: introduction.introduce,
    majorName: resume.majorName || '전공미정',
    name: resume.name,
    pageContent: page?.content,
    portfolioUrl: resume.portfolioUrl,
    profileImageUrl: resume.profileImageUrl,
    ...(sheetProject ? { project: sheetProject } : {}),
    projects: project?.name ? [project.name] : [],
    skills: page?.type === 'PROFILE' ? resume.skills : [],
  }
}

function toFeedbackSummary(content: string) {
  const [firstLine = ''] = content.replace(/\r/g, '').split('\n')
  return firstLine.trim() || '내용 없는 피드백'
}

function formatFeedbackDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
  }).format(date)
}

export default function TeacherStudentReviewPage() {
  const params = useParams<{ readonly studentId?: string }>()
  const studentId = toStudentId(params.studentId)
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' })
  const [feedbackLoadState, setFeedbackLoadState] = useState<FeedbackLoadState>({ kind: 'idle' })
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [feedbackDraft, setFeedbackDraft] = useState('')
  const [feedbackSubmitState, setFeedbackSubmitState] = useState<FeedbackSubmitState>('idle')
  const [spreadStartIndex, setSpreadStartIndex] = useState(0)
  const [visibilitySubmitState, setVisibilitySubmitState] = useState<'idle' | 'pending'>('idle')
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>()
  const feedbackTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    let active = true

    async function loadResume() {
      if (!studentId) {
        setLoadState({ kind: 'failure', message: '학생 정보를 찾을 수 없습니다.' })
        return
      }

      const accessToken = getSavedAccessToken()

      if (!accessToken) {
        setLoadState({ kind: 'failure', message: '로그인 후 학생 이력서를 조회할 수 있습니다.' })
        return
      }

      setLoadState({ kind: 'loading' })
      const result = await getStudentResumeById({ accessToken, studentId })

      if (!active) {
        return
      }

      if (result.kind !== 'success') {
        setLoadState({ kind: 'failure', message: result.message })
        return
      }

      const savedVisibility = getSavedResumeVisibility(studentId)
      setLoadState({
        kind: 'success',
        resume: savedVisibility === undefined ? result.resume : { ...result.resume, isPublic: savedVisibility },
      })
      setSpreadStartIndex(0)
      setFeedbackLoadState({ kind: 'idle' })
      setFeedbackDraft('')
      setFeedbackSubmitState('idle')
      setIsFeedbackOpen(false)
    }

    void loadResume()

    return () => {
      active = false
    }
  }, [studentId])

  const resume = loadState.kind === 'success' ? loadState.resume : undefined
  const pages = useMemo(() => (resume ? [...resume.pages].sort((left, right) => left.index - right.index) : []), [resume])
  const visiblePageIndexes = pages.length <= 1 ? [0] : [spreadStartIndex, Math.min(spreadStartIndex + 1, pages.length - 1)]
  const canMovePrevious = spreadStartIndex > 0
  const canMoveNext = spreadStartIndex + 1 < pages.length - 1
  const canUpdateVisibility = Boolean(resume)
  const currentFeedbackPage = pages[spreadStartIndex] ?? pages[0]

  const handleVisibilityChange = useCallback(
    async (isPublic: boolean) => {
      if (!studentId || !resume || visibilitySubmitState !== 'idle') {
        return
      }

      const accessToken = getSavedAccessToken()

      if (!accessToken) {
        setActionFeedback({ message: '로그인 후 공개 여부를 변경할 수 있습니다.', tone: 'error' })
        return
      }

      setVisibilitySubmitState('pending')
      setActionFeedback(undefined)
      const result = await updateResumeVisibility({ accessToken, isPublic, studentId })
      setVisibilitySubmitState('idle')

      if (result.kind !== 'success') {
        setActionFeedback({ message: result.message, tone: 'error' })
        return
      }

      const libraryBookGroup = toReleasedLibraryBookGroup(resume.savedAt)

      if (result.isPublic) {
        saveRecentLibraryBookGroup(libraryBookGroup)
        saveRecentLibraryResume({
          ...libraryBookGroup,
          email: resume.email,
          introduce: resume.introduce,
          majorName: resume.majorName || '전공미정',
          name: resume.name,
          pages: resume.pages.map((page) => ({
            content: page.content,
            id: page.id,
            index: page.index,
          })),
          portfolioUrl: resume.portfolioUrl,
          profileImageUrl: resume.profileImageUrl,
          releasedAt: new Date().toISOString(),
          resumeId: resume.id,
          studentId,
          studentNumber: '',
        })
        saveRecentLibraryStudent({
          date: libraryBookGroup.date,
          major: resume.majorName || '전공미정',
          studentId,
          studentName: resume.name,
        })
      } else {
        removeRecentLibraryBookGroup(libraryBookGroup)
        removeRecentLibraryResume(studentId)
        removeRecentLibraryStudent({ date: libraryBookGroup.date, studentId })
      }

      saveResumeVisibility({ isPublic: result.isPublic, studentId })
      setLoadState({ kind: 'success', resume: { ...resume, isPublic: result.isPublic } })
      setActionFeedback({
        message: result.isPublic ? '이력서를 도서관에 공개했습니다.' : '이력서를 비공개로 전환했습니다.',
        tone: 'success',
      })
    },
    [resume, studentId, visibilitySubmitState],
  )

  const loadFeedbacks = useCallback(async () => {
    if (!resume) {
      return
    }

    const accessToken = getSavedAccessToken()

    if (!accessToken) {
      setFeedbackLoadState({ kind: 'failure', message: '로그인 후 피드백을 조회할 수 있습니다.' })
      return
    }

    setFeedbackLoadState({ kind: 'loading' })
    const result = await getFeedbacks({ accessToken, documentId: resume.id })

    if (result.kind !== 'success') {
      setFeedbackLoadState({ kind: 'failure', message: result.message })
      return
    }

    setFeedbackLoadState((currentState) => {
      if (currentState.kind !== 'success') {
        return {
          feedbacks: result.feedbacks,
          kind: 'success',
          numberOfData: result.numberOfData,
        }
      }

      const loadedFeedbackIds = new Set(result.feedbacks.map((feedback) => feedback.feedbackId))
      const localFeedbacks = currentState.feedbacks.filter((feedback) => !loadedFeedbackIds.has(feedback.feedbackId))

      return {
        feedbacks: [...localFeedbacks, ...result.feedbacks],
        kind: 'success',
        numberOfData: result.numberOfData + localFeedbacks.length,
      }
    })
  }, [resume])

  const handleFeedbackToggle = useCallback(
    async (checked: boolean) => {
      setIsFeedbackOpen(checked)

      if (!checked || feedbackLoadState.kind === 'loading' || feedbackLoadState.kind === 'success') {
        return
      }

      await loadFeedbacks()
    },
    [feedbackLoadState.kind, loadFeedbacks],
  )

  const handleFeedbackAddClick = useCallback(() => {
    setIsFeedbackOpen(true)

    if (feedbackLoadState.kind !== 'loading' && feedbackLoadState.kind !== 'success') {
      void loadFeedbacks()
    }

    window.setTimeout(() => feedbackTextareaRef.current?.focus(), 0)
  }, [feedbackLoadState.kind, loadFeedbacks])

  const handleFeedbackCreate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      const comment = feedbackDraft.trim()

      if (!resume || !currentFeedbackPage || feedbackSubmitState !== 'idle') {
        return
      }

      if (!comment) {
        setActionFeedback({ message: '피드백 내용을 입력해주세요.', tone: 'error' })
        feedbackTextareaRef.current?.focus()
        return
      }

      const accessToken = getSavedAccessToken()

      if (!accessToken) {
        setActionFeedback({ message: '로그인 후 피드백을 작성할 수 있습니다.', tone: 'error' })
        return
      }

      setActionFeedback(undefined)
      setFeedbackSubmitState('pending')
      const result = await createFeedback({
        accessToken,
        comment,
        documentId: resume.id,
        pageId: currentFeedbackPage.id,
        x: 0.5,
        y: 0.5,
      })
      setFeedbackSubmitState('idle')

      if (result.kind !== 'success') {
        setActionFeedback({ message: result.message, tone: 'error' })
        return
      }

      const createdFeedback: FeedbackListItem = {
        completedAt: '',
        content: comment,
        createdAt: result.createdAt,
        feedbackId: result.feedbackId,
        pageDeleted: false,
        pageId: result.pageId,
        status: 'PENDING',
        teacherName: '선생님',
        x: result.x,
        y: result.y,
      }

      setFeedbackLoadState((currentState) => {
        if (currentState.kind !== 'success') {
          return {
            feedbacks: [createdFeedback],
            kind: 'success',
            numberOfData: 1,
          }
        }

        return {
          feedbacks: [createdFeedback, ...currentState.feedbacks],
          kind: 'success',
          numberOfData: currentState.numberOfData + 1,
        }
      })
      setFeedbackDraft('')
      setActionFeedback({ message: '피드백을 추가했습니다.', tone: 'success' })
    },
    [currentFeedbackPage, feedbackDraft, feedbackSubmitState, resume],
  )

  return (
    <main className={styles.page} data-feedback-panel-open={isFeedbackOpen}>
      <AppHeader activeItem="students" items={navigationItems} showLogout />

      <section className={styles.workspace} aria-label="학생 포트폴리오 검토">
        {actionFeedback ? <div className={styles.toastLayer}><Toast variant={actionFeedback.tone}>{actionFeedback.message}</Toast></div> : null}

        <div className={styles.viewer} data-document-empty={loadState.kind !== 'success'}>
          {loadState.kind === 'loading' ? (
            <div className={styles.documentEmpty} role="status">
              <strong>학생 이력서를 불러오는 중입니다.</strong>
              <span>잠시만 기다려주세요.</span>
            </div>
          ) : null}

          {loadState.kind === 'failure' ? (
            <div className={styles.documentEmpty} role="alert">
              <strong>학생 이력서를 불러올 수 없습니다.</strong>
              <span>{loadState.message}</span>
            </div>
          ) : null}

          {resume ? (
            <div className={styles.sheetViewport}>
              <button
                aria-label="이전 페이지"
                className={`${styles.pageArrow} ${styles.previousArrow}`}
                disabled={!canMovePrevious}
                onClick={() => setSpreadStartIndex((currentIndex) => Math.max(0, currentIndex - 1))}
                type="button"
              >
                <Icon name="chevron-left" />
              </button>

              <div className={styles.spread} aria-label="학생 이력서 미리보기">
                {visiblePageIndexes.map((pageIndex) => {
                  const page = pages[pageIndex]
                  return (
                    <ResumeBookSheet
                      ariaLabel={`${resume.name} 이력서 ${(page?.index ?? pageIndex) + 1}쪽`}
                      className={styles.documentSheet}
                      content={toSheetContent(resume, page)}
                      key={page?.id ?? pageIndex}
                    />
                  )
                })}
              </div>

              <button
                aria-label="다음 페이지"
                className={`${styles.pageArrow} ${styles.nextArrow}`}
                disabled={!canMoveNext}
                onClick={() => setSpreadStartIndex((currentIndex) => Math.min(pages.length - 1, currentIndex + 1))}
                type="button"
              >
                <Icon name="chevron-right" />
              </button>
            </div>
          ) : null}
        </div>

        {resume ? (
          <p className={styles.pageIndicator} aria-label="이력서 페이지">
            <strong>{Math.min(spreadStartIndex + 1, Math.max(pages.length, 1))}</strong> / {Math.max(pages.length, 1)}
          </p>
        ) : null}

        <div className={styles.bottomControls}>
          <Button className={styles.feedbackButton} disabled={!resume || feedbackSubmitState === 'pending'} onClick={handleFeedbackAddClick}>
            피드백 추가 <span aria-hidden="true">＋</span>
          </Button>
        </div>

        <div className={styles.reviewSettings} aria-label="학생 이력서 검토 설정">
          <label className={styles.settingRow}>
            <span>이력서 공개</span>
            <span className={styles.switchFrame}>
              <Switch
                aria-label="이력서 공개"
                checked={resume?.isPublic ?? false}
                disabled={!canUpdateVisibility || visibilitySubmitState === 'pending'}
                onCheckedChange={(checked) => void handleVisibilityChange(checked)}
              />
            </span>
          </label>
          <label className={styles.settingRow}>
            <span>피드백 보기</span>
            <span className={styles.switchFrame}>
              <Switch
                aria-label="피드백 보기"
                checked={isFeedbackOpen}
                disabled={!resume}
                onCheckedChange={(checked) => void handleFeedbackToggle(checked)}
              />
            </span>
          </label>
        </div>

        {isFeedbackOpen ? (
          <aside className={styles.feedbackPanel} aria-label="피드백 목록">
            <header className={styles.feedbackPanelHeader}>
              <h2>피드백 목록</h2>
              <button
                aria-label="피드백 목록 닫기"
                className={styles.feedbackPanelClose}
                onClick={() => setIsFeedbackOpen(false)}
                type="button"
              >
                ×
              </button>
            </header>
            <div className={styles.feedbackPanelToolbar}>
              <button disabled={feedbackLoadState.kind !== 'success' || feedbackLoadState.feedbacks.length === 0} type="button">
                전체 완료 처리
              </button>
            </div>
            <form className={styles.feedbackCreateForm} onSubmit={(event) => void handleFeedbackCreate(event)}>
              <label className={styles.feedbackCreateLabel} htmlFor="teacher-feedback-comment">
                새 피드백
              </label>
              <textarea
                className={styles.feedbackCreateInput}
                disabled={feedbackSubmitState === 'pending'}
                id="teacher-feedback-comment"
                onChange={(event) => setFeedbackDraft(event.target.value)}
                placeholder="학생에게 남길 피드백을 입력하세요."
                ref={feedbackTextareaRef}
                rows={4}
                value={feedbackDraft}
              />
              <button
                className={styles.feedbackCreateButton}
                disabled={feedbackSubmitState === 'pending' || !feedbackDraft.trim() || !currentFeedbackPage}
                type="submit"
              >
                {feedbackSubmitState === 'pending' ? '추가 중' : '피드백 저장'}
              </button>
            </form>
            {feedbackLoadState.kind === 'loading' ? <p className={styles.feedbackEmpty}>피드백을 불러오는 중입니다.</p> : null}
            {feedbackLoadState.kind === 'failure' ? (
              <p className={styles.feedbackEmpty} role="alert">
                {feedbackLoadState.message}
              </p>
            ) : null}
            {feedbackLoadState.kind === 'success' && feedbackLoadState.feedbacks.length === 0 ? (
              <p className={styles.feedbackEmpty}>아직 받은 피드백이 없습니다.</p>
            ) : null}
            {feedbackLoadState.kind === 'success' && feedbackLoadState.feedbacks.length > 0 ? (
              <ul className={styles.feedbackList}>
                {feedbackLoadState.feedbacks.map((feedback) => (
                  <li className={styles.feedbackItem} key={feedback.feedbackId}>
                    <button className={styles.feedbackItemButton} type="button">
                      <span className={styles.feedbackTitle}>
                        <span className={styles.feedbackSummary}>{toFeedbackSummary(feedback.content)}</span>
                        <span className={styles.feedbackMeta}>
                          {feedback.teacherName || '선생님'} / {formatFeedbackDate(feedback.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </aside>
        ) : null}
      </section>
    </main>
  )
}
