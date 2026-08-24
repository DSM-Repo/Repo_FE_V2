'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import type { AppHeaderItem, ToastVariant } from '@/shared/ui'
import { AppHeader, Button, Feedback, FeedbackBalloon, ResumeBookSheet, Switch, Toast } from '@/shared/ui'

import styles from './page.module.css'

const navigationItems = [
  { href: '/majors', label: '전공 관리', value: 'majors' },
  { href: '/students', label: '학생 관리', value: 'students' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

type Notice = {
  readonly message: string
  readonly variant: ToastVariant
}

const totalPages = 5

const feedbackItems = Array.from({ length: 8 }, (_, index) => ({
  content: index === 1 ? '피드백에 대한 상세 내용' : '학생에게 전달할 피드백 상세 내용입니다.',
  createdAtLabel: '1일 전',
  id: index + 1,
  title: '피드백 제목',
}))

export default function TeacherStudentReviewPage() {
  const searchParams = useSearchParams()
  const [currentPage, setCurrentPage] = useState(2)
  const [isFeedbackMode, setIsFeedbackMode] = useState(false)
  const [isFeedbackVisible, setIsFeedbackVisible] = useState(false)
  const [isResumePublic, setIsResumePublic] = useState(false)
  const [expandedFeedbackId, setExpandedFeedbackId] = useState<number | null>(2)
  const [notice, setNotice] = useState<Notice | null>(null)
  const noticeTimerId = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (noticeTimerId.current) {
        clearTimeout(noticeTimerId.current)
      }
    }
  }, [])

  const showNotice = (nextNotice: Notice) => {
    if (noticeTimerId.current) {
      clearTimeout(noticeTimerId.current)
    }

    setNotice(nextNotice)
    noticeTimerId.current = setTimeout(() => {
      setNotice(null)
      noticeTimerId.current = null
    }, 2500)
  }

  const movePage = (offset: number) => {
    setCurrentPage((page) => Math.min(totalPages, Math.max(1, page + offset)))
  }

  const startFeedbackMode = () => {
    setIsFeedbackMode(true)
    setIsFeedbackVisible(true)
  }

  const saveFeedback = (temporary: boolean) => {
    showNotice({
      message: temporary ? '피드백을 임시저장했습니다.' : '피드백을 저장했습니다.',
      variant: 'success',
    })

    if (!temporary) {
      setIsFeedbackMode(false)
    }
  }

  const changeResumeVisibility = (checked: boolean) => {
    if (searchParams.get('error') === 'visibility') {
      showNotice({ message: '이력서 공개 상태 변경에 실패하였습니다.', variant: 'error' })
      return
    }

    setIsResumePublic(checked)
    showNotice({ message: '이력서 공개 상태를 변경했습니다.', variant: 'success' })
  }

  return (
    <main className={styles.page} data-feedback-panel-open={isFeedbackVisible ? 'true' : 'false'}>
      <AppHeader activeItem="students" items={navigationItems} />

      <section className={styles.workspace} aria-label="학생 포트폴리오 검토">
        {notice ? (
          <div className={styles.toastLayer}>
            <Toast variant={notice.variant}>{notice.message}</Toast>
          </div>
        ) : null}

        {isFeedbackMode ? (
          <div className={styles.saveActions} aria-label="피드백 저장">
            <Button variant="bordered-dark" onClick={() => saveFeedback(true)}>
              임시저장
            </Button>
            <Button onClick={() => saveFeedback(false)}>저장</Button>
          </div>
        ) : null}

        <div className={styles.viewer}>
          <button
            aria-label="이전 페이지"
            className={`${styles.pageArrow} ${styles.previousArrow}`}
            disabled={currentPage === 1}
            type="button"
            onClick={() => movePage(-1)}
          >
            ‹
          </button>

          <div className={styles.sheets} aria-label="최하은 포트폴리오 문서 페이지">
            <div className={styles.sheetFrame}>
              <ResumeBookSheet ariaLabel="최하은 포트폴리오 왼쪽 페이지" />
              {isFeedbackVisible ? (
                <FeedbackBalloon className={`${styles.feedbackMarker} ${styles.feedbackMarkerLeft}`} title="활동 내용을 조금 더 구체적으로 작성해주세요." />
              ) : null}
            </div>
            <div className={styles.sheetFrame}>
              <ResumeBookSheet ariaLabel="최하은 포트폴리오 오른쪽 페이지" />
              {isFeedbackVisible ? (
                <>
                  <FeedbackBalloon className={`${styles.feedbackMarker} ${styles.feedbackMarkerTop}`} title="자기소개에서 지원 직무 강점을 강조해주세요." />
                  <FeedbackBalloon className={`${styles.feedbackMarker} ${styles.feedbackMarkerBottom}`} title="프로젝트에서 맡은 역할을 추가해주세요." />
                </>
              ) : null}
            </div>
          </div>

          <button
            aria-label="다음 페이지"
            className={`${styles.pageArrow} ${styles.nextArrow}`}
            disabled={currentPage === totalPages}
            type="button"
            onClick={() => movePage(1)}
          >
            ›
          </button>
        </div>

        <p className={styles.pageIndicator} aria-label="현재 페이지">
          <strong>{currentPage}</strong> / {totalPages}
        </p>

        <div className={styles.bottomControls}>
          <div className={styles.compactPager} aria-label="페이지 이동">
            <button aria-label="이전 페이지" disabled={currentPage === 1} type="button" onClick={() => movePage(-1)}>
              ‹
            </button>
            <button aria-label="다음 페이지" disabled={currentPage === totalPages} type="button" onClick={() => movePage(1)}>
              ›
            </button>
          </div>
          <Button className={styles.feedbackButton} onClick={startFeedbackMode}>
            피드백 추가 <span aria-hidden="true">＋</span>
          </Button>
        </div>

        <div className={styles.reviewSettings} aria-label="학생 이력서 검토 설정">
          <label className={styles.settingRow}>
            <span>이력서 공개</span>
            <span className={styles.switchFrame}>
              <Switch aria-label="이력서 공개" checked={isResumePublic} onCheckedChange={changeResumeVisibility} />
            </span>
          </label>
          <label className={styles.settingRow}>
            <span>피드백 보기</span>
            <span className={styles.switchFrame}>
              <Switch aria-label="피드백 보기" checked={isFeedbackVisible} onCheckedChange={setIsFeedbackVisible} />
            </span>
          </label>
        </div>

        {isFeedbackVisible ? (
          <aside className={styles.feedbackPanel} aria-labelledby="feedback-panel-title">
            <header className={styles.feedbackPanelHeader}>
              <h2 id="feedback-panel-title">피드백 목록</h2>
              <button
                aria-label="피드백 목록 닫기"
                className={styles.feedbackPanelClose}
                type="button"
                onClick={() => setIsFeedbackVisible(false)}
              >
                ×
              </button>
            </header>

            <div className={styles.feedbackPanelToolbar}>
              <button type="button">선택하기</button>
            </div>

            <div className={styles.feedbackList}>
              {feedbackItems.map((feedback) => (
                <Feedback
                  className={styles.feedbackItem}
                  content={feedback.content}
                  createdAtLabel={feedback.createdAtLabel}
                  expanded={expandedFeedbackId === feedback.id}
                  key={feedback.id}
                  title={feedback.title}
                  onExpandedChange={(expanded) => setExpandedFeedbackId(expanded ? feedback.id : null)}
                />
              ))}
            </div>
          </aside>
        ) : null}
      </section>
    </main>
  )
}
