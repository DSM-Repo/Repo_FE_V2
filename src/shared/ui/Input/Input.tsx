import type { InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'

import styles from './Input.module.css'

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  error?: boolean
  errorMessage?: string
  onRightIconClick?: () => void
  rightIcon?: ReactNode
}

export function Input({ error = false, errorMessage, id, onRightIconClick, rightIcon, ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hasError = error || Boolean(errorMessage)
  const errorMessageId = errorMessage ? `${inputId}-error` : undefined
  const input = (
    <input
      aria-describedby={errorMessageId}
      aria-invalid={hasError || undefined}
      className={styles.input}
      id={inputId}
      {...props}
    />
  )

  return (
    <div className={styles.root}>
      <div className={`${styles.field} ${hasError ? styles.error : ''}`}>
        {input}
        {rightIcon ? (
          onRightIconClick ? (
            <button
              aria-label="입력창 오른쪽 아이콘"
              className={styles.iconButton}
              onClick={onRightIconClick}
              type="button"
            >
              {rightIcon}
            </button>
          ) : (
            <span className={styles.icon} aria-hidden="true">
              {rightIcon}
            </span>
          )
        ) : null}
      </div>
      {errorMessage ? (
        <p className={styles.errorMessage} id={errorMessageId}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
