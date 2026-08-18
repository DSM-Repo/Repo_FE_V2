'use client'

import Link from 'next/link'
import type { ChangeEvent, FormEvent } from 'react'
import { useState } from 'react'

import { Button, Icon, Input, Logo } from '@/shared/ui'

import styles from './AuthLoginPage.module.css'

type LoginRole = 'student' | 'teacher'
type LoginField = 'email' | 'password'
type SubmitState = 'idle' | 'pending'

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

const emptyTouchedFields: Record<LoginField, boolean> = {
  email: false,
  password: false,
}

const filledTouchedFields: Record<LoginField, boolean> = {
  email: true,
  password: true,
}

function hasValue(value: string) {
  return value.trim().length > 0
}

export function AuthLoginPage() {
  const [role, setRole] = useState<LoginRole>('student')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touchedFields, setTouchedFields] = useState(emptyTouchedFields)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const content = LOGIN_CONTENT[role]
  const nextRole = oppositeRole[role]
  const layoutClassName = role === 'student' ? styles.studentLayout : styles.teacherLayout
  const passwordType = showPassword ? 'text' : 'password'
  const passwordToggleLabel = showPassword ? '비밀번호 숨기기' : '비밀번호 보이기'
  const passwordIconName = showPassword ? 'eye' : 'eye-off'
  const emailHasValue = hasValue(email)
  const passwordHasValue = hasValue(password)
  const isFormValid = emailHasValue && passwordHasValue
  const isSubmitting = submitState === 'pending'
  const emailErrorMessage = touchedFields.email && !emailHasValue ? '이메일을 입력해주세요.' : undefined
  const passwordErrorMessage = touchedFields.password && !passwordHasValue ? '비밀번호를 입력해주세요.' : undefined

  const markFieldTouched = (field: LoginField) => {
    setTouchedFields((currentFields) => ({
      ...currentFields,
      [field]: true,
    }))
  }

  const resetSubmitState = () => {
    if (isSubmitting) {
      setSubmitState('idle')
    }
  }

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value)
    resetSubmitState()
  }

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value)
    resetSubmitState()
  }

  const handleRoleSwitch = () => {
    setRole(nextRole)
    resetSubmitState()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouchedFields(filledTouchedFields)

    if (!isFormValid || isSubmitting) {
      return
    }

    setSubmitState('pending')
  }

  const formPanel = (
    <section className={styles.formPanel} aria-labelledby="login-title">
      <form
        className={styles.form}
        aria-busy={isSubmitting}
        aria-label={content.title}
        noValidate
        onSubmit={handleSubmit}
      >
        <h1 className={styles.title} id="login-title">
          {content.title}
        </h1>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="login-email">
            이메일
          </label>
          <Input
            autoComplete="email"
            errorMessage={emailErrorMessage}
            id="login-email"
            name="email"
            onBlur={() => markFieldTouched('email')}
            onChange={handleEmailChange}
            placeholder="이메일을 입력해주세요."
            required
            type="email"
            value={email}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="login-password">
            비밀번호
          </label>
          <Input
            autoComplete="current-password"
            errorMessage={passwordErrorMessage}
            id="login-password"
            name="password"
            onBlur={() => markFieldTouched('password')}
            onChange={handlePasswordChange}
            onRightIconClick={() => setShowPassword((currentValue) => !currentValue)}
            placeholder="비밀번호를 입력해주세요."
            rightIcon={<Icon className={styles.passwordIcon} name={passwordIconName} />}
            rightIconAriaLabel={passwordToggleLabel}
            required
            type={passwordType}
            value={password}
          />
        </div>

        <Button className={styles.submitButton} disabled={!isFormValid || isSubmitting} type="submit">
          {isSubmitting ? '로그인 중' : '로그인'}
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

      <button className={styles.switchButton} onClick={handleRoleSwitch} type="button">
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
