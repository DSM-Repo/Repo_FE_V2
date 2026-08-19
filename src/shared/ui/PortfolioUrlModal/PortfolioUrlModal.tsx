'use client'

import type { ChangeEventHandler } from 'react'
import { useState } from 'react'

import { Button, Input } from '@/shared/ui'

import styles from './PortfolioUrlModal.module.css'

export type PortfolioUrlModalProps = {
  readonly defaultValue?: string
  readonly errorMessage?: string
  readonly onCancel?: () => void
  readonly onConfirm?: (value: string) => void
}

export function PortfolioUrlModal({ defaultValue, errorMessage, onCancel, onConfirm }: PortfolioUrlModalProps) {
  const [value, setValue] = useState(defaultValue ?? '')
  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => setValue(event.target.value)

  return (
    <section className={styles.modal} role="dialog" aria-labelledby="portfolio-url-title">
      <div className={styles.copy}>
        <h2 className={styles.title} id="portfolio-url-title">
          자신의 메인 url을 입력해주세요.
        </h2>
        <p className={styles.description}>자신을 보여줄 수 있는 사이트 링크를 입력해주세요.</p>
      </div>
      <Input aria-label="메인 URL" errorMessage={errorMessage} onChange={handleChange} placeholder="https://..." type="url" value={value} />
      <div className={styles.actions}>
        <Button onClick={onCancel} variant="bordered-dark">
          취소
        </Button>
        <Button onClick={() => onConfirm?.(value)}>확인</Button>
      </div>
    </section>
  )
}
