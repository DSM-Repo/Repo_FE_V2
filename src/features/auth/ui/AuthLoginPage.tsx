'use client'

import Link from 'next/link'
import { useState } from 'react'

import { Button, Icon, Input, Logo } from '@/shared/ui'

import styles from './AuthLoginPage.module.css'

type LoginRole = 'student' | 'teacher'

type LoginContent = {
  description: string
  switchLabel: string
  title: string
}

const LOGIN_CONTENT: Record<LoginRole, LoginContent> = {
  student: {
    description: 'DSM학생들을 위한 이력서 관리 플랫폼, Repo',
    switchLabel: '선생님으로 전환하기',
    title: '학생 로그인',
  },
  teacher: {
    description: 'DSM선생님을 위한 이력서 관리 플랫폼, Repo',
    switchLabel: '학생으로 전환하기',
    title: '선생님 로그인',
  },
}

const oppositeRole: Record<LoginRole, LoginRole> = {
  student: 'teacher',
  teacher: 'student',
}

export function AuthLoginPage() {
  const [role, setRole] = useState<LoginRole>('student')
  const [showPassword, setShowPassword] = useState(false)
  const content = LOGIN_CONTENT[role]
  const nextRole = oppositeRole[role]
  const layoutClassName = role === 'student' ? styles.studentLayout : styles.teacherLayout
  const passwordType = showPassword ? 'text' : 'password'
  const passwordToggleLabel = showPassword ? '비밀번호 숨기기' : '비밀번호 보이기'
  const passwordIconName = showPassword ? 'eye' : 'eye-off'

  const formPanel = (
    <section className={styles.formPanel} aria-labelledby="login-title">
      <form className={styles.form} aria-label={content.title}>
        <h1 className={styles.title} id="login-title">
          {content.title}
        </h1>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="login-email">
            이메일
          </label>
          <Input id="login-email" name="email" placeholder="이메일을 입력해주세요." type="email" />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="login-password">
            비밀번호
          </label>
          <Input
            id="login-password"
            name="password"
            onRightIconClick={() => setShowPassword((currentValue) => !currentValue)}
            placeholder="비밀번호를 입력해주세요."
            rightIcon={<Icon className={styles.passwordIcon} name={passwordIconName} />}
            rightIconAriaLabel={passwordToggleLabel}
            type={passwordType}
          />
        </div>

        <Button className={styles.submitButton} disabled type="submit">
          로그인
        </Button>
      </form>
    </section>
  )

  const brandPanel = (
    <aside className={styles.brandPanel} aria-label="Repo 소개">
      <div className={styles.brandIntro}>
        <Logo />
        <span className={styles.divider} aria-hidden="true" />
        <p className={styles.welcome}>Repo에 오신 것을 환영해요!</p>
        <p className={styles.description}>{content.description}</p>
      </div>

      <button className={styles.switchButton} onClick={() => setRole(nextRole)} type="button">
        <span>{content.switchLabel}</span>
        <Icon className={styles.switchIcon} name="chevron-right" />
      </button>
    </aside>
  )

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.logoLink} href="/" aria-label="Repo 홈">
          <Logo />
        </Link>
        <Link className={styles.loginPill} href="/login" aria-current="page">
          <Icon className={styles.loginIcon} name="login" />
          <span>로그인</span>
        </Link>
      </header>

      <div className={`${styles.authCard} ${layoutClassName}`}>
        {brandPanel}
        {formPanel}
      </div>
    </main>
  )
}
