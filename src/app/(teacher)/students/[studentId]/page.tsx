'use client'

import type { AppHeaderItem } from '@/shared/ui'
import { AppHeader, Button, Switch } from '@/shared/ui'

import styles from './page.module.css'

const navigationItems = [
  { href: '/majors', label: '전공 관리', value: 'majors' },
  { href: '/students', label: '학생 관리', value: 'students' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

export default function TeacherStudentReviewPage() {
  return (
    <main className={styles.page} data-feedback-panel-open="false">
      <AppHeader activeItem="students" items={navigationItems} />

      <section className={styles.workspace} aria-label="학생 포트폴리오 검토">
        <div className={styles.viewer} data-document-empty="true">
          <div
            aria-describedby="teacher-resume-api-notice"
            aria-label="학생 포트폴리오 문서 페이지"
            className={styles.documentEmpty}
          >
            <strong>학생 이력서를 불러올 수 없습니다.</strong>
            <span id="teacher-resume-api-notice">
              교사가 학생의 이력서 본문을 조회하는 API가 아직 제공되지 않았습니다.
            </span>
          </div>
        </div>

        <div className={styles.bottomControls}>
          <Button aria-describedby="teacher-resume-api-notice" className={styles.feedbackButton} disabled>
            피드백 추가 <span aria-hidden="true">＋</span>
          </Button>
        </div>

        <div className={styles.reviewSettings} aria-label="학생 이력서 검토 설정">
          <label className={styles.settingRow}>
            <span>이력서 공개</span>
            <span className={styles.switchFrame}>
              <Switch
                aria-describedby="teacher-resume-api-notice"
                aria-label="이력서 공개"
                checked={false}
                disabled
                onCheckedChange={() => undefined}
              />
            </span>
          </label>
          <label className={styles.settingRow}>
            <span>피드백 보기</span>
            <span className={styles.switchFrame}>
              <Switch
                aria-describedby="teacher-resume-api-notice"
                aria-label="피드백 보기"
                checked={false}
                disabled
                onCheckedChange={() => undefined}
              />
            </span>
          </label>
        </div>
      </section>
    </main>
  )
}
