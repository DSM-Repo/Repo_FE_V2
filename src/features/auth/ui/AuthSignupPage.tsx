'use client'

import { useRouter } from 'next/navigation'
import type { ChangeEvent, FormEvent } from 'react'
import { useState } from 'react'

import {
  sendEmailVerificationCode,
  signupWithAuthApi,
  verifyEmailCode,
  type AuthEmailSendResult,
  type AuthEmailVerifyResult,
  type AuthSignupResult,
} from '@/features/auth/api'
import { Button, Icon, Input, Logo } from '@/shared/ui'

import { AuthAccountPrompt } from './AuthAccountPrompt'
import styles from './AuthSignupPage.module.css'

type SignupStep = 'email' | 'profile' | 'password'
type PasswordField = 'password' | 'confirmPassword'
type SubmitState = 'idle' | 'pending'
type EmailSendState = 'idle' | 'pending' | 'sent'
type FeedbackVariant = 'error' | 'success'
type SignupActionResult = AuthEmailSendResult | AuthEmailVerifyResult | AuthSignupResult

type SignupFeedback = {
  readonly message: string
  readonly variant: FeedbackVariant
}

function hasValue(value: string) {
  return value.trim().length > 0
}

function isVerificationCode(value: string) {
  return /^\d{6}$/.test(value)
}

function isIntegerWithinRange(value: string, minimum: number, maximum: number) {
  const numberValue = Number(value)

  return Number.isInteger(numberValue) && numberValue >= minimum && numberValue <= maximum
}

function toDsmEmail(localPart: string) {
  return `${localPart.trim()}@dsm.hs.kr`
}

function assertNever(value: never): never {
  throw new Error(`Unhandled signup result: ${value}`)
}

function toSignupFeedback(result: SignupActionResult): SignupFeedback {
  switch (result.kind) {
    case 'success':
      return {
        message: result.message,
        variant: 'success',
      }
    case 'configuration-error':
    case 'invalid-code':
    case 'network-error':
    case 'server-error':
      return {
        message: result.message,
        variant: 'error',
      }
    default:
      return assertNever(result)
  }
}

export function AuthSignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<SignupStep>('email')
  const [emailLocalPart, setEmailLocalPart] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [emailSendState, setEmailSendState] = useState<EmailSendState>('idle')
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [studentGrade, setStudentGrade] = useState('')
  const [studentClass, setStudentClass] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [studentName, setStudentName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswordFields, setShowPasswordFields] = useState<Record<PasswordField, boolean>>({
    confirmPassword: false,
    password: false,
  })
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [feedback, setFeedback] = useState<SignupFeedback>()
  const isSubmitting = submitState === 'pending'
  const isSendingCode = emailSendState === 'pending'
  const isEmailStepValid = emailSendState === 'sent' && isVerificationCode(verificationCode)
  const isFormBusy = isSubmitting || isSendingCode || isVerifyingCode
  const isProfileStepValid =
    hasValue(studentName) &&
    isIntegerWithinRange(studentGrade, 1, 3) &&
    isIntegerWithinRange(studentClass, 1, 4) &&
    isIntegerWithinRange(studentNumber, 1, 30)
  const isPasswordStepValid = hasValue(password) && password === confirmPassword
  const passwordMismatchMessage =
    hasValue(confirmPassword) && password !== confirmPassword ? '비밀번호가 일치하지 않습니다.' : undefined
  const signupErrorMessage =
    step === 'password' && feedback?.variant === 'error' ? feedback.message : undefined

  const resetFeedback = () => {
    setFeedback(undefined)
  }

  const handleEmailLocalPartChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmailLocalPart(event.target.value)
    setVerificationCode('')
    setEmailSendState('idle')
    resetFeedback()
  }

  const handleVerificationCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))
    resetFeedback()
  }

  const handleSendVerificationCode = async () => {
    if (!hasValue(emailLocalPart) || isSendingCode || isVerifyingCode) {
      return
    }

    setFeedback(undefined)
    setVerificationCode('')
    setEmailSendState('pending')
    const result = await sendEmailVerificationCode({ email: toDsmEmail(emailLocalPart) })
    setEmailSendState(result.kind === 'success' ? 'sent' : 'idle')
    setFeedback(toSignupFeedback(result))
  }

  const handleStudentNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setStudentName(event.target.value)
    resetFeedback()
  }

  const handleStudentGradeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setStudentGrade(event.target.value)
    resetFeedback()
  }

  const handleStudentClassChange = (event: ChangeEvent<HTMLInputElement>) => {
    setStudentClass(event.target.value)
    resetFeedback()
  }

  const handleStudentNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    setStudentNumber(event.target.value)
    resetFeedback()
  }

  const handlePasswordChange = (field: PasswordField) => (event: ChangeEvent<HTMLInputElement>) => {
    if (field === 'password') {
      setPassword(event.target.value)
    } else {
      setConfirmPassword(event.target.value)
    }

    resetFeedback()
  }

  const togglePasswordField = (field: PasswordField) => {
    setShowPasswordFields((currentValue) => ({
      ...currentValue,
      [field]: !currentValue[field],
    }))
  }

  const goBack = () => {
    resetFeedback()

    if (step === 'profile') {
      setStep('email')
      return
    }

    if (step === 'password') {
      setStep('profile')
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(undefined)

    if (step === 'email') {
      if (isEmailStepValid && !isVerifyingCode) {
        setIsVerifyingCode(true)
        const result = await verifyEmailCode({
          code: verificationCode,
          email: toDsmEmail(emailLocalPart),
        })
        setIsVerifyingCode(false)

        if (result.kind !== 'success') {
          setFeedback(toSignupFeedback(result))
          return
        }

        setFeedback(undefined)
        setStep('profile')
      }
      return
    }

    if (step === 'profile') {
      if (isProfileStepValid) {
        setStep('password')
      }
      return
    }

    if (!isPasswordStepValid || isSubmitting) {
      return
    }

    setSubmitState('pending')
    const result = await signupWithAuthApi({
      email: toDsmEmail(emailLocalPart),
      password,
      role: 'STUDENT',
      studentClass: Number(studentClass),
      studentGrade: Number(studentGrade),
      studentName: studentName.trim(),
      studentNumber: Number(studentNumber),
    })

    setFeedback(toSignupFeedback(result))
    setSubmitState('idle')

    if (result.kind === 'success') {
      router.push('/login')
    }
  }

  const renderStepFields = () => {
    if (step === 'email') {
      return (
        <>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="signup-email">
              이메일
            </label>
            <div className={styles.emailRow}>
              <div className={styles.emailField}>
                <input
                  autoComplete="username"
                  className={styles.emailInput}
                  id="signup-email"
                  name="emailLocalPart"
                  onChange={handleEmailLocalPartChange}
                  placeholder="example"
                  required
                  type="text"
                  value={emailLocalPart}
                />
                <span className={styles.emailDomain}>@dsm.hs.kr</span>
              </div>
              <button
                className={styles.verifyButton}
                disabled={!hasValue(emailLocalPart) || isSendingCode || isVerifyingCode}
                onClick={handleSendVerificationCode}
                type="button"
              >
                {isSendingCode ? '발송 중' : emailSendState === 'sent' ? '재전송' : '인증'}
              </button>
            </div>
          </div>
          <Input
            aria-label="인증코드"
            autoComplete="one-time-code"
            disabled={emailSendState !== 'sent' || isVerifyingCode}
            id="signup-code"
            inputMode="numeric"
            maxLength={6}
            name="verificationCode"
            onChange={handleVerificationCodeChange}
            pattern="[0-9]{6}"
            placeholder="이메일로 발송된 인증코드를 입력해주세요"
            required
            value={verificationCode}
          />
        </>
      )
    }

    if (step === 'profile') {
      return (
        <>
          <div className={styles.studentInfoGrid}>
            <div className={styles.studentInfoField}>
              <label className={styles.label} htmlFor="signup-grade">
                학년
              </label>
              <Input
                id="signup-grade"
                inputMode="numeric"
                max={3}
                min={1}
                name="studentGrade"
                onChange={handleStudentGradeChange}
                placeholder="1"
                required
                step={1}
                type="number"
                value={studentGrade}
              />
            </div>
            <div className={styles.studentInfoField}>
              <label className={styles.label} htmlFor="signup-class">
                반
              </label>
              <Input
                id="signup-class"
                inputMode="numeric"
                max={4}
                min={1}
                name="studentClass"
                onChange={handleStudentClassChange}
                placeholder="1"
                required
                step={1}
                type="number"
                value={studentClass}
              />
            </div>
            <div className={styles.studentInfoField}>
              <label className={styles.label} htmlFor="signup-number">
                번호
              </label>
              <Input
                id="signup-number"
                inputMode="numeric"
                max={30}
                min={1}
                name="studentNumber"
                onChange={handleStudentNumberChange}
                placeholder="1"
                required
                step={1}
                type="number"
                value={studentNumber}
              />
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="signup-name">
              이름
            </label>
            <Input
              autoComplete="name"
              id="signup-name"
              name="studentName"
              onChange={handleStudentNameChange}
              placeholder="이름을 입력해주세요."
              required
              value={studentName}
            />
          </div>
        </>
      )
    }

    return (
      <>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="signup-password">
            비밀번호
          </label>
          <Input
            autoComplete="new-password"
            id="signup-password"
            name="password"
            onChange={handlePasswordChange('password')}
            onRightIconClick={() => togglePasswordField('password')}
            placeholder="비밀번호를 입력해주세요"
            required
            rightIcon={<Icon className={styles.passwordIcon} name={showPasswordFields.password ? 'eye' : 'eye-off'} />}
            rightIconAriaLabel={showPasswordFields.password ? '비밀번호 숨기기' : '비밀번호 보이기'}
            type={showPasswordFields.password ? 'text' : 'password'}
            value={password}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="signup-confirm-password">
            비밀번호 재입력
          </label>
          <Input
            autoComplete="new-password"
            errorMessage={passwordMismatchMessage ?? signupErrorMessage}
            id="signup-confirm-password"
            name="confirmPassword"
            onChange={handlePasswordChange('confirmPassword')}
            onRightIconClick={() => togglePasswordField('confirmPassword')}
            placeholder="비밀번호를 다시 입력해주세요"
            required
            rightIcon={<Icon className={styles.passwordIcon} name={showPasswordFields.confirmPassword ? 'eye' : 'eye-off'} />}
            rightIconAriaLabel={showPasswordFields.confirmPassword ? '비밀번호 확인 숨기기' : '비밀번호 확인 보이기'}
            type={showPasswordFields.confirmPassword ? 'text' : 'password'}
            value={confirmPassword}
          />
        </div>
      </>
    )
  }

  const titleByStep: Record<SignupStep, string> = {
    email: '이메일을 입력해주세요',
    password: '비밀번호를 입력해주세요',
    profile: '학번과 이름을 입력해주세요.',
  }
  const buttonLabel =
    step === 'email' && isVerifyingCode
      ? '확인 중'
      : step === 'password'
        ? isSubmitting
          ? '가입 중'
          : '회원가입!'
        : '다음'
  const canSubmit =
    step === 'email'
      ? isEmailStepValid && !isVerifyingCode
      : step === 'profile'
        ? isProfileStepValid
        : isPasswordStepValid && !isSubmitting

  return (
    <main className={styles.page}>
      <div className={styles.authCard}>
        <aside className={styles.brandPanel} aria-label="Repo 소개">
          <div className={styles.brandIntro}>
            <Logo />
            <span className={styles.divider} aria-hidden="true" />
            <p className={styles.welcome}>Repo에 오신 것을 환영해요!</p>
            <p className={styles.description}>DSM학생들을 위한 이력서 관리 플랫폼, Repo</p>
          </div>
        </aside>

        <section className={styles.formPanel} aria-labelledby="signup-title">
          {step !== 'email' ? (
            <button className={styles.backButton} type="button" aria-label="이전 단계로 돌아가기" onClick={goBack}>
              <Icon className={styles.backIcon} name="chevron-left" />
            </button>
          ) : null}

          <form className={styles.form} aria-busy={isFormBusy} aria-label="회원가입" noValidate onSubmit={handleSubmit}>
            <h1 className={styles.title} id="signup-title">
              {titleByStep[step]}
            </h1>
            <div className={styles.fields}>
              {renderStepFields()}
              {step === 'email' && feedback ? (
                <p
                  className={`${styles.emailFeedback} ${
                    feedback.variant === 'error' ? styles.emailFeedbackError : styles.emailFeedbackSuccess
                  }`}
                  role={feedback.variant === 'error' ? 'alert' : 'status'}
                >
                  {feedback.message}
                </p>
              ) : null}
            </div>
            <div className={styles.submitGroup}>
              <Button className={styles.submitButton} disabled={!canSubmit} iconRight={step === 'password' ? undefined : 'chevron-right'} type="submit">
                {buttonLabel}
              </Button>
              <AuthAccountPrompt
                className={styles.accountPrompt}
                href="/login"
                linkLabel="로그인"
                prompt="이미 계정이 있으신가요?"
              />
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
