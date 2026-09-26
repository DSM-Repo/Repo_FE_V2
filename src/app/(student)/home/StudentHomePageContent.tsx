'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react'

import { getSavedAccessToken } from '@/features/auth/api'
import { StudentHomeShortcutCard } from '@/features/student-home'
import { getUserMe, type UserMe, type UserMeResult } from '@/features/user/api'
import type { AppHeaderItem } from '@/shared/ui'
import { AppHeader } from '@/shared/ui'

import { StudentHomeNotificationPanel } from './StudentHomeNotificationPanel'
import styles from './page.module.css'

const navigationItems = [
  { href: '/home', label: '홈', value: 'home' },
  { href: '/resume', label: '이력서 관리', value: 'resume' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

const defaultProgressItems = [
  { completed: false, key: 'PROFILE', name: '내 정보' },
  { completed: false, key: 'ACTIVITY', name: '활동' },
  { completed: false, key: 'PROJECT', name: '프로젝트' },
] as const

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

type UserLoadState =
  | {
      readonly kind: 'idle'
    }
  | {
      readonly kind: 'loading'
    }
  | {
      readonly kind: 'success'
      readonly user: UserMe
    }
  | {
      readonly kind: 'failure'
      readonly message: string
    }

function toFailureMessage(result: Exclude<UserMeResult, { readonly kind: 'success' }>) {
  return result.message
}

function toProgressPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)))
}

function toStudentLine(user: UserMe) {
  return `${user.classInfo.schoolNumber} ${user.major ?? ''}`.trim()
}

function toProgressRingStyle(percent: number) {
  return {
    '--progress': `${percent}%`,
  } as CSSProperties
}

function renderSectionStatus(completed: boolean): ReactNode {
  return completed ? <strong>완료</strong> : null
}

export function StudentHomePageContent(): ReactElement {
  const [userState, setUserState] = useState<UserLoadState>({ kind: 'idle' })

  useEffect(() => {
    const accessToken = getSavedAccessToken()

    if (!accessToken) {
      return
    }

    let isActive = true

    const loadUser = async () => {
      setUserState({ kind: 'loading' })

      const result = await getUserMe({ accessToken })

      if (!isActive) {
        return
      }

      if (result.kind === 'success') {
        setUserState({ kind: 'success', user: result.user })
        return
      }

      setUserState({ kind: 'failure', message: toFailureMessage(result) })
    }

    void loadUser()

    return () => {
      isActive = false
    }
  }, [])

  const user = userState.kind === 'success' ? userState.user : undefined
  const isUserLoading = userState.kind === 'idle' || userState.kind === 'loading'
  const progressPercent = toProgressPercent(user?.progress.totalPercent ?? 0)
  const progressSections = user?.progress.sections.length ? user.progress.sections : defaultProgressItems
  const progressRingStyle = useMemo(() => toProgressRingStyle(progressPercent), [progressPercent])

  return (
    <main className={styles.page}>
      <AppHeader activeItem="home" items={navigationItems} loginHref="#notifications-title" />

      <section className={styles.content} aria-labelledby="student-home-title">
        <header className={styles.profileHero}>
          {user?.profileImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element -- Profile URLs are provided by the API and are not limited to configured Next image hosts. */
            <img className={styles.avatar} src={user.profileImageUrl} alt="" />
          ) : (
            <div className={styles.avatar} aria-hidden="true" />
          )}
          <div className={styles.profileText}>
            <h1 id="student-home-title">
              {user ? user.name : isUserLoading ? '내 정보를 불러오는 중입니다.' : '내 정보를 불러오지 못했습니다.'}
              {user ? <span>{toStudentLine(user)}</span> : null}
            </h1>
            {!isUserLoading ? (
              <p>
                {user?.introduce ||
                  (userState.kind === 'failure' ? userState.message : '이력서를 저장하면 홈에서 내 정보를 확인할 수 있습니다.')}
              </p>
            ) : null}
          </div>
        </header>

        <div className={styles.dashboard}>
          <section className={styles.progressPanel} aria-labelledby="resume-progress-title">
            <div
              aria-label={`이력서 완성도 ${progressPercent}%`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progressPercent}
              className={styles.progressRing}
              role="progressbar"
              style={progressRingStyle}
            >
              <span>{progressPercent}%</span>
            </div>

            <div className={styles.progressDetails}>
              <h2 className={styles.visuallyHidden} id="resume-progress-title">
                이력서 완성도
              </h2>
              <ul className={styles.progressList}>
                {progressSections.map((item) => (
                  <li key={item.key}>
                    <span>{item.name}</span>
                    {renderSectionStatus(item.completed)}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className={styles.shortcuts} aria-label="바로가기">
            {shortcutCards.map((card) => (
              <StudentHomeShortcutCard ctaLabel={card.ctaLabel} href={card.href} key={card.ctaLabel} title={card.title} variant={card.variant} />
            ))}
          </section>

          <StudentHomeNotificationPanel />
        </div>
      </section>
    </main>
  )
}
