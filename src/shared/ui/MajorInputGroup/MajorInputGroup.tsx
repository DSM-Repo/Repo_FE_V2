'use client'

import type { InputHTMLAttributes } from 'react'
import { useId } from 'react'

import styles from './MajorInputGroup.module.css'

export type MajorInputValue = {
  readonly id: string
  readonly placeholder?: string
  readonly value?: string
}

export type MajorInputGroupProps = {
  readonly ariaLabelPrefix?: string
  readonly errorMessage?: string
  readonly inputs: readonly MajorInputValue[]
  readonly onChange?: (id: string, value: string) => void
}

type MajorInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  readonly hasError?: boolean
}

function MajorInput({ hasError = false, ...props }: MajorInputProps) {
  return <input className={`${styles.input} ${hasError ? styles.inputError : ''}`} {...props} />
}

export function MajorInputGroup({ ariaLabelPrefix = '추가할 전공', errorMessage, inputs, onChange }: MajorInputGroupProps) {
  const generatedId = useId()
  const hasError = Boolean(errorMessage)
  const errorMessageId = hasError ? `${generatedId}-error` : undefined

  return (
    <div className={styles.group}>
      {inputs.map((input) => (
        <MajorInput
          aria-describedby={errorMessageId}
          aria-label={`${ariaLabelPrefix} ${input.id}`}
          aria-invalid={hasError || undefined}
          hasError={hasError}
          key={input.id}
          onChange={(event) => onChange?.(input.id, event.target.value)}
          placeholder={input.placeholder ?? '추가할 전공을 입력해주세요.'}
          value={input.value}
        />
      ))}
      {errorMessage ? (
        <p className={styles.errorMessage} id={errorMessageId}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
