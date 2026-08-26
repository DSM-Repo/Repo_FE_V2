import type { CSSProperties, ReactElement } from 'react'

import type { AppHeaderItem } from '@/shared/ui'
import { StudentHomeShortcutCard } from '@/features/student-home'
import { AppHeader, Icon } from '@/shared/ui'

import styles from './page.module.css'

const navigationItems = [
  { href: '/home', label: '홈', value: 'home' },
  { href: '/student/resume', label: '이력서 관리', value: 'resume' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

const student = {
  completionRate: 17,
  headline: 'Frontend Developer',
  intro: '“한줄소개가 와라라라라라라라라락 들어갑니다 많아도 이정도 길이면 되겠죠, 많아도 이정도 길이면 되겠죠”',
  name: '홍길동',
}

type ProgressItem = {
  readonly label: string
  readonly status?: string
}

const progressItems = [
  { label: '내 정보', status: '완료됨' },
  { label: '활동' },
  { label: '프로젝트' },
] satisfies readonly ProgressItem[]

const progressRingStyle = {
  '--progress': `${student.completionRate}%`,
} as CSSProperties

const shortcutCards = [
  {
    ctaLabel: '이력서 관리 바로가기',
    href: '/student/resume',
    title: (
      <>
        <span>내 이력서를</span> 확인하고
        <br />
        수정하고 싶다면?
      </>
    ),
    variant: 'resume',
  },
  {
    ctaLabel: '도서관 바로가기',
    href: '/library',
    title: (
      <>
        다른 사람들의 이력서를
        <br />
        <span>열람</span>하고 싶다면?
      </>
    ),
    variant: 'library',
  },
] as const

const notifications = Array.from({ length: 8 }, (_, index) => ({
  dateTime: '2026-08-26',
  id: `notification-${index + 1}`,
  message: '알림내용',
  receivedAt: '202X.XX.XX',
}))

export default function StudentHomePage(): ReactElement {
  return (
    <main className={styles.page}>
      <AppHeader activeItem="home" items={navigationItems} loginHref="#notifications-title" />

      <section className={styles.content} aria-labelledby="student-home-title">
        <header className={styles.profileHero}>
          <div className={styles.avatar} aria-hidden="true" />
          <div className={styles.profileText}>
            <h1 id="student-home-title">
              {student.name}
              <span>{student.headline}</span>
            </h1>
            <p>{student.intro}</p>
          </div>
        </header>

        <div className={styles.dashboard}>
          <section className={styles.progressPanel} aria-labelledby="resume-progress-title">
            <div
              aria-label={`이력서 완성도 ${student.completionRate}%`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={student.completionRate}
              className={styles.progressRing}
              role="progressbar"
              style={progressRingStyle}
            >
              <span>{student.completionRate}%</span>
            </div>

            <div className={styles.progressDetails}>
              <h2 className={styles.visuallyHidden} id="resume-progress-title">
                이력서 완성도
              </h2>
              <ul className={styles.progressList}>
                {progressItems.map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    {item.status ? <strong>{item.status}</strong> : null}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className={styles.shortcuts} aria-label="바로가기">
            {shortcutCards.map((card) => (
              <StudentHomeShortcutCard
                ctaLabel={card.ctaLabel}
                href={card.href}
                key={card.ctaLabel}
                title={card.title}
                variant={card.variant}
              />
            ))}
          </section>

          <section className={styles.notificationPanel} aria-labelledby="notifications-title">
            <h2 id="notifications-title">알림 목록</h2>
            <ul className={styles.notificationList}>
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <span className={styles.notificationItem}>
                    <span>{notification.message}</span>
                    <time dateTime={notification.dateTime}>{notification.receivedAt}</time>
                    <Icon name="chevron-right" />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </main>
  )
}
