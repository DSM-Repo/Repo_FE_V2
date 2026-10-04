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
  clearSavedResumeId,
  getResumeById,
  getSavedResumeId,
  saveResume,
  saveResumeId,
  uploadResumeImage,
  type Resume,
  type ResumeDetailResult,
  type ResumePage,
  type ResumeSavePage,
  type ResumeSaveProject,
} from '@/features/resume/api'
import { getUserMe, updateUserMajor, type UserMe, type UserMeResult } from '@/features/user/api'
import type { AppHeaderItem, ResumeBookSheetContent } from '@/shared/ui'
import { AppHeader, Icon, PortfolioUrlModal, ResumeBookSheet, Toast } from '@/shared/ui'

import {
  getDepartmentFromSchoolNumber,
  ResumeEditorSheet,
  type ResumeDraft,
  type ResumeImageTarget,
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
  profileImageUrl: '',
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
type ImageUploadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'uploading'; readonly target: ResumeImageTarget }
type FeedbackLoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly feedbacks: readonly FeedbackListItem[]; readonly kind: 'success'; readonly numberOfData: number }
  | { readonly kind: 'failure'; readonly message: string }
type FeedbackSubmitState =
  | { readonly kind: 'apply-all' }
  | { readonly feedbackId: string; readonly kind: 'item' }
  | { readonly kind: 'idle' }
type PortfolioUrlModalState =
  | { readonly kind: 'closed' }
  | { readonly errorMessage?: string; readonly kind: 'open' }

function toInitialViewMode(mode: string | null): ViewMode {
  if (mode === 'edit') {
    return 'edit'
  }

  if (mode === 'feedback') {
    return 'feedback'
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
    profileImageUrl: draft.profileImageUrl,
    ...(sheetProject ? { project: sheetProject } : {}),
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
    profileImageUrl: resume.profileImageUrl,
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
    profileImageUrl: input.draft.profileImageUrl,
    savedAt: input.savedAt,
    skills: input.draft.skills,
    submissionStatus: 'ONGOING',
  }
}

function toFailureMessage(result: Exclude<ResumeDetailResult, { readonly kind: 'success' }>) {
  return result.message
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

function toNormalizedPortfolioUrl(value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return ''
  }

  try {
    const url = new URL(trimmedValue)

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.href
    }
  } catch (error) {
    if (!(error instanceof TypeError)) {
      throw error
    }
  }

  return undefined
}

export function StudentResumePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedResumeId = searchParams.get('resumeId') ?? ''
  const requestedMode = searchParams.get('mode')
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'idle' })
  const [viewMode, setViewMode] = useState<ViewMode>(() => toInitialViewMode(requestedMode))
  const [draft, setDraft] = useState<ResumeDraft>(defaultResumeDraft)
  const [saveSubmitState, setSaveSubmitState] = useState<SaveSubmitState>('idle')
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>()
  const [userLoadState, setUserLoadState] = useState<UserLoadState>({ kind: 'loading' })
  const [majorLoadState, setMajorLoadState] = useState<MajorLoadState>({ kind: 'loading' })
  const [majorSubmitState, setMajorSubmitState] = useState<MajorSubmitState>('idle')
  const [imageUploadState, setImageUploadState] = useState<ImageUploadState>({ kind: 'idle' })
  const [majors, setMajors] = useState<readonly Major[]>([])
  const [isDraftDirty, setIsDraftDirty] = useState(false)
  const [feedbackLoadState, setFeedbackLoadState] = useState<FeedbackLoadState>({ kind: 'idle' })
  const [feedbackSubmitState, setFeedbackSubmitState] = useState<FeedbackSubmitState>({ kind: 'idle' })
  const [portfolioUrlModalState, setPortfolioUrlModalState] = useState<PortfolioUrlModalState>({ kind: 'closed' })
  const [openFeedbackId, setOpenFeedbackId] = useState<string>()
  const [spreadStartIndex, setSpreadStartIndex] = useState(0)
  const userRef = useRef<UserMe | undefined>(undefined)
  const viewedResumeIdRef = useRef<string | undefined>(undefined)
  const documentSessionRef = useRef(0)
  const loadRequestRef = useRef(0)
  const attemptedResumeIdRef = useRef('')
  const draftRevisionRef = useRef(0)
  const lastDraftChangeAtRef = useRef(0)
  const savePendingRef = useRef(false)
  const manualSaveRequestedRef = useRef(false)
  const autoSaveTimerRef = useRef<number | undefined>(undefined)
  const autoSaveGenerationRef = useRef(0)
  const pendingSaveModeRef = useRef<SaveMode | undefined>(undefined)
  const saveOperationRef = useRef(0)

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

    const loadRequest = ++loadRequestRef.current
    attemptedResumeIdRef.current = trimmedResumeId
    documentSessionRef.current += 1
    setIsDraftDirty(false)
    setImageUploadState({ kind: 'idle' })
    setSaveSubmitState('idle')
    setPortfolioUrlModalState({ kind: 'closed' })
    setSpreadStartIndex(0)

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

    if (loadRequestRef.current !== loadRequest) {
      return
    }

    if (result.kind === 'success') {
      viewedResumeIdRef.current = result.resume.id
      saveResumeId(result.resume.id)
      setDraft(() => {
        const resumeDraft = toResumeDraft(result.resume)
        return userRef.current ? applyUserToDraft(resumeDraft, userRef.current) : resumeDraft
      })
      setLoadState({ kind: 'success', resume: result.resume })

      if (syncUrl) {
        router.replace(`/resume?resumeId=${encodeURIComponent(result.resume.id)}`, { scroll: false })
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

    if (resumeIdToLoad && viewedResumeIdRef.current !== resumeIdToLoad) {
      void loadResume(resumeIdToLoad, !requestedResumeId)
    }

    return () => {
      loadRequestRef.current += 1
      documentSessionRef.current += 1
    }
  }, [loadResume, requestedResumeId])

  const resume = loadState.kind === 'success' ? loadState.resume : undefined
  const isResumeReady = loadState.kind === 'success'
    ? !requestedResumeId || loadState.resume.id === requestedResumeId
    : loadState.kind === 'idle' && !requestedResumeId && !getSavedResumeId()
  const isImageUploading = imageUploadState.kind === 'uploading'
  const isResumeActionPending = saveSubmitState !== 'idle' || majorSubmitState === 'pending' || isImageUploading
  const isEditing = isResumeReady && (viewMode === 'edit' || viewMode === 'feedback')
  const hasWrittenProject = draft.pages.some((page) => page.type === 'PROJECT' && Boolean(
    page.project?.name.trim() || page.project?.summary.trim() || page.content.trim(),
  ))
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

  const handleDraftChange = useCallback((nextDraft: ResumeDraft | ((currentDraft: ResumeDraft) => ResumeDraft)) => {
    draftRevisionRef.current += 1
    lastDraftChangeAtRef.current = Date.now()
    autoSaveGenerationRef.current += 1
    setDraft(nextDraft)
    setIsDraftDirty(true)
    setActionFeedback(undefined)
  }, [])

  const handlePortfolioUrlConfirm = useCallback(
    (value: string) => {
      const normalizedPortfolioUrl = toNormalizedPortfolioUrl(value)

      if (normalizedPortfolioUrl === undefined) {
        setPortfolioUrlModalState({
          errorMessage: 'http:// 또는 https://로 시작하는 URL을 입력해주세요.',
          kind: 'open',
        })
        return
      }

      if (normalizedPortfolioUrl.length > 106) {
        setPortfolioUrlModalState({
          errorMessage: 'QR 코드로 만들 URL은 106자 이하로 입력해주세요.',
          kind: 'open',
        })
        return
      }

      handleDraftChange({ ...draft, portfolioUrl: normalizedPortfolioUrl })
      setPortfolioUrlModalState({ kind: 'closed' })
      setActionFeedback({
        message: normalizedPortfolioUrl ? 'URL을 QR 코드로 추가했습니다.' : '포트폴리오 URL을 비웠습니다.',
        tone: 'success',
      })
    },
    [draft, handleDraftChange],
  )

  const handleCancelEditing = useCallback(() => {
    documentSessionRef.current += 1
    draftRevisionRef.current += 1
    setImageUploadState({ kind: 'idle' })
    setPortfolioUrlModalState({ kind: 'closed' })
    setSpreadStartIndex(0)
    if (loadState.kind === 'success') {
      const resumeDraft = toResumeDraft(loadState.resume)
      setDraft(userRef.current ? applyUserToDraft(resumeDraft, userRef.current) : resumeDraft)
    } else {
      setDraft(userRef.current ? applyUserToDraft(defaultResumeDraft, userRef.current) : defaultResumeDraft)
    }

    setActionFeedback(undefined)
    setFeedbackLoadState({ kind: 'idle' })
    setIsDraftDirty(false)
    setOpenFeedbackId(undefined)
    setViewMode('view')
  }, [loadState])

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

  const handleImageUpload = useCallback(
    async ({ file, target }: { readonly file: File; readonly target: ResumeImageTarget }) => {
      if (imageUploadState.kind !== 'idle') {
        return
      }

      const accessToken = getSavedAccessToken()

      if (!accessToken) {
        setActionFeedback({ message: '로그인 후 이미지를 업로드할 수 있습니다.', tone: 'error' })
        return
      }

      setActionFeedback(undefined)
      setImageUploadState({ kind: 'uploading', target })
      const documentSession = documentSessionRef.current

      const result = await uploadResumeImage({ accessToken, image: file })

      if (documentSessionRef.current !== documentSession) {
        return
      }

      setImageUploadState({ kind: 'idle' })

      if (result.kind !== 'success') {
        setActionFeedback({ message: result.message, tone: 'error' })
        return
      }

      handleDraftChange((currentDraft) =>
        target === 'profile'
          ? { ...currentDraft, profileImageUrl: result.imageUrl }
          : {
              ...currentDraft,
              pages: currentDraft.pages.map((page, index) =>
                index === target.pageIndex
                  ? {
                      ...page,
                      project: {
                        ...(page.project ?? { endDate: '', imageUrl: '', name: '', startDate: '', summary: '' }),
                        imageUrl: result.imageUrl,
                      },
                    }
                  : page,
              ),
            },
      )
      setActionFeedback({ message: '이미지를 업로드했습니다.', tone: 'success' })
    },
    [handleDraftChange, imageUploadState.kind],
  )

  const handleInlineImagePasteUpload = useCallback(async (file: File) => {
    const accessToken = getSavedAccessToken()

    if (!accessToken) {
      setActionFeedback({ message: '로그인 후 붙여넣은 이미지를 업로드할 수 있습니다.', tone: 'error' })
      return undefined
    }

    const documentSession = documentSessionRef.current
    const result = await uploadResumeImage({ accessToken, image: file })

    if (documentSessionRef.current !== documentSession) {
      return undefined
    }

    if (result.kind !== 'success') {
      setActionFeedback({ message: result.message, tone: 'error' })
      return undefined
    }

    setActionFeedback({ message: '붙여넣은 이미지를 업로드했습니다.', tone: 'success' })
    return result.imageUrl
  }, [])

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
      if (mode === 'auto' && (manualSaveRequestedRef.current || pendingSaveModeRef.current === 'manual')) {
        return
      }

      if (!isResumeReady || isResumeActionPending || savePendingRef.current) {
        return
      }

      if (mode === 'manual') {
        autoSaveGenerationRef.current += 1
        if (autoSaveTimerRef.current !== undefined) {
          window.clearTimeout(autoSaveTimerRef.current)
          autoSaveTimerRef.current = undefined
        }
      }

      const accessToken = getSavedAccessToken()

      if (!accessToken) {
        savePendingRef.current = false
        if (mode === 'manual') {
          manualSaveRequestedRef.current = false
        }
        setActionFeedback({ message: '로그인 후 이력서를 저장할 수 있습니다.', tone: 'error' })
        return
      }

      const activeResume = loadState.kind === 'success' ? loadState.resume : undefined
      const activeResumeId = activeResume?.id
      const pages = toResumePages(draft, activeResume)
      const savePages = toResumeSavePages(draft, activeResume)
      const saveRevision = draftRevisionRef.current
      const documentSession = documentSessionRef.current
      const saveOperation = ++saveOperationRef.current

      savePendingRef.current = true
      pendingSaveModeRef.current = mode
      setActionFeedback(undefined)
      setSaveSubmitState(mode === 'auto' ? 'auto-save' : mode === 'temporary' ? 'temporary-save' : 'save')

      const saveInput = {
        accessToken,
        email: draft.email,
        introduce: joinIntroduction(draft),
        pages: savePages,
        portfolioUrl: draft.portfolioUrl,
        profileImageUrl: draft.profileImageUrl,
        skills: draft.skills,
      }
      const result = mode === 'manual' ? await saveResume(saveInput) : await autoSaveResume(saveInput)

      if (saveOperationRef.current !== saveOperation || documentSessionRef.current !== documentSession || (activeResumeId && viewedResumeIdRef.current !== activeResumeId)) {
        if (saveOperationRef.current === saveOperation) {
          savePendingRef.current = false
          pendingSaveModeRef.current = undefined
          if (mode === 'manual') {
            manualSaveRequestedRef.current = false
          }
          setSaveSubmitState('idle')
        }
        return
      }

      if (result.kind !== 'success') {
        savePendingRef.current = false
        pendingSaveModeRef.current = undefined
        if (mode === 'manual') {
          manualSaveRequestedRef.current = false
        }
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

      if (saveOperationRef.current !== saveOperation || documentSessionRef.current !== documentSession) {
        if (saveOperationRef.current === saveOperation) {
          savePendingRef.current = false
          pendingSaveModeRef.current = undefined
          if (mode === 'manual') {
            manualSaveRequestedRef.current = false
          }
          setSaveSubmitState('idle')
        }
        return
      }

      savePendingRef.current = false
      pendingSaveModeRef.current = undefined
      if (mode === 'manual') {
        manualSaveRequestedRef.current = false
      }
      setSaveSubmitState('idle')

      viewedResumeIdRef.current = result.resumeId
      saveResumeId(result.resumeId)

      const hasNewChanges = draftRevisionRef.current !== saveRevision
      const shouldEnterView = (mode === 'manual' && !hasNewChanges) || viewMode === 'view'
      const nextMode = shouldEnterView ? null : 'edit'
      const nextUrl =
        nextMode === 'edit'
          ? `/resume?resumeId=${encodeURIComponent(result.resumeId)}&mode=edit`
          : `/resume?resumeId=${encodeURIComponent(result.resumeId)}`

      window.history.replaceState(null, '', nextUrl)

      if (syncedResume) {
        setLoadState({ kind: 'success', resume: syncedResume })
        setDraft((currentDraft) => ({
          ...currentDraft,
          pages: currentDraft.pages.map((page) => {
            const savedPage = syncedResume.pages.find((candidate) => candidate.index === page.index && candidate.type === page.type)
            return savedPage ? { ...page, id: savedPage.id } : page
          }),
        }))
      } else if (activeResume) {
        setLoadState({
          kind: 'success',
          resume: {
            ...activeResume,
            email: draft.email,
            introduce: joinIntroduction(draft),
            pages,
            portfolioUrl: draft.portfolioUrl,
            profileImageUrl: draft.profileImageUrl,
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

      if (!hasNewChanges) {
        setIsDraftDirty(false)
      }

      if (shouldEnterView && mode === 'manual') {
        setFeedbackLoadState({ kind: 'idle' })
        setOpenFeedbackId(undefined)
        setViewMode('view')
      }

      setActionFeedback({
        message:
          syncedResumeResult && syncedResumeResult.kind !== 'success'
            ? '이력서는 저장했지만 페이지 정보를 다시 불러오지 못했습니다. 다시 저장해 재시도해주세요.'
            : hasNewChanges
              ? '이전 내용은 저장했습니다. 저장되지 않은 변경사항이 있습니다.'
              : mode === 'auto'
            ? '변경사항을 자동 저장했습니다.'
            : mode === 'temporary'
              ? '이력서를 임시저장했습니다.'
              : '이력서를 저장했습니다.',
        tone: syncedResumeResult && syncedResumeResult.kind !== 'success' ? 'error' : 'success',
      })
    },
    [draft, isResumeActionPending, isResumeReady, loadState, viewMode],
  )

  useEffect(() => {
    if (!isDraftDirty || !isEditing || isResumeActionPending || savePendingRef.current) {
      return
    }

    let timerId = 0
    const scheduledGeneration = autoSaveGenerationRef.current

    const scheduleAutoSave = (delay: number) => {
      timerId = window.setTimeout(() => {
        autoSaveTimerRef.current = undefined
        if (scheduledGeneration !== autoSaveGenerationRef.current || manualSaveRequestedRef.current || savePendingRef.current) {
          return
        }
        const remainingIdleTime = AUTO_SAVE_IDLE_MS - (Date.now() - lastDraftChangeAtRef.current)

        if (remainingIdleTime > 0) {
          scheduleAutoSave(remainingIdleTime)
          return
        }

        void handleSave('auto')
      }, delay)
      autoSaveTimerRef.current = timerId
    }

    scheduleAutoSave(Math.max(0, AUTO_SAVE_IDLE_MS - (Date.now() - lastDraftChangeAtRef.current)))

    return () => {
      window.clearTimeout(timerId)
      if (autoSaveTimerRef.current === timerId) {
        autoSaveTimerRef.current = undefined
      }
    }
  }, [handleSave, isDraftDirty, isEditing, isResumeActionPending])

  return (
    <main className={styles.page}>
      <AppHeader activeItem="resume" items={navigationItems} showLogout />

      <section className={`${styles.workspace} ${viewMode === 'feedback' ? styles.withFeedback : ''}`} aria-label="이력서 관리">
        {actionFeedback ? <div className={styles.toastLayer}><Toast variant={actionFeedback.tone}>{actionFeedback.message}</Toast></div> : null}
        <div className={styles.stage} aria-live="polite">
          <div className={`${styles.topActions} ${loadState.kind === 'failure' ? styles.failureActions : ''}`}>
              <button
                className={styles.secondaryAction}
                disabled={!isResumeReady || (isEditing && (saveSubmitState !== 'idle' || majorSubmitState === 'pending'))}
                onClick={isEditing ? handleCancelEditing : () => setViewMode('edit')}
                type="button"
              >
                {isEditing ? '작성 취소' : '이력서 수정하기'}
              </button>
              <button className={styles.primaryAction} disabled={!isResumeReady || isResumeActionPending} onClick={() => { manualSaveRequestedRef.current = true; void handleSave('manual') }} type="button">
                {saveSubmitState === 'save' ? '저장 중' : '저장'}
              </button>
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
                    imageUploadTarget={imageUploadState.kind === 'uploading' ? imageUploadState.target : undefined}
                    isMajorLoading={majorLoadState.kind === 'loading'}
                    isMajorPending={majorSubmitState === 'pending'}
                    isUploadingImage={isImageUploading}
                    key={draft.pages[pageIndex]?.index ?? pageIndex}
                    majors={majors}
                    onChange={handleDraftChange}
                    onInlineImagePasteUpload={handleInlineImagePasteUpload}
                    onImageUpload={handleImageUpload}
                    onMajorChange={(majorId) => void handleMajorChange(majorId)}
                    onPortfolioUrlClick={() => setPortfolioUrlModalState({ kind: 'open' })}
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
              {isEditing && hasWrittenProject && spreadStartIndex + 1 >= draft.pages.length ? (
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

          {portfolioUrlModalState.kind === 'open' ? (
            <div className={styles.modalOverlay}>
              <PortfolioUrlModal
                defaultValue={draft.portfolioUrl}
                errorMessage={portfolioUrlModalState.errorMessage}
                onCancel={() => setPortfolioUrlModalState({ kind: 'closed' })}
                onConfirm={handlePortfolioUrlConfirm}
              />
            </div>
          ) : null}

          {userLoadState.kind === 'loading' ? <p className={styles.loadingMessage}>학생 정보를 불러오는 중입니다.</p> : null}
          {loadState.kind === 'loading' ? <p className={styles.loadingMessage}>이력서를 불러오는 중입니다.</p> : null}
          {loadState.kind === 'failure' ? (
            <p className={styles.loadingMessage} role="alert">
              {loadState.message}
              <button onClick={() => void loadResume(attemptedResumeIdRef.current, !requestedResumeId)} type="button">
                이력서 다시 불러오기
              </button>
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
