'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { getSavedAccessToken } from '@/features/auth/api'
import {
  applyFeedback,
  completeFeedback,
  getFeedbacks,
  pendingFeedback,
  type FeedbackListItem,
} from '@/features/feedback/api'
import { getMajors, type Major } from '@/features/major/api'
import {
  autoSaveResume,
  cancelResumeSubmission,
  clearSavedResumeId,
  getResumeById,
  getSavedResumeId,
  saveResume,
  saveResumeId,
  submitResume,
  type Resume,
  type ResumeDetailResult,
  type ResumePage,
  type ResumeSavePage,
  type ResumeSaveProject,
  type ResumeSubmissionResult,
} from '@/features/resume/api'
import { getUserMe, updateUserMajor, type UserMe, type UserMeResult } from '@/features/user/api'
import type { AppHeaderItem, ResumeBookSheetContent } from '@/shared/ui'
import { AppHeader, Icon, ResumeBookSheet, Toast } from '@/shared/ui'

import {
  getDepartmentFromSchoolNumber,
  ResumeEditorSheet,
  type ResumeDraft,
  type ResumeDraftPage,
  type ResumeDraftProject,
} from './ResumeEditorSheet'
import styles from './page.module.css'

const navigationItems = [
  { href: '/home', label: '홈', value: 'home' },
  { href: '/resume', label: '이력서 관리', value: 'resume' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

const AUTO_SAVE_IDLE_MS = 180_000

const defaultResumeDraft = {
  activities: [],
  email: '',
  headline: '전공미정',
  introduce: '',
  introTitle: '',
  name: '',
  pages: [
    { content: '', index: 0, type: 'PROFILE' },
    { content: '', index: 1, project: { endDate: '', imageUrl: '', name: '', startDate: '', summary: '' }, type: 'PROJECT' },
  ],
  portfolioUrl: '',
  schoolNumber: '',
  skills: [],
} satisfies ResumeDraft

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
type SubmissionSubmitState = 'idle' | 'submit' | 'cancel'
type SaveSubmitState = 'auto-save' | 'idle' | 'save' | 'temporary-save'
type SaveMode = 'auto' | 'manual' | 'temporary'
type ActionFeedback = {
  readonly message: string
  readonly tone: 'error' | 'success'
}
type UserLoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'success' }
  | { readonly kind: 'failure'; readonly message: string }
type MajorLoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'success' }
  | { readonly kind: 'failure'; readonly message: string }
type MajorSubmitState = 'idle' | 'pending'
type FeedbackLoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly feedbacks: readonly FeedbackListItem[]; readonly kind: 'success'; readonly numberOfData: number }
  | { readonly kind: 'failure'; readonly message: string }
type FeedbackSubmitState =
  | { readonly kind: 'apply-all' }
  | { readonly feedbackId: string; readonly kind: 'item' }
  | { readonly kind: 'idle' }

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

function splitIntroduction(value: string) {
  const [introTitle = '', ...introduceLines] = value.replace(/\r/g, '').split('\n')

  return {
    introduce: introduceLines.join('\n'),
    introTitle,
  }
}

function joinIntroduction(draft: ResumeDraft) {
  return draft.introduce ? `${draft.introTitle}\n${draft.introduce}` : draft.introTitle
}

function toDraftProject(project: ResumePage['project']): ResumeDraftProject | undefined {
  if (!project) {
    return undefined
  }

  return {
    endDate: project.endDate,
    imageUrl: project.imageUrl,
    name: project.name,
    startDate: project.startDate,
    summary: project.summary,
  }
}

function toDraftPage(page: ResumePage): ResumeDraftPage {
  return {
    content: page.content,
    id: page.id,
    index: page.index,
    ...(page.project ? { project: toDraftProject(page.project) } : {}),
    type: page.type,
  }
}

function toSheetContent(draft: ResumeDraft, pageIndex: number): ResumeBookSheetContent {
  const page = draft.pages[pageIndex]
  const project = page?.project
  const department = getDepartmentFromSchoolNumber(draft.schoolNumber)

  return {
    activities: page?.type === 'PROFILE' ? draft.activities : [],
    contests: project?.summary ? [project.summary] : [],
    email: draft.email,
    headline: [draft.schoolNumber, department].filter(Boolean).join(' '),
    introTitle: draft.introTitle,
    introduce: draft.introduce,
    majorName: draft.headline,
    name: draft.name,
    pageContent: page?.content,
    portfolioUrl: draft.portfolioUrl,
    projects: project?.name ? [project.name] : [],
    skills: page?.type === 'PROFILE' ? draft.skills : [],
  }
}

function toResumeDraft(resume: Resume): ResumeDraft {
  const introduction = splitIntroduction(resume.introduce)
  const pages = [...resume.pages].sort((left, right) => left.index - right.index).map(toDraftPage)

  return {
    ...defaultResumeDraft,
    email: resume.email,
    headline: resume.majorName || '전공미정',
    introduce: introduction.introduce,
    introTitle: introduction.introTitle,
    name: resume.name,
    pages: pages.length > 0 ? pages : defaultResumeDraft.pages,
    portfolioUrl: resume.portfolioUrl,
    skills: resume.skills,
  }
}

function toResumePages(draft: ResumeDraft, resume?: Resume): readonly ResumePage[] {
  return draft.pages.map((page): ResumePage => {
    const existingPage = resume?.pages.find((resumePage) => resumePage.index === page.index)
    const project = page.project ?? existingPage?.project

    return {
      content: page.content,
      id: page.id ?? existingPage?.id ?? '',
      index: page.index,
      ...(project
        ? {
            project: {
              endDate: project.endDate,
              imageUrl: project.imageUrl,
              name: project.name,
              startDate: project.startDate,
              summary: project.summary,
            },
          }
        : {}),
      type: page.type,
    }
  })
}

function toResumeSaveProject(project: ResumeSaveProject): ResumeSaveProject | undefined {
  const normalizedProject = {
    ...(project.endDate?.trim() ? { endDate: project.endDate.trim() } : {}),
    ...(project.imageUrl?.trim() ? { imageUrl: project.imageUrl.trim() } : {}),
    ...(project.name?.trim() ? { name: project.name.trim() } : {}),
    ...(project.startDate?.trim() ? { startDate: project.startDate.trim() } : {}),
    ...(project.summary?.trim() ? { summary: project.summary.trim() } : {}),
  }

  return Object.keys(normalizedProject).length > 0 ? normalizedProject : undefined
}

function toResumeSavePages(draft: ResumeDraft, resume?: Resume): readonly ResumeSavePage[] {
  return draft.pages.map((page): ResumeSavePage => {
    const existingPage = resume?.pages.find((resumePage) => resumePage.index === page.index)
    const project = page.project ? toResumeSaveProject(page.project) : undefined
    const pageId = page.id ?? existingPage?.id

    return {
      content: page.content,
      ...(pageId ? { id: pageId } : {}),
      index: page.index,
      ...(project ? { project } : {}),
      type: page.type,
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
    email: input.draft.email,
    id: input.resumeId,
    introduce: joinIntroduction(input.draft),
    isPublic: false,
    majorName: input.draft.headline === '전공미정' ? '' : input.draft.headline,
    name: input.draft.name,
    pages: input.pages,
    portfolioUrl: input.draft.portfolioUrl,
    profileImageUrl: '',
    savedAt: input.savedAt,
    skills: input.draft.skills,
    submissionStatus: 'ONGOING',
  }
}

function toFailureMessage(result: Exclude<ResumeDetailResult, { readonly kind: 'success' }>) {
  return result.message
}

function toSubmissionFailureMessage(result: Exclude<ResumeSubmissionResult, { readonly kind: 'success' }>) {
  return result.message
}

function isSubmittedResume(resume: Resume) {
  return resume.submissionStatus !== 'ONGOING'
}

function isCompletedFeedback(feedback: FeedbackListItem) {
  return feedback.status.trim().toUpperCase() === 'COMPLETED'
}

function toFeedbackStatusLabel(feedback: FeedbackListItem) {
  return isCompletedFeedback(feedback) ? '반영 완료' : '미반영'
}

function toFeedbackSummary(content: string) {
  const trimmedContent = content.trim()

  if (!trimmedContent) {
    return '내용 없는 피드백'
  }

  return trimmedContent.length > 28 ? `${trimmedContent.slice(0, 28)}...` : trimmedContent
}

function formatFeedbackDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '날짜 미정'
  }

  return new Intl.DateTimeFormat('ko-KR', {
    day: 'numeric',
    month: 'numeric',
  }).format(date)
}

function toUserFailureMessage(result: Exclude<UserMeResult, { readonly kind: 'success' }>) {
  return result.message
}

function applyUserToDraft(draft: ResumeDraft, user: UserMe): ResumeDraft {
  return {
    ...draft,
    headline: user.major ?? '전공미정',
    name: user.name,
    schoolNumber: user.classInfo.schoolNumber,
  }
}

export function StudentResumePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedResumeId = searchParams.get('resumeId') ?? ''
  const requestedMode = searchParams.get('mode')
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'idle' })
  const [viewMode, setViewMode] = useState<ViewMode>(() => toInitialViewMode(requestedMode, requestedResumeId))
  const [draft, setDraft] = useState<ResumeDraft>(defaultResumeDraft)
  const [submissionSubmitState, setSubmissionSubmitState] = useState<SubmissionSubmitState>('idle')
  const [saveSubmitState, setSaveSubmitState] = useState<SaveSubmitState>('idle')
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>()
  const [userLoadState, setUserLoadState] = useState<UserLoadState>({ kind: 'loading' })
  const [majorLoadState, setMajorLoadState] = useState<MajorLoadState>({ kind: 'loading' })
  const [majorSubmitState, setMajorSubmitState] = useState<MajorSubmitState>('idle')
  const [majors, setMajors] = useState<readonly Major[]>([])
  const [isDraftDirty, setIsDraftDirty] = useState(false)
  const [feedbackLoadState, setFeedbackLoadState] = useState<FeedbackLoadState>({ kind: 'idle' })
  const [feedbackSubmitState, setFeedbackSubmitState] = useState<FeedbackSubmitState>({ kind: 'idle' })
  const [openFeedbackId, setOpenFeedbackId] = useState<string>()
  const [spreadStartIndex, setSpreadStartIndex] = useState(0)
  const userRef = useRef<UserMe | undefined>(undefined)
  const viewedResumeIdRef = useRef<string | undefined>(undefined)
  const requestedResumeIdRef = useRef<string | undefined>(undefined)
  const draftRevisionRef = useRef(0)
  const lastDraftChangeAtRef = useRef(0)

  useEffect(() => {
    let isActive = true

    const loadUser = async () => {
      await Promise.resolve()

      if (!isActive) {
        return
      }

      const accessToken = getSavedAccessToken()

      if (!accessToken) {
        setUserLoadState({ kind: 'failure', message: '로그인 후 학생 정보를 불러올 수 있습니다.' })
        return
      }

      const result = await getUserMe({ accessToken })

      if (!isActive) {
        return
      }

      if (result.kind === 'success') {
        userRef.current = result.user
        setDraft((currentDraft) => applyUserToDraft(currentDraft, result.user))
        setUserLoadState({ kind: 'success' })
        return
      }

      setUserLoadState({ kind: 'failure', message: toUserFailureMessage(result) })
    }

    void loadUser()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true

    const loadMajors = async () => {
      const accessToken = getSavedAccessToken()

      if (!accessToken) {
        setMajorLoadState({ kind: 'failure', message: '로그인 후 전공 목록을 불러올 수 있습니다.' })
        return
      }

      const result = await getMajors({ accessToken })

      if (!isActive) {
        return
      }

      if (result.kind === 'success') {
        setMajors(result.value.majors)
        setMajorLoadState({ kind: 'success' })
        return
      }

      setMajorLoadState({ kind: 'failure', message: result.message })
    }

    void loadMajors()

    return () => {
      isActive = false
    }
  }, [])

  const loadResume = useCallback(async (nextResumeId: string, syncUrl: boolean) => {
    const trimmedResumeId = nextResumeId.trim()

    if (!trimmedResumeId) {
      return
    }

    const accessToken = getSavedAccessToken()

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
      saveResumeId(result.resume.id)
      setDraft(() => {
        const resumeDraft = toResumeDraft(result.resume)
        return userRef.current ? applyUserToDraft(resumeDraft, userRef.current) : resumeDraft
      })
      setLoadState({ kind: 'success', resume: result.resume })

      if (syncUrl) {
        router.replace(`/resume?resumeId=${encodeURIComponent(result.resume.id)}&mode=edit`, { scroll: false })
      }

      return
    }

    viewedResumeIdRef.current = undefined
    if (getSavedResumeId() === trimmedResumeId) {
      clearSavedResumeId()
    }
    setLoadState({ kind: 'failure', message: toFailureMessage(result) })
  }, [router])

  useEffect(() => {
    const resumeIdToLoad = requestedResumeId || getSavedResumeId() || ''

    if (!resumeIdToLoad || requestedResumeIdRef.current === resumeIdToLoad) {
      return
    }

    requestedResumeIdRef.current = resumeIdToLoad
    void loadResume(resumeIdToLoad, !requestedResumeId)
  }, [loadResume, requestedResumeId])

  const changeSubmissionStatus = async () => {
    if (
      loadState.kind !== 'success' ||
      submissionSubmitState !== 'idle' ||
      saveSubmitState !== 'idle'
    ) {
      setActionFeedback({ message: '조회된 이력서가 없어 제출할 수 없습니다.', tone: 'error' })
      return
    }

    const accessToken = getSavedAccessToken()

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
      tone: 'success',
    })
  }

  const resume = loadState.kind === 'success' ? loadState.resume : undefined
  const isResumeActionPending =
    submissionSubmitState !== 'idle' || saveSubmitState !== 'idle' || majorSubmitState === 'pending'
  const isEditing = viewMode === 'edit' || viewMode === 'feedback'
  const visiblePageIndexes = [spreadStartIndex, spreadStartIndex + 1].filter((index) => index < draft.pages.length)
  const canMovePrevious = spreadStartIndex > 0
  const canMoveNext = isEditing ? spreadStartIndex < draft.pages.length - 1 : spreadStartIndex + 2 < draft.pages.length
  const feedbacks = feedbackLoadState.kind === 'success' ? feedbackLoadState.feedbacks : []
  const pendingFeedbackCount = feedbacks.filter((feedback) => !isCompletedFeedback(feedback)).length
  const isFeedbackSubmitting = feedbackSubmitState.kind !== 'idle'

  useEffect(() => {
    if (viewMode !== 'feedback') {
      return
    }

    let isActive = true

    const loadFeedbacks = async () => {
      if (!resume?.id) {
        const hasPendingResumeLookup =
          loadState.kind === 'loading' ||
          (loadState.kind === 'idle' && Boolean(requestedResumeId.trim() || getSavedResumeId()))

        if (hasPendingResumeLookup) {
          setFeedbackLoadState({ kind: 'loading' })
          return
        }

        setFeedbackLoadState({
          kind: 'failure',
          message: '저장된 이력서가 있어야 피드백을 확인할 수 있습니다.',
        })
        return
      }

      const accessToken = getSavedAccessToken()

      if (!accessToken) {
        setFeedbackLoadState({ kind: 'failure', message: '로그인 후 피드백을 확인할 수 있습니다.' })
        return
      }

      setFeedbackLoadState({ kind: 'loading' })
      setFeedbackSubmitState({ kind: 'idle' })

      const result = await getFeedbacks({
        accessToken,
        documentId: resume.id,
      })

      if (!isActive) {
        return
      }

      if (result.kind !== 'success') {
        setFeedbackLoadState({ kind: 'failure', message: result.message })
        return
      }

      setFeedbackLoadState({
        feedbacks: result.feedbacks,
        kind: 'success',
        numberOfData: result.numberOfData,
      })
      setOpenFeedbackId((currentFeedbackId) => currentFeedbackId ?? result.feedbacks[0]?.feedbackId)
    }

    void loadFeedbacks()

    return () => {
      isActive = false
    }
  }, [loadState.kind, requestedResumeId, resume?.id, viewMode])

  const updateFeedbackStatus = useCallback((feedbackId: string, status: string) => {
    setFeedbackLoadState((currentState) => {
      if (currentState.kind !== 'success') {
        return currentState
      }

      return {
        ...currentState,
        feedbacks: currentState.feedbacks.map((feedback) =>
          feedback.feedbackId === feedbackId ? { ...feedback, status } : feedback,
        ),
      }
    })
  }, [])

  const handleFeedbackStatusChange = useCallback(
    async (feedback: FeedbackListItem) => {
      if (feedbackSubmitState.kind !== 'idle') {
        return
      }

      const accessToken = getSavedAccessToken()

      if (!accessToken) {
        setActionFeedback({ message: '로그인 후 피드백 상태를 변경할 수 있습니다.', tone: 'error' })
        return
      }

      const nextStatusLabel = isCompletedFeedback(feedback) ? '미반영' : '완료'

      setActionFeedback(undefined)
      setFeedbackSubmitState({ feedbackId: feedback.feedbackId, kind: 'item' })

      const result = isCompletedFeedback(feedback)
        ? await pendingFeedback({ accessToken, feedbackId: feedback.feedbackId })
        : await completeFeedback({ accessToken, feedbackId: feedback.feedbackId })

      setFeedbackSubmitState({ kind: 'idle' })

      if (result.kind !== 'success') {
        setActionFeedback({ message: result.message, tone: 'error' })
        return
      }

      updateFeedbackStatus(feedback.feedbackId, result.status)
      setActionFeedback({ message: `피드백을 ${nextStatusLabel} 처리했습니다.`, tone: 'success' })
    },
    [feedbackSubmitState.kind, updateFeedbackStatus],
  )

  const handleCompleteAllFeedbacks = useCallback(async () => {
    if (feedbackLoadState.kind !== 'success' || feedbackSubmitState.kind !== 'idle') {
      return
    }

    const targetFeedbackIds = feedbackLoadState.feedbacks
      .filter((feedback) => !isCompletedFeedback(feedback))
      .map((feedback) => feedback.feedbackId)

    if (targetFeedbackIds.length === 0) {
      setActionFeedback({ message: '완료 처리할 피드백이 없습니다.', tone: 'success' })
      return
    }

    const accessToken = getSavedAccessToken()

    if (!accessToken) {
      setActionFeedback({ message: '로그인 후 피드백 상태를 변경할 수 있습니다.', tone: 'error' })
      return
    }

    setActionFeedback(undefined)
    setFeedbackSubmitState({ kind: 'apply-all' })

    const result = await applyFeedback({
      accessToken,
      applied: true,
      feedbackIds: targetFeedbackIds,
    })

    setFeedbackSubmitState({ kind: 'idle' })

    if (result.kind !== 'success') {
      setActionFeedback({ message: result.message, tone: 'error' })
      return
    }

    const failedFeedbackIds = new Set(result.failed.map((failure) => failure.feedbackId))

    setFeedbackLoadState((currentState) => {
      if (currentState.kind !== 'success') {
        return currentState
      }

      return {
        ...currentState,
        feedbacks: currentState.feedbacks.map((feedback) =>
          targetFeedbackIds.includes(feedback.feedbackId) && !failedFeedbackIds.has(feedback.feedbackId)
            ? { ...feedback, status: 'COMPLETED' }
            : feedback,
        ),
      }
    })
    setActionFeedback({ message: `${result.successCount}개 피드백을 완료 처리했습니다.`, tone: 'success' })
  }, [feedbackLoadState, feedbackSubmitState.kind])

  const handleDraftChange = useCallback((nextDraft: ResumeDraft) => {
    draftRevisionRef.current += 1
    lastDraftChangeAtRef.current = Date.now()
    setDraft(nextDraft)
    setIsDraftDirty(true)
    setActionFeedback(undefined)
  }, [])

  const addProjectPage = useCallback(() => {
    const nextPageIndex = draft.pages.reduce((highestIndex, page) => Math.max(highestIndex, page.index), -1) + 1
    const nextPage: ResumeDraftPage = {
      content: '',
      index: nextPageIndex,
      project: {
        endDate: '',
        imageUrl: '',
        name: '',
        startDate: '',
        summary: '',
      },
      type: 'PROJECT',
    }

    handleDraftChange({ ...draft, pages: [...draft.pages, nextPage] })
  }, [draft, handleDraftChange])

  const handleMajorChange = useCallback(
    async (majorId: number) => {
      if (majorSubmitState === 'pending') {
        return
      }

      const selectedMajor = majors.find((major) => major.majorId === majorId)

      if (!selectedMajor) {
        setActionFeedback({ message: '선택한 전공을 찾을 수 없습니다.', tone: 'error' })
        return
      }

      const accessToken = getSavedAccessToken()

      if (!accessToken) {
        setActionFeedback({ message: '로그인 후 전공을 변경할 수 있습니다.', tone: 'error' })
        return
      }

      setMajorSubmitState('pending')
      setActionFeedback(undefined)

      const result = await updateUserMajor({ accessToken, majorId })

      setMajorSubmitState('idle')

      if (result.kind !== 'success') {
        setActionFeedback({ message: result.message, tone: 'error' })
        return
      }

      setDraft((currentDraft) => ({ ...currentDraft, headline: selectedMajor.name }))
      setLoadState((currentState) =>
        currentState.kind === 'success'
          ? { kind: 'success', resume: { ...currentState.resume, majorName: selectedMajor.name } }
          : currentState,
      )

      if (userRef.current) {
        userRef.current = { ...userRef.current, major: selectedMajor.name }
      }

      setActionFeedback({ message: '전공을 변경했습니다.', tone: 'success' })
    },
    [majorSubmitState, majors],
  )

  const handleSave = useCallback(
    async (mode: SaveMode) => {
      if (saveSubmitState !== 'idle' || submissionSubmitState !== 'idle') {
        return
      }

      const accessToken = getSavedAccessToken()

      if (!accessToken) {
        setActionFeedback({ message: '로그인 후 이력서를 저장할 수 있습니다.', tone: 'error' })
        return
      }

      const activeResume = loadState.kind === 'success' ? loadState.resume : undefined
      const activeResumeId = activeResume?.id
      const pages = toResumePages(draft, activeResume)
      const savePages = toResumeSavePages(draft, activeResume)
      const saveRevision = draftRevisionRef.current

      setActionFeedback(undefined)
      setSaveSubmitState(mode === 'auto' ? 'auto-save' : mode === 'temporary' ? 'temporary-save' : 'save')

      const saveInput = {
        accessToken,
        email: draft.email,
        introduce: joinIntroduction(draft),
        pages: savePages,
        portfolioUrl: draft.portfolioUrl,
        skills: draft.skills,
      }
      const result = mode === 'manual' ? await saveResume(saveInput) : await autoSaveResume(saveInput)

      if (activeResumeId && viewedResumeIdRef.current !== activeResumeId) {
        setSaveSubmitState('idle')
        return
      }

      if (result.kind !== 'success') {
        setSaveSubmitState('idle')
        setActionFeedback({ message: result.message, tone: 'error' })
        return
      }

      const syncedResumeResult = pages.some((page) => !page.id.trim())
        ? await getResumeById({
            accessToken,
            resumeId: result.resumeId,
          })
        : undefined
      const syncedResume = syncedResumeResult?.kind === 'success' ? syncedResumeResult.resume : undefined

      setSaveSubmitState('idle')

      viewedResumeIdRef.current = result.resumeId
      requestedResumeIdRef.current = result.resumeId
      saveResumeId(result.resumeId)

      if (requestedResumeId !== result.resumeId || requestedMode !== 'edit') {
        router.replace(`/resume?resumeId=${encodeURIComponent(result.resumeId)}&mode=edit`, { scroll: false })
      }

      if (syncedResume) {
        setLoadState({ kind: 'success', resume: syncedResume })
      } else if (activeResume) {
        setLoadState({
          kind: 'success',
          resume: {
            ...activeResume,
            email: draft.email,
            introduce: joinIntroduction(draft),
            pages,
            portfolioUrl: draft.portfolioUrl,
            savedAt: result.savedAt,
            skills: draft.skills,
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

      if (draftRevisionRef.current === saveRevision) {
        setIsDraftDirty(false)
      }

      setActionFeedback({
        message:
          mode === 'auto'
            ? '변경사항을 자동 저장했습니다.'
            : mode === 'temporary'
              ? '이력서를 임시저장했습니다.'
              : '이력서를 저장했습니다.',
        tone: 'success',
      })
    },
    [draft, loadState, requestedMode, requestedResumeId, router, saveSubmitState, submissionSubmitState],
  )

  useEffect(() => {
    if (!isDraftDirty || !isEditing || isResumeActionPending) {
      return
    }

    let timerId = 0

    const scheduleAutoSave = (delay: number) => {
      timerId = window.setTimeout(() => {
        const remainingIdleTime = AUTO_SAVE_IDLE_MS - (Date.now() - lastDraftChangeAtRef.current)

        if (remainingIdleTime > 0) {
          scheduleAutoSave(remainingIdleTime)
          return
        }

        void handleSave('auto')
      }, delay)
    }

    scheduleAutoSave(AUTO_SAVE_IDLE_MS)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [handleSave, isDraftDirty, isEditing, isResumeActionPending])

  return (
    <main className={styles.page}>
      <AppHeader activeItem="resume" items={navigationItems} />

      <section className={`${styles.workspace} ${viewMode === 'feedback' ? styles.withFeedback : ''}`} aria-label="이력서 관리">
        {actionFeedback ? <div className={styles.toastLayer}><Toast variant={actionFeedback.tone}>{actionFeedback.message}</Toast></div> : null}
        <div className={styles.stage} aria-live="polite">
          <div className={styles.topActions}>
            {isEditing ? (
              <>
                <button className={styles.secondaryAction} disabled={isResumeActionPending} onClick={() => void handleSave('temporary')} type="button">
                  {saveSubmitState === 'temporary-save'
                    ? '임시저장 중'
                    : saveSubmitState === 'auto-save'
                      ? '자동 저장 중'
                      : '임시저장'}
                </button>
                <button className={styles.primaryAction} disabled={isResumeActionPending} onClick={() => void handleSave('manual')} type="button">
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
            <button
              className={styles.pageArrow}
              disabled={!canMovePrevious}
              onClick={() => setSpreadStartIndex((currentIndex) => Math.max(0, currentIndex - 1))}
              type="button"
              aria-label="이전 페이지"
            >
              <Icon name="chevron-left" />
            </button>
            <div className={styles.spread} aria-label={isEditing ? '이력서 작성' : '이력서 미리보기'}>
              {visiblePageIndexes.map((pageIndex) =>
                isEditing ? (
                  <ResumeEditorSheet
                    className={styles.documentSheet}
                    draft={draft}
                    isMajorLoading={majorLoadState.kind === 'loading'}
                    isMajorPending={majorSubmitState === 'pending'}
                    key={draft.pages[pageIndex]?.index ?? pageIndex}
                    majors={majors}
                    onChange={handleDraftChange}
                    onMajorChange={(majorId) => void handleMajorChange(majorId)}
                    pageIndex={pageIndex}
                  />
                ) : (
                  <ResumeBookSheet
                    ariaLabel={`${draft.name} 이력서 ${(draft.pages[pageIndex]?.index ?? pageIndex) + 1}쪽`}
                    className={styles.documentSheet}
                    content={toSheetContent(draft, pageIndex)}
                    key={draft.pages[pageIndex]?.index ?? pageIndex}
                  />
                ),
              )}
              {isEditing && spreadStartIndex + 1 >= draft.pages.length ? (
                <button
                  className={`${styles.documentSheet} ${styles.addPageSheet}`}
                  onClick={addProjectPage}
                  type="button"
                  aria-label="프로젝트 페이지 추가"
                >
                  <Icon name="plus" />
                </button>
              ) : null}
            </div>
            <button
              className={styles.pageArrow}
              disabled={!canMoveNext}
              onClick={() => setSpreadStartIndex((currentIndex) => Math.min(draft.pages.length - 1, currentIndex + 1))}
              type="button"
              aria-label="다음 페이지"
            >
              <Icon name="chevron-right" />
            </button>
          </div>

          <p className={styles.pageCount}>
            {Math.min(spreadStartIndex + 2, draft.pages.length)} / {draft.pages.length}
          </p>

          {isEditing ? (
            <div className={styles.editorToolbar} aria-label="이력서 페이지 도구">
              <div className={styles.toolGroup}>
                <button
                  className={styles.iconTool}
                  disabled={!canMovePrevious}
                  onClick={() => setSpreadStartIndex((currentIndex) => Math.max(0, currentIndex - 1))}
                  type="button"
                  aria-label="이전 페이지"
                >
                  <Icon name="chevron-left" />
                </button>
                <button
                  className={styles.iconTool}
                  disabled={!canMoveNext}
                  onClick={() => setSpreadStartIndex((currentIndex) => Math.min(draft.pages.length - 1, currentIndex + 1))}
                  type="button"
                  aria-label="다음 페이지"
                >
                  <Icon name="chevron-right" />
                </button>
              </div>
              <div className={styles.toolGroup}>
                <button
                  className={styles.textTool}
                  onClick={() => document.getElementById(`resume-page-content-${draft.pages[spreadStartIndex]?.index ?? 0}`)?.focus()}
                  type="button"
                  aria-label="텍스트 작성"
                >
                  T
                </button>
                <button className={styles.iconTool} disabled type="button" aria-label="이미지 추가 준비 중">
                  <Icon name="image" />
                </button>
                <button className={styles.iconTool} disabled type="button" aria-label="파일 업로드 준비 중">
                  <Icon name="upload" />
                </button>
              </div>
            </div>
          ) : null}

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

          {userLoadState.kind === 'loading' ? <p className={styles.loadingMessage}>학생 정보를 불러오는 중입니다.</p> : null}
          {loadState.kind === 'loading' ? <p className={styles.loadingMessage}>이력서를 불러오는 중입니다.</p> : null}
          {loadState.kind === 'failure' ? (
            <p className={styles.loadingMessage} role="alert">
              {loadState.message}
            </p>
          ) : null}
          {userLoadState.kind === 'failure' ? (
            <p className={styles.loadingMessage} role="alert">
              {userLoadState.message}
            </p>
          ) : null}
          {majorLoadState.kind === 'failure' ? (
            <p className={styles.loadingMessage} role="alert">
              {majorLoadState.message}
            </p>
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
            <div className={styles.feedbackListHeader}>
              <span>{feedbackLoadState.kind === 'success' ? `${feedbackLoadState.numberOfData}개` : '목록'}</span>
              <button
                className={styles.feedbackBulkAction}
                disabled={feedbackLoadState.kind !== 'success' || pendingFeedbackCount === 0 || isFeedbackSubmitting}
                onClick={() => void handleCompleteAllFeedbacks()}
                type="button"
              >
                {feedbackSubmitState.kind === 'apply-all' ? '처리 중' : '전체 완료 처리'}
              </button>
            </div>
            {feedbackLoadState.kind === 'loading' ? <p className={styles.feedbackPanelMessage}>피드백을 불러오는 중입니다.</p> : null}
            {feedbackLoadState.kind === 'failure' ? (
              <p className={styles.feedbackPanelMessage} role="alert">
                {feedbackLoadState.message}
              </p>
            ) : null}
            {feedbackLoadState.kind === 'success' && feedbackLoadState.feedbacks.length === 0 ? (
              <p className={styles.feedbackPanelMessage}>아직 받은 피드백이 없습니다.</p>
            ) : null}
            {feedbackLoadState.kind === 'success' && feedbackLoadState.feedbacks.length > 0 ? (
              <ul className={styles.feedbackList}>
                {feedbackLoadState.feedbacks.map((item) => {
                  const isOpen = openFeedbackId === item.feedbackId
                  const isCompleted = isCompletedFeedback(item)
                  const isItemSubmitting =
                    feedbackSubmitState.kind === 'item' && feedbackSubmitState.feedbackId === item.feedbackId

                  return (
                    <li className={`${styles.feedbackItem} ${isOpen ? styles.openFeedbackItem : ''}`} key={item.feedbackId}>
                      <button
                        aria-expanded={isOpen}
                        className={styles.feedbackItemButton}
                        onClick={() => setOpenFeedbackId(isOpen ? undefined : item.feedbackId)}
                        type="button"
                      >
                        <span className={styles.feedbackTitle}>
                          <span className={styles.feedbackSummary}>{toFeedbackSummary(item.content)}</span>
                          <span className={styles.feedbackMeta}>{item.teacherName || '선생님'} / {formatFeedbackDate(item.createdAt)}</span>
                        </span>
                        <span className={styles.feedbackStatus} data-status={isCompleted ? 'completed' : 'pending'}>
                          {toFeedbackStatusLabel(item)}
                        </span>
                        <span aria-hidden="true">{isOpen ? '⌃' : '⌄'}</span>
                      </button>
                      {isOpen ? (
                        <div className={styles.feedbackDetail}>
                          <p>{item.content || '내용 없는 피드백입니다.'}</p>
                          <div className={styles.feedbackActions}>
                            <span>
                              {item.pageDeleted ? '삭제된 페이지' : `${item.pageId} 페이지`} / 좌표 {item.x}, {item.y}
                            </span>
                            <button
                              className={styles.feedbackStatusAction}
                              disabled={isFeedbackSubmitting}
                              onClick={() => void handleFeedbackStatusChange(item)}
                              type="button"
                            >
                              {isItemSubmitting ? '처리 중' : isCompleted ? '미반영으로 변경' : '완료 처리'}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </aside>
        ) : null}
      </section>
    </main>
  )
}
