'use client'

import { type FormEvent, useEffect, useRef, useState } from 'react'

import { getSavedAccessToken } from '@/features/auth/api'
import { createCompany, deleteCompany, getCompanies, type Company } from '@/features/company/api/companyApi'
import { teacherNavigationItems } from '@/features/teacher/navigation'
import { AppHeader, Button, Input, Toast, type ToastVariant } from '@/shared/ui'

import styles from './page.module.css'

type CompanyListState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'failure'; readonly message: string }
  | { readonly kind: 'ready'; readonly companies: readonly Company[] }

type Notice = { readonly message: string; readonly variant: ToastVariant }

export default function TeacherCompaniesPage() {
  const [list, setList] = useState<CompanyListState>({ kind: 'loading' })
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [companyName, setCompanyName] = useState('')
  const [nameError, setNameError] = useState('')
  const [isMutating, setIsMutating] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const nameField = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true

    async function loadCompanies() {
      const accessToken = getSavedAccessToken()
      const result = accessToken
        ? await getCompanies(accessToken)
        : { kind: 'server-error', message: '로그인 후 기업 계정을 조회할 수 있습니다.' } as const

      if (!active) return
      setList(
        result.kind === 'success'
          ? { kind: 'ready', companies: result.value }
          : { kind: 'failure', message: result.message },
      )
    }

    void Promise.resolve().then(loadCompanies)
    return () => {
      active = false
    }
  }, [loadAttempt])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isMutating || list.kind !== 'ready') return

    setNotice(null)
    const name = companyName.trim()
    if (!name) {
      setNameError('회사 이름을 입력해 주세요.')
      nameField.current?.querySelector('input')?.focus()
      return
    }

    const accessToken = getSavedAccessToken()
    if (!accessToken) {
      setNotice({ message: '로그인 후 기업 계정을 생성할 수 있습니다.', variant: 'error' })
      return
    }

    setNameError('')
    setIsMutating(true)
    const result = await createCompany(accessToken, name)
    setIsMutating(false)

    if (result.kind === 'duplicate-name') {
      setNameError(result.message)
      return
    }

    if (result.kind !== 'success') {
      setNotice({ message: result.message, variant: 'error' })
      return
    }

    setList({ kind: 'ready', companies: [result.value, ...list.companies] })
    setCompanyName('')
    setNotice({ message: '기업 계정을 생성했습니다.', variant: 'success' })
  }

  async function handleDelete(company: Company) {
    if (isMutating || list.kind !== 'ready') return

    const accessToken = getSavedAccessToken()
    if (!accessToken) {
      setNotice({ message: '로그인 후 기업 계정을 삭제할 수 있습니다.', variant: 'error' })
      return
    }

    if (!window.confirm(`${company.name} 계정을 삭제하시겠습니까?`)) return

    setNotice(null)
    setIsMutating(true)
    const result = await deleteCompany(accessToken, company.companyId)
    setIsMutating(false)

    if (result.kind !== 'success') {
      setNotice({ message: result.message, variant: 'error' })
      return
    }

    setList({
      kind: 'ready',
      companies: list.companies.filter((item) => item.companyId !== company.companyId),
    })
    setNotice({ message: '기업 계정을 삭제했습니다.', variant: 'success' })
    nameField.current?.querySelector('input')?.focus()
  }

  return (
    <div className={styles.page}>
      <AppHeader activeItem="companies" items={teacherNavigationItems} showLogout />

      <main className={styles.content}>
        <h1>기업 계정 관리</h1>
        <form aria-label="기업 계정 생성" className={styles.form} noValidate onSubmit={(event) => void handleCreate(event)}>
          <div className={styles.field} ref={nameField}>
            <label htmlFor="company-name">회사 이름</label>
            <Input
              aria-describedby={nameError ? 'company-name-error' : undefined}
              error={Boolean(nameError)}
              id="company-name"
              onChange={(event) => {
                setCompanyName(event.target.value)
                setNameError('')
              }}
              readOnly={isMutating}
              required
              value={companyName}
            />
          </div>
          <Button className={styles.createButton} disabled={isMutating || list.kind !== 'ready'} iconRight="plus" type="submit">
            계정 생성
          </Button>
          {nameError ? <p className={styles.formError} id="company-name-error" role="alert">{nameError}</p> : null}
        </form>
        {notice ? <Toast className={styles.notice} variant={notice.variant}>{notice.message}</Toast> : null}

        <section aria-labelledby="companies-title" className={styles.listSection}>
          <h2 id="companies-title">기업 계정 목록</h2>
          {list.kind === 'loading' ? <p role="status">기업 계정을 불러오는 중입니다.</p> : null}
          {list.kind === 'failure' ? (
            <div className={styles.loadError}>
              <p role="alert">{list.message}</p>
              <Button
                onClick={() => {
                  setList({ kind: 'loading' })
                  setLoadAttempt((attempt) => attempt + 1)
                }}
                variant="bordered-dark"
              >
                다시 시도
              </Button>
            </div>
          ) : null}
          {list.kind === 'ready' && (list.companies.length === 0 ? (
            <p>등록된 기업 계정이 없습니다.</p>
          ) : (
            <ul className={styles.list}>
              {list.companies.map((company) => (
                <li className={styles.row} key={company.companyId}>
                  <strong className={styles.companyName}>{company.name}</strong>
                  <div className={styles.code}>
                    <span>인증 코드</span>
                    <code>{company.code}</code>
                  </div>
                  <Button
                    aria-label={`${company.name} 계정 삭제`}
                    className={styles.deleteButton}
                    disabled={isMutating}
                    onClick={() => void handleDelete(company)}
                    variant="bordered-dark"
                  >
                    삭제
                  </Button>
                </li>
              ))}
            </ul>
          ))}
        </section>
      </main>
    </div>
  )
}
