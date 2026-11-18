'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment, useRef, useState } from 'react'
import type { ClipboardEvent, FormEvent, KeyboardEvent } from 'react'

import { loginCompanyWithAuthApi, saveAuthTokens, type AuthLoginResult } from '@/features/auth/api'
import { Logo } from '@/shared/ui'

import { authHomePath } from './authHomePath'
import styles from './CompanyCodeLogin.module.css'

const segmentLength = 4
const emptySegments = ['', '', '', '']
const codeLength = segmentLength * emptySegments.length

type AuthLoginFailure = Exclude<AuthLoginResult, { readonly kind: 'success' }>

function codeCharacters(value: string) {
  return value.replace(/[^a-z\d]/gi, '').toUpperCase()
}

export function CompanyCodeLogin() {
  const router = useRouter()
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const [segments, setSegments] = useState(emptySegments)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<AuthLoginFailure>()
  const isComplete = segments.every((segment) => segment.length === segmentLength)

  function updateSegment(index: number, value: string) {
    const segment = codeCharacters(value).slice(0, segmentLength)
    setSegments((current) => current.map((part, partIndex) => partIndex === index ? segment : part))
    setFeedback(undefined)

    if (segment.length === segmentLength && segments[index].length < segmentLength) {
      inputs.current[index + 1]?.focus()
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>, index: number) {
    event.preventDefault()
    if (isSubmitting) return

    const text = codeCharacters(event.clipboardData.getData('text'))
    if (text.length === 0) return

    if (text.length <= segmentLength) {
      const { selectionStart, selectionEnd, value } = event.currentTarget
      updateSegment(index, value.slice(0, selectionStart ?? 0) + text + value.slice(selectionEnd ?? value.length))
      return
    }

    const startIndex = text.length >= codeLength ? 0 : index
    const pastedSegments = text.slice(0, codeLength).match(/.{1,4}/g) ?? []
    setSegments((current) => current.map((part, partIndex) => pastedSegments[partIndex - startIndex] ?? part))
    setFeedback(undefined)
    const nextIndex = startIndex + Math.floor(text.length / segmentLength)
    inputs.current[Math.min(nextIndex, segments.length - 1)]?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === 'Backspace' && event.currentTarget.value === '' && index > 0 && !isSubmitting) {
      event.preventDefault()
      inputs.current[index - 1]?.focus()
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isComplete || isSubmitting) return

    setFeedback(undefined)
    setIsSubmitting(true)
    const result = await loginCompanyWithAuthApi({ code: segments.join('-') })

    if (result.kind === 'success') {
      saveAuthTokens(result.token)
      router.push(authHomePath[result.token.role])
      return
    }

    setFeedback(result)
    setIsSubmitting(false)
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.logoLink} href="/" aria-label="Repo 홈">
          <Logo />
        </Link>
      </header>

      <form
        aria-busy={isSubmitting}
        aria-labelledby="company-code-title"
        className={styles.form}
        onSubmit={handleSubmit}
      >
        <div>
          <h1 id="company-code-title" className={styles.title}>인증 코드를 입력해 주세요.</h1>
          <p id="company-code-hint" className={styles.hint}>
            선생님께 받은 16자리 영문 대문자와 숫자를 입력해 주세요.
          </p>
        </div>

        <div
          aria-label="기업 인증 코드"
          aria-describedby={feedback ? 'company-code-hint company-code-feedback' : 'company-code-hint'}
          className={styles.codeGroup}
          role="group"
        >
          {segments.map((segment, index) => (
            <Fragment key={index}>
              {index > 0 && <span aria-hidden="true" className={styles.separator} />}
              <input
                ref={(input) => { inputs.current[index] = input }}
                aria-invalid={feedback?.kind === 'invalid-credentials' || undefined}
                aria-label={`인증 코드 ${index + 1}번째 칸`}
                autoCapitalize="characters"
                autoComplete="off"
                className={styles.codeInput}
                maxLength={segmentLength}
                onChange={(event) => updateSegment(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                onPaste={(event) => handlePaste(event, index)}
                placeholder="XXXX"
                readOnly={isSubmitting}
                spellCheck={false}
                value={segment}
              />
            </Fragment>
          ))}
        </div>

        <p className={styles.feedback} id="company-code-feedback" role="alert">{feedback?.message}</p>

        <button className={styles.submit} disabled={!isComplete || isSubmitting} type="submit">
          {isSubmitting ? '인증 중' : '입장하기'}
        </button>
      </form>
    </main>
  )
}
