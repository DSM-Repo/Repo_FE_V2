'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'

import { getSavedAccessToken } from '@/features/auth/api'
import { createFeedback, deleteFeedback, getFeedbacks, type FeedbackListItem } from '@/features/feedback/api'
import { clearLegacyLibraryCache } from '@/features/library/api'
import {
  getStudentResumeById,
  updateResumeVisibility,
  type Resume,
  type ResumePage,
} from '@/features/resume/api'
import type { AppHeaderItem, ResumeBookSheetContent, ResumeBookSheetFeedbackMarker } from '@/shared/ui'
import { useResumePageSize } from '@/shared/lib/useResumePageSize'
import { AppHeader, Icon, ResumeFeedbackSheet, Switch, Toast } from '@/shared/ui'

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
type FeedbackTarget = {
  readonly pageId: string
  readonly x: number
  readonly y: number
}

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
          ...(project?.imageSize ? { imageSize: project.imageSize } : {}),
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
    pageType: page?.type,
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

function toFeedbackDetail(content: string) {
  return content.replace(/\r/g, '').split('\n').slice(1).join('\n').trim()
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

function isCompletedFeedback(feedback: FeedbackListItem) {
  return feedback.status.toUpperCase() === 'COMPLETED' || Boolean(feedback.completedAt)
}

export default function TeacherStudentReviewPage() {
  const params = useParams<{ readonly studentId?: string }>()
  const studentId = toStudentId(params.studentId)
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' })
  const [feedbackLoadState, setFeedbackLoadState] = useState<FeedbackLoadState>({ kind: 'idle' })
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [isPlacingFeedback, setIsPlacingFeedback] = useState(false)
  const [expandedFeedbackId, setExpandedFeedbackId] = useState<string>()
  const [isSelectingFeedback, setIsSelectingFeedback] = useState(false)
  const [selectedFeedbackIds, setSelectedFeedbackIds] = useState<readonly string[]>([])
  const [isDeletingFeedback, setIsDeletingFeedback] = useState(false)
  const [feedbackDraft, setFeedbackDraft] = useState('')
  const [feedbackTarget, setFeedbackTarget] = useState<FeedbackTarget>()
  const [feedbackSubmitState, setFeedbackSubmitState] = useState<FeedbackSubmitState>('idle')
  const [spreadStartIndex, setSpreadStartIndex] = useState(0)
  const [visibilitySubmitState, setVisibilitySubmitState] = useState<'idle' | 'pending'>('idle')
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>()
  const feedbackTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const feedbackDialogRef = useRef<HTMLDialogElement | null>(null)
  const feedbackAddButtonRef = useRef<HTMLButtonElement | null>(null)
  const feedbackRowRefs = useRef(new Map<string, HTMLLIElement>())
  const feedbackRequestVersionRef = useRef(0)
  const feedbackSessionRef = useRef(0)
  const feedbackMutationPendingRef = useRef(false)
  const wasEditingFeedbackRef = useRef(false)

  useEffect(() => {
    if (actionFeedback?.tone !== 'success') return
    const timeout = window.setTimeout(() => setActionFeedback(undefined), 5000)
    return () => window.clearTimeout(timeout)
  }, [actionFeedback])

  const cancelFeedbackDraft = useCallback(() => {
    if (feedbackMutationPendingRef.current) return
    setIsPlacingFeedback(false)
    setFeedbackTarget(undefined)
    setFeedbackDraft('')
    feedbackAddButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    if (feedbackTarget) {
      feedbackDialogRef.current?.showModal()
      feedbackTextareaRef.current?.focus()
    }
  }, [feedbackTarget])

  useEffect(() => {
    const isEditing = isPlacingFeedback || Boolean(feedbackTarget)
    if (wasEditingFeedbackRef.current && !isEditing) feedbackAddButtonRef.current?.focus()
    wasEditingFeedbackRef.current = isEditing
  }, [feedbackTarget, isPlacingFeedback])

  useEffect(() => {
    if (!isPlacingFeedback) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelFeedbackDraft()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cancelFeedbackDraft, isPlacingFeedback])

  useEffect(() => {
    if (expandedFeedbackId) feedbackRowRefs.current.get(expandedFeedbackId)?.scrollIntoView({ block: 'nearest' })
  }, [expandedFeedbackId])

  useEffect(() => {
    let active = true

    async function loadResume() {
      clearLegacyLibraryCache()
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

      setLoadState({
        kind: 'success',
        resume: result.resume,
      })
      setSpreadStartIndex(0)
      setFeedbackLoadState({ kind: 'idle' })
      setFeedbackDraft('')
      setFeedbackTarget(undefined)
      setFeedbackSubmitState('idle')
      setIsFeedbackOpen(false)
      setIsPlacingFeedback(false)
      setExpandedFeedbackId(undefined)
      setIsSelectingFeedback(false)
      setSelectedFeedbackIds([])
      setIsDeletingFeedback(false)
      setActionFeedback(undefined)
      feedbackMutationPendingRef.current = false
    }

    void loadResume()

    return () => {
      active = false
      feedbackRequestVersionRef.current += 1
      feedbackSessionRef.current += 1
    }
  }, [studentId])

  const resume = loadState.kind === 'success' ? loadState.resume : undefined
  const pages = useMemo(() => (resume ? [...resume.pages].sort((left, right) => left.index - right.index) : []), [resume])
  const pageSize = useResumePageSize(980)
  const lastPageIndex = Math.max(0, Math.floor((pages.length - 1) / pageSize) * pageSize)
  const startIndex = Math.min(spreadStartIndex - spreadStartIndex % pageSize, lastPageIndex)
  const visiblePageIndexes = pages.length === 0 ? [0] : Array.from(
    { length: Math.min(pageSize, pages.length - startIndex) }, (_, offset) => startIndex + offset,
  )
  const canMovePrevious = startIndex > 0
  const canMoveNext = startIndex < lastPageIndex
  const canUpdateVisibility = Boolean(resume)
  const currentFeedbackPage = pages[startIndex] ?? pages[0]

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

    const requestVersion = ++feedbackRequestVersionRef.current
    setFeedbackLoadState((current) => current.kind === 'success' ? current : { kind: 'loading' })
    const result = await getFeedbacks({ accessToken, documentId: resume.id })

    if (requestVersion !== feedbackRequestVersionRef.current) return

    if (result.kind !== 'success') {
      setFeedbackLoadState({ kind: 'failure', message: result.message })
      return
    }

    setFeedbackLoadState({ feedbacks: result.feedbacks, kind: 'success', numberOfData: result.numberOfData })
  }, [resume])

  const handleFeedbackToggle = useCallback(
    async (checked: boolean) => {
      if (feedbackMutationPendingRef.current) return
      cancelFeedbackDraft()
      setIsFeedbackOpen(checked)
      if (!checked) {
        setIsSelectingFeedback(false)
        setSelectedFeedbackIds([])
        setExpandedFeedbackId(undefined)
        return
      }
      await loadFeedbacks()
    },
    [cancelFeedbackDraft, loadFeedbacks],
  )

  const handleFeedbackAddClick = useCallback(() => {
    if (feedbackMutationPendingRef.current) return
    setIsPlacingFeedback(true)
    setIsFeedbackOpen(false)
    setIsSelectingFeedback(false)
    setSelectedFeedbackIds([])
    setExpandedFeedbackId(undefined)

    if (feedbackLoadState.kind !== 'loading' && feedbackLoadState.kind !== 'success') {
      void loadFeedbacks()
    }
  }, [feedbackLoadState.kind, loadFeedbacks])

  const handleFeedbackPointSelect = useCallback(
    (page: ResumePage | undefined, point: { readonly x: number; readonly y: number }) => {
      if (!page || !isPlacingFeedback || feedbackMutationPendingRef.current) {
        return
      }

      setFeedbackTarget({ pageId: page.id, x: point.x, y: point.y })
      setIsPlacingFeedback(false)
    },
    [isPlacingFeedback],
  )

  const openFeedback = useCallback((feedback: FeedbackListItem) => {
    setExpandedFeedbackId(feedback.feedbackId)
    if (feedback.pageDeleted) return
    const pageIndex = pages.findIndex((page) => page.id === feedback.pageId)
    if (pageIndex >= 0) setSpreadStartIndex(pageIndex)
  }, [pages])

  const toPageFeedbackMarkers = useCallback(
    (page: ResumePage | undefined): readonly ResumeBookSheetFeedbackMarker[] => {
      if (!page || (!isFeedbackOpen && !isPlacingFeedback && !feedbackTarget)) {
        return []
      }

      const savedMarkers =
        feedbackLoadState.kind === 'success'
          ? feedbackLoadState.feedbacks
              .filter((feedback) => feedback.pageId === page.id && !feedback.pageDeleted)
              .map((feedback) => {
                const title = toFeedbackSummary(feedback.content)

                return {
                  checked: isCompletedFeedback(feedback),
                  id: feedback.feedbackId,
                  onSelect: () => {
                    setIsPlacingFeedback(false)
                    setIsFeedbackOpen(true)
                    openFeedback(feedback)
                  },
                  selected: expandedFeedbackId === feedback.feedbackId,
                  title,
                  x: feedback.x,
                  y: feedback.y,
                }
              })
          : []

      if (feedbackTarget?.pageId !== page.id) {
        return savedMarkers
      }

      return [
        {
          active: true,
          checked: false,
          id: 'draft-feedback-target',
          title: feedbackDraft.trim() ? toFeedbackSummary(feedbackDraft) : '새 피드백 위치',
          x: feedbackTarget.x,
          y: feedbackTarget.y,
        },
        ...savedMarkers,
      ]
    },
    [expandedFeedbackId, feedbackDraft, feedbackLoadState, feedbackTarget, isFeedbackOpen, isPlacingFeedback, openFeedback],
  )

  const handleFeedbackCreate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      const comment = feedbackDraft.trim()

      if (!resume || !feedbackTarget || feedbackMutationPendingRef.current || feedbackLoadState.kind === 'loading') {
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
      feedbackMutationPendingRef.current = true
      feedbackRequestVersionRef.current += 1
      const session = feedbackSessionRef.current
      setFeedbackSubmitState('pending')
      const result = await createFeedback({
        accessToken,
        comment,
        documentId: resume.id,
        pageId: feedbackTarget.pageId,
        x: feedbackTarget.x,
        y: feedbackTarget.y,
      })
      if (session !== feedbackSessionRef.current) return
      feedbackMutationPendingRef.current = false
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

      feedbackRequestVersionRef.current += 1

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
      setFeedbackTarget(undefined)
      setIsFeedbackOpen(true)
      setExpandedFeedbackId(result.feedbackId)
      feedbackAddButtonRef.current?.focus()
      setActionFeedback({ message: '피드백을 추가했습니다.', tone: 'success' })
    },
    [feedbackDraft, feedbackLoadState.kind, feedbackTarget, resume],
  )

  const handleFeedbackDelete = async () => {
    if (selectedFeedbackIds.length === 0 || feedbackMutationPendingRef.current) return
    const accessToken = getSavedAccessToken()
    if (!accessToken) {
      setActionFeedback({ message: '로그인 후 피드백을 삭제할 수 있습니다.', tone: 'error' })
      return
    }
    feedbackMutationPendingRef.current = true
    feedbackRequestVersionRef.current += 1
    setIsDeletingFeedback(true)
    setActionFeedback(undefined)
    const session = feedbackSessionRef.current
    const results = await Promise.all(selectedFeedbackIds.map(async (feedbackId) => ({
      feedbackId,
      result: await deleteFeedback({ accessToken, feedbackId }),
    })))
    if (session !== feedbackSessionRef.current) return
    feedbackMutationPendingRef.current = false
    setIsDeletingFeedback(false)
    feedbackRequestVersionRef.current += 1
    const removedIds = new Set(results.filter(({ result }) => result.kind === 'success').map(({ feedbackId }) => feedbackId))
    setFeedbackLoadState((current) => current.kind === 'success' ? {
      kind: 'success',
      feedbacks: current.feedbacks.filter((feedback) => !removedIds.has(feedback.feedbackId)),
      numberOfData: Math.max(0, current.numberOfData - removedIds.size),
    } : current)
    setSelectedFeedbackIds((current) => current.filter((id) => !removedIds.has(id)))
    setExpandedFeedbackId((current) => current && removedIds.has(current) ? undefined : current)
    const failures = results.flatMap(({ result }) => result.kind === 'success' ? [] : [result.message])
    if (failures.length > 0) {
      setActionFeedback({ message: [...new Set(failures)].join('\n'), tone: 'error' })
    } else {
      setIsSelectingFeedback(false)
      setActionFeedback({ message: '피드백을 삭제했습니다.', tone: 'success' })
    }
  }

  return (
    <main className={styles.page} data-feedback-panel-open={isFeedbackOpen} data-feedback-placement={isPlacingFeedback}>
      <AppHeader activeItem="students" items={navigationItems} showLogout />

      <section className={styles.workspace} aria-label="학생 포트폴리오 검토">
        {actionFeedback && !feedbackTarget ? <div className={styles.toastLayer}><Toast variant={actionFeedback.tone}>{actionFeedback.message}</Toast></div> : null}

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
            <div data-resume-viewport className={styles.sheetViewport}>
              <button
                aria-label="이전 페이지"
                className={`${styles.pageArrow} ${styles.previousArrow}`}
                disabled={!canMovePrevious}
                onClick={() => setSpreadStartIndex(Math.max(0, startIndex - pageSize))}
                type="button"
              >
                <Icon name="chevron-left" />
              </button>

              <div className={styles.spread} aria-label="학생 이력서 미리보기">
                {visiblePageIndexes.map((pageIndex) => {
                  const page = pages[pageIndex]
                  return (
                    <ResumeFeedbackSheet
                      pagesPerSpread={pageSize}
                      ariaLabel={`${resume.name} 이력서 ${(page?.index ?? pageIndex) + 1}쪽`}
                      className={styles.documentSheet}
                      content={toSheetContent(resume, page)}
                      feedbackMarkers={toPageFeedbackMarkers(page)}
                      key={page?.id ?? pageIndex}
                      onFeedbackPointSelect={isPlacingFeedback ? (point) => handleFeedbackPointSelect(page, point) : undefined}
                    />
                  )
                })}
              </div>

              <button
                aria-label="다음 페이지"
                className={`${styles.pageArrow} ${styles.nextArrow}`}
                disabled={!canMoveNext}
                onClick={() => setSpreadStartIndex(Math.min(lastPageIndex, startIndex + pageSize))}
                type="button"
              >
                <Icon name="chevron-right" />
              </button>
            </div>
          ) : null}
        </div>

        {resume ? (
          <p className={styles.pageIndicator} aria-label="이력서 페이지">
            <strong>{Math.min(startIndex + pageSize, Math.max(pages.length, 1))}</strong> / {Math.max(pages.length, 1)}
          </p>
        ) : null}

        <div className={styles.bottomControls}>
          {isPlacingFeedback ? (
            <div className={styles.placementControls}>
              <p role="status">피드백을 남길 위치를 선택해주세요.</p>
              <div>
                <button type="button" onClick={() => handleFeedbackPointSelect(currentFeedbackPage, { x: 0.5, y: 0.5 })}>
                  현재 페이지 중앙에 추가
                </button>
                <button type="button" onClick={cancelFeedbackDraft}>취소</button>
              </div>
            </div>
          ) : null}
            <button className={styles.feedbackButton} disabled={!resume || pages.length === 0 || feedbackSubmitState === 'pending' || isDeletingFeedback} hidden={isPlacingFeedback} onClick={handleFeedbackAddClick} ref={feedbackAddButtonRef} type="button">
              피드백 추가 <span aria-hidden="true">＋</span>
            </button>
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
                disabled={!resume || feedbackSubmitState === 'pending' || isDeletingFeedback}
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
                disabled={isDeletingFeedback}
                onClick={() => void handleFeedbackToggle(false)}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>
            <div className={styles.feedbackPanelToolbar}>
              {isSelectingFeedback ? <span>{selectedFeedbackIds.length}개 선택됨</span> : (
                <button
                  disabled={feedbackLoadState.kind !== 'success' || feedbackLoadState.feedbacks.length === 0}
                  onClick={() => { setIsSelectingFeedback(true); setExpandedFeedbackId(undefined) }}
                  type="button"
                >선택하기</button>
              )}
            </div>
            <div className={styles.feedbackPanelBody}>
            {feedbackLoadState.kind === 'loading' ? <p className={styles.feedbackEmpty}>피드백을 불러오는 중입니다.</p> : null}
            {feedbackLoadState.kind === 'failure' ? (
              <div className={styles.feedbackEmpty} role="alert">
                <p>{feedbackLoadState.message}</p>
                <button className={styles.feedbackSecondaryButton} onClick={() => void loadFeedbacks()} type="button">다시 시도</button>
              </div>
            ) : null}
            {feedbackLoadState.kind === 'success' && feedbackLoadState.feedbacks.length === 0 ? (
              <p className={styles.feedbackEmpty}>아직 받은 피드백이 없습니다.</p>
            ) : null}
            {feedbackLoadState.kind === 'success' && feedbackLoadState.feedbacks.length > 0 ? (
              <ul className={styles.feedbackList}>
                {feedbackLoadState.feedbacks.map((feedback) => (
                  <li
                    className={styles.feedbackItem}
                    data-selected={isSelectingFeedback && selectedFeedbackIds.includes(feedback.feedbackId)}
                    key={feedback.feedbackId}
                    ref={(element) => {
                      if (element) feedbackRowRefs.current.set(feedback.feedbackId, element)
                      else feedbackRowRefs.current.delete(feedback.feedbackId)
                    }}
                  >
                    <button
                      aria-expanded={isSelectingFeedback ? undefined : expandedFeedbackId === feedback.feedbackId}
                      aria-checked={isSelectingFeedback ? selectedFeedbackIds.includes(feedback.feedbackId) : undefined}
                      aria-label={isSelectingFeedback ? `${toFeedbackSummary(feedback.content)} 선택` : undefined}
                      className={styles.feedbackItemButton}
                      disabled={isDeletingFeedback}
                      role={isSelectingFeedback ? 'checkbox' : undefined}
                      onClick={() => {
                        if (isSelectingFeedback) {
                          setSelectedFeedbackIds((current) => current.includes(feedback.feedbackId)
                            ? current.filter((id) => id !== feedback.feedbackId)
                            : [...current, feedback.feedbackId])
                        } else if (expandedFeedbackId === feedback.feedbackId) {
                          setExpandedFeedbackId(undefined)
                        } else {
                          openFeedback(feedback)
                        }
                      }}
                      type="button"
                    >
                      <span className={styles.feedbackTitle}>
                        <span className={styles.feedbackSummary}>{toFeedbackSummary(feedback.content)}</span>
                        <span className={styles.feedbackMeta}>
                          {feedback.teacherName || '선생님'} / {formatFeedbackDate(feedback.createdAt)}
                        </span>
                      </span>
                      {!isSelectingFeedback ? <span className={expandedFeedbackId === feedback.feedbackId ? styles.feedbackChevronExpanded : undefined}><Icon name="chevron-right" /></span> : null}
                    </button>
                    {!isSelectingFeedback && expandedFeedbackId === feedback.feedbackId && (toFeedbackDetail(feedback.content) || feedback.pageDeleted) ? (
                      <div className={styles.feedbackDetail}>
                        {toFeedbackDetail(feedback.content) ? <p>{toFeedbackDetail(feedback.content)}</p> : null}
                        {feedback.pageDeleted ? <span className={styles.feedbackMeta}>삭제된 페이지의 피드백입니다.</span> : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            </div>
            {isSelectingFeedback ? (
              <footer className={styles.feedbackPanelFooter}>
                <button
                  className={styles.feedbackSecondaryButton}
                  disabled={isDeletingFeedback}
                  onClick={() => { setIsSelectingFeedback(false); setSelectedFeedbackIds([]) }}
                  type="button"
                >취소</button>
                <button
                  className={styles.feedbackCreateButton}
                  disabled={isDeletingFeedback || selectedFeedbackIds.length === 0}
                  onClick={() => void handleFeedbackDelete()}
                  type="button"
                >{isDeletingFeedback ? '삭제 중' : '피드백 삭제'}</button>
              </footer>
            ) : null}
          </aside>
        ) : null}
        {feedbackTarget ? (
          <dialog
            aria-label="피드백 작성"
            className={styles.feedbackComposer}
            onCancel={(event) => { event.preventDefault(); cancelFeedbackDraft() }}
            ref={feedbackDialogRef}
          >
            <form className={styles.feedbackCreateForm} onSubmit={(event) => void handleFeedbackCreate(event)}>
              <label className={styles.feedbackCreateLabel} htmlFor="teacher-feedback-comment">새 피드백</label>
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
              {actionFeedback?.tone === 'error' ? <p className={styles.feedbackCreateError} role="alert">{actionFeedback.message}</p> : null}
              <div className={styles.feedbackComposerActions}>
                <button aria-label="피드백 작성 취소" className={styles.feedbackSecondaryButton} disabled={feedbackSubmitState === 'pending'} onClick={cancelFeedbackDraft} type="button">취소</button>
                <button className={styles.feedbackCreateButton} disabled={feedbackSubmitState === 'pending' || feedbackLoadState.kind === 'loading' || !feedbackDraft.trim()} type="submit">
                  {feedbackSubmitState === 'pending' ? '추가 중' : '피드백 저장'}
                </button>
              </div>
            </form>
          </dialog>
        ) : null}
      </section>
    </main>
  )
}
