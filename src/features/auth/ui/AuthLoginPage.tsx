'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ChangeEvent, FormEvent } from 'react'
import { useState } from 'react'

import { loginCompanyWithAuthApi, loginWithAuthApi, saveAuthTokens, type AuthLoginResult, type AuthLoginRole } from '@/features/auth/api'
import { Button, Icon, Input, Logo } from '@/shared/ui'

import { AuthAccountPrompt } from './AuthAccountPrompt'
import { authHomePath } from './authHomePath'
import styles from './AuthLoginPage.module.css'

type LoginField = 'email' | 'password'
type SubmitState = 'idle' | 'pending'
type AuthLoginFailure = Exclude<AuthLoginResult, { readonly kind: 'success' }>

type LoginContent = {
  description: string
  switchLabel: string
  title: string
}

const LOGIN_CONTENT: Record<AuthLoginRole, LoginContent> = {
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
  company: {
    description: '기업 인증 코드로 도서관을 이용할 수 있습니다.',
    switchLabel: '학생으로 전환하기',
    title: '기업 로그인',
  },
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
  const router = useRouter()
  const [role, setRole] = useState<AuthLoginRole>('student')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [touchedFields, setTouchedFields] = useState(emptyTouchedFields)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [feedback, setFeedback] = useState<AuthLoginFailure>()
  const content = LOGIN_CONTENT[role]
  const isCompany = role === 'company'
  const nextRole = role === 'student' ? 'teacher' : 'student'
  const layoutClassName = role === 'teacher' ? styles.teacherLayout : styles.studentLayout
  const passwordType = showPassword ? 'text' : 'password'
  const passwordToggleLabel = showPassword ? '비밀번호 숨기기' : '비밀번호 보이기'
  const passwordIconName = showPassword ? 'eye' : 'eye-off'
  const emailHasValue = hasValue(email)
  const passwordHasValue = hasValue(password)
  const isFormValid = isCompany ? hasValue(code) : emailHasValue && passwordHasValue
  const isSubmitting = submitState === 'pending'
  const emailErrorMessage = touchedFields.email && !emailHasValue ? '이메일을 입력해주세요.' : undefined
  const passwordErrorMessage = touchedFields.password && !passwordHasValue ? '비밀번호를 입력해주세요.' : undefined
  const loginErrorMessage = feedback?.message

  const markFieldTouched = (field: LoginField) => {
    setTouchedFields((currentFields) => ({
      ...currentFields,
      [field]: true,
    }))
  }

  const clearFeedback = () => {
    setFeedback(undefined)
  }

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value)
    clearFeedback()
  }

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value)
    clearFeedback()
  }

  const handleRoleSwitch = (targetRole: AuthLoginRole) => {
    setRole(targetRole)
    clearFeedback()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isCompany) setTouchedFields(filledTouchedFields)
    setFeedback(undefined)

    if (!isFormValid || isSubmitting) {
      return
    }

    setSubmitState('pending')
    const result = isCompany
      ? await loginCompanyWithAuthApi({ code })
      : await loginWithAuthApi({ email: email.trim(), password })

    setSubmitState('idle')

    if (result.kind === 'success') {
      saveAuthTokens(result.token)
      router.push(authHomePath[result.token.role])
      return
    }

    setFeedback(result)
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

        {isCompany ? (
          <div className={`${styles.fieldGroup} ${styles.companyCodeField}`}>
            <label className={styles.label} htmlFor="login-company-code">
              기업 인증 코드
            </label>
            <Input
              aria-describedby={feedback ? 'login-feedback' : undefined}
              autoCapitalize="off"
              autoComplete="off"
              error={feedback?.kind === 'invalid-credentials'}
              id="login-company-code"
              name="code"
              onChange={(event) => {
                setCode(event.target.value)
                clearFeedback()
              }}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              readOnly={isSubmitting}
              required
              spellCheck={false}
              value={code}
            />
          </div>
        ) : (
          <>
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
                readOnly={isSubmitting}
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
                readOnly={isSubmitting}
                required
                type={passwordType}
                value={password}
              />
            </div>
          </>
        )}
        {loginErrorMessage ? (
          <p className={isCompany ? styles.companyErrorFeedback : styles.errorFeedback} id="login-feedback" role="alert">
            {loginErrorMessage}
          </p>
        ) : null}

        <div className={`${styles.submitGroup} ${loginErrorMessage ? styles.submitGroupWithFeedback : ''}`}>
          <Button className={styles.submitButton} disabled={!isFormValid || isSubmitting} type="submit">
            {isSubmitting ? '로그인 중' : '로그인'}
          </Button>
          {!isCompany ? (
            <AuthAccountPrompt
              className={styles.accountPrompt}
              href="/signup"
              linkLabel="회원가입"
              prompt="계정이 없으신가요?"
            />
          ) : null}
        </div>
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

      <div className={styles.roleSwitches}>
        <button className={styles.switchButton} disabled={isSubmitting} onClick={() => handleRoleSwitch(nextRole)} type="button">
          <span>{content.switchLabel}</span>
          <Icon className={styles.switchIcon} name="chevron-right" />
        </button>
        {!isCompany ? (
          <button className={styles.switchButton} disabled={isSubmitting} onClick={() => handleRoleSwitch('company')} type="button">
            <span>기업으로 전환하기</span>
            <Icon className={styles.switchIcon} name="chevron-right" />
          </button>
        ) : null}
      </div>
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
