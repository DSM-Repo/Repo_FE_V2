'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { getSavedAccessToken } from '@/features/auth/api'
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
  updateResumeVisibility,
  type Resume,
  type ResumeDetailResult,
  type ResumePage,
  type ResumeSavePage,
  type ResumeSaveProject,
  type ResumeSubmissionResult,
  type ResumeVisibilityResult,
} from '@/features/resume/api'
import { getUserMe, updateUserMajor, type UserMe, type UserMeResult } from '@/features/user/api'
import type { AppHeaderItem, ResumeBookSheetContent } from '@/shared/ui'
import { AppHeader, Icon, ResumeBookSheet, Toast } from '@/shared/ui'

import { ResumeEditorSheet, type ResumeDraft } from './ResumeEditorSheet'
import styles from './page.module.css'

const navigationItems = [
  { href: '/home', label: '홈', value: 'home' },
  { href: '/resume', label: '이력서 관리', value: 'resume' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

const AUTO_SAVE_IDLE_MS = 180_000

const defaultResumeDraft = {
  activities: [],
  contests: [],
  email: '',
  headline: '전공미정',
  introTitle: '',
  majorName: '',
  name: '',
  pageContents: ['', ''],
  portfolioUrl: '',
  projectEndDate: '',
  projectImageUrl: '',
  projectStartDate: '',
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

function toResumeBookSheetContent(resume: Resume, draft: ResumeDraft, pageIndex: number): ResumeBookSheetContent {
  const page = resume.pages.find((resumePage) => resumePage.index === pageIndex) ?? resume.pages[pageIndex] ?? resume.pages[0]
  const project = page?.project

  return {
    activities: [],
    contests: project?.summary ? [project.summary] : [],
    email: resume.email,
    headline: draft.majorName,
    introTitle: resume.introduce,
    introduce: '',
    majorName: draft.headline,
    name: draft.name || resume.name,
    pageContent: page?.content,
    portfolioUrl: resume.portfolioUrl,
    projects: project?.name ? [project.name] : [],
    skills: resume.skills,
  }
}

function toDraftSheetContent(draft: ResumeDraft, pageIndex: 0 | 1): ResumeBookSheetContent {
  return {
    activities: draft.activities,
    contests: draft.contests,
    email: draft.email,
    headline: draft.headline,
    introTitle: draft.introTitle,
    introduce: '',
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
  const project = secondPage?.project

  return {
    ...defaultResumeDraft,
    contests: project?.summary ? [project.summary] : [],
    email: resume.email,
    headline: resume.majorName || '전공미정',
    introTitle: resume.introduce,
    majorName: '',
    name: resume.name,
    pageContents: [firstPage?.content ?? '', secondPage?.content ?? ''],
    portfolioUrl: resume.portfolioUrl,
    projectEndDate: project?.endDate ?? '',
    projectImageUrl: project?.imageUrl ?? '',
    projectStartDate: project?.startDate ?? '',
    projects: project?.name ? [project.name] : [],
    skills: resume.skills,
  }
}

function toSheetSpreadContent(resume: Resume | undefined, draft: ResumeDraft): readonly [ResumeBookSheetContent, ResumeBookSheetContent] {
  if (!resume) {
    return [toDraftSheetContent(draft, 0), toDraftSheetContent(draft, 1)]
  }

  return [toResumeBookSheetContent(resume, draft, 0), toResumeBookSheetContent(resume, draft, 1)]
}

function toResumePages(draft: ResumeDraft, resume?: Resume): readonly ResumePage[] {
  const updatedPages = draft.pageContents.map((content, index): ResumePage => {
    const existingPage = resume?.pages.find((resumePage) => resumePage.index === index)
    const type = index === 1 ? 'PROJECT' : 'PROFILE'

    if (type === 'PROJECT') {
      return {
        content,
        id: existingPage?.id ?? '',
        index,
        project: {
          endDate: draft.projectEndDate,
          imageUrl: draft.projectImageUrl,
          name: draft.projects[0] ?? '',
          startDate: draft.projectStartDate,
          summary: draft.contests[0] ?? '',
        },
        type,
      }
    }

    return {
      content,
      id: existingPage?.id ?? '',
      index,
      type,
    }
  })

  const updatedPageIndexes = new Set(updatedPages.map((page) => page.index))
  const preservedPages = resume?.pages.filter((page) => !updatedPageIndexes.has(page.index)) ?? []

  return [...updatedPages, ...preservedPages]
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
  const updatedPages = draft.pageContents.map((content, index): ResumeSavePage => {
    const existingPage = resume?.pages.find((resumePage) => resumePage.index === index)
    const type = index === 1 ? 'PROJECT' : 'PROFILE'

    if (type === 'PROJECT') {
      const project = toResumeSaveProject({
        endDate: draft.projectEndDate,
        imageUrl: draft.projectImageUrl,
        name: draft.projects[0],
        startDate: draft.projectStartDate,
        summary: draft.contests[0],
      })

      return {
        content,
        ...(existingPage?.id ? { id: existingPage.id } : {}),
        index,
        ...(project ? { project } : {}),
        type,
      }
    }

    return {
      content,
      ...(existingPage?.id ? { id: existingPage.id } : {}),
      index,
      type,
    }
  })

  const updatedPageIndexes = new Set(updatedPages.map((page) => page.index))
  const preservedPages =
    resume?.pages
      .filter((page) => !updatedPageIndexes.has(page.index))
      .map((page): ResumeSavePage => {
        const project = page.project ? toResumeSaveProject(page.project) : undefined

        return {
          content: page.content,
          id: page.id,
          index: page.index,
          ...(project ? { project } : {}),
          type: page.type,
        }
      }) ?? []

  return [...updatedPages, ...preservedPages]
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
    introduce: input.draft.introTitle,
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

function toVisibilityFailureMessage(result: Exclude<ResumeVisibilityResult, { readonly kind: 'success' }>) {
  return result.message
}

function toSubmissionFailureMessage(result: Exclude<ResumeSubmissionResult, { readonly kind: 'success' }>) {
  return result.message
}

function isSubmittedResume(resume: Resume) {
  return resume.submissionStatus !== 'ONGOING'
}

function toUserFailureMessage(result: Exclude<UserMeResult, { readonly kind: 'success' }>) {
  return result.message
}

function applyUserToDraft(draft: ResumeDraft, user: UserMe): ResumeDraft {
  return {
    ...draft,
    headline: user.major ?? '전공미정',
    introTitle: user.introduce,
    majorName: user.classInfo.schoolNumber,
    name: user.name,
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
  const [visibilitySubmitState, setVisibilitySubmitState] = useState<VisibilitySubmitState>('idle')
  const [submissionSubmitState, setSubmissionSubmitState] = useState<SubmissionSubmitState>('idle')
  const [saveSubmitState, setSaveSubmitState] = useState<SaveSubmitState>('idle')
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>()
  const [userLoadState, setUserLoadState] = useState<UserLoadState>({ kind: 'loading' })
  const [majorLoadState, setMajorLoadState] = useState<MajorLoadState>({ kind: 'loading' })
  const [majorSubmitState, setMajorSubmitState] = useState<MajorSubmitState>('idle')
  const [majors, setMajors] = useState<readonly Major[]>([])
  const [isDraftDirty, setIsDraftDirty] = useState(false)
  const userRef = useRef<UserMe | undefined>(undefined)
  const viewedResumeIdRef = useRef<string | undefined>(undefined)
  const requestedResumeIdRef = useRef<string | undefined>(undefined)
  const draftRevisionRef = useRef(0)

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

  const changeVisibility = async () => {
    if (
      loadState.kind !== 'success' ||
      visibilitySubmitState === 'pending' ||
      submissionSubmitState !== 'idle' ||
      saveSubmitState !== 'idle'
    ) {
      return
    }

    const accessToken = getSavedAccessToken()

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
      tone: 'success',
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
  const sheetContents = toSheetSpreadContent(resume, draft)
  const isResumeActionPending =
    visibilitySubmitState === 'pending' || submissionSubmitState !== 'idle' || saveSubmitState !== 'idle' || majorSubmitState === 'pending'
  const isEditing = viewMode === 'edit' || viewMode === 'feedback'

  const handleDraftChange = useCallback((nextDraft: ResumeDraft) => {
    draftRevisionRef.current += 1
    setDraft(nextDraft)
    setIsDraftDirty(true)
    setActionFeedback(undefined)
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
      if (saveSubmitState !== 'idle' || visibilitySubmitState === 'pending' || submissionSubmitState !== 'idle') {
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
        introduce: draft.introTitle,
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
            introduce: draft.introTitle,
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
    [draft, loadState, requestedMode, requestedResumeId, router, saveSubmitState, submissionSubmitState, visibilitySubmitState],
  )

  useEffect(() => {
    if (!isDraftDirty || !isEditing || isResumeActionPending) {
      return
    }

    const timerId = window.setTimeout(() => {
      void handleSave('auto')
    }, AUTO_SAVE_IDLE_MS)

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
            <button className={styles.pageArrow} type="button" aria-label="이전 페이지">
              <Icon name="chevron-left" />
            </button>
            <div className={styles.spread} aria-label={isEditing ? '이력서 작성' : '이력서 미리보기'}>
              {isEditing ? (
                <>
                  <ResumeEditorSheet
                    className={styles.documentSheet}
                    draft={draft}
                    isMajorLoading={majorLoadState.kind === 'loading'}
                    isMajorPending={majorSubmitState === 'pending'}
                    majors={majors}
                    onChange={handleDraftChange}
                    onMajorChange={(majorId) => void handleMajorChange(majorId)}
                    pageIndex={0}
                  />
                  <ResumeEditorSheet className={styles.documentSheet} draft={draft} onChange={handleDraftChange} pageIndex={1} />
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
