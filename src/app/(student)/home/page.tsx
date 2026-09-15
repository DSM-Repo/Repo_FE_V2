import type { CSSProperties, ReactElement } from 'react'

import type { AppHeaderItem } from '@/shared/ui'
import { StudentHomeShortcutCard } from '@/features/student-home'
import { AppHeader } from '@/shared/ui'

import styles from './page.module.css'

const navigationItems = [
  { href: '/home', label: '홈', value: 'home' },
  { href: '/resume', label: '이력서 관리', value: 'resume' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

type ProgressItem = {
  readonly label: string
}

const progressItems = [
  { label: '내 정보' },
  { label: '활동' },
  { label: '프로젝트' },
] satisfies readonly ProgressItem[]

const progressRingStyle = {
  '--progress': '0%',
} as CSSProperties

const shortcutCards = [
  {
    ctaLabel: '이력서 관리 바로가기',
    href: '/resume',
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

export default function StudentHomePage(): ReactElement {
  return (
    <main className={styles.page}>
      <AppHeader activeItem="home" items={navigationItems} loginHref="#notifications-title" />

      <section className={styles.content} aria-labelledby="student-home-title">
        <header className={styles.profileHero}>
          <div className={styles.avatar} aria-hidden="true" />
          <div className={styles.profileText}>
            <h1 id="student-home-title">내 정보가 없습니다.</h1>
            <p>이력서를 저장하면 홈에서 내 정보를 확인할 수 있습니다.</p>
          </div>
        </header>

        <div className={styles.dashboard}>
          <section className={styles.progressPanel} aria-labelledby="resume-progress-title">
            <div
              aria-label="이력서 완성도 0%"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={0}
              className={styles.progressRing}
              role="progressbar"
              style={progressRingStyle}
            >
              <span>0%</span>
            </div>

            <div className={styles.progressDetails}>
              <h2 className={styles.visuallyHidden} id="resume-progress-title">
                이력서 완성도
              </h2>
              <ul className={styles.progressList}>
                {progressItems.map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
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
            <p className={styles.emptyMessage}>새 알림이 없습니다.</p>
          </section>
        </div>
      </section>
    </main>
  )
}
