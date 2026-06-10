import type { HTMLAttributes, ReactNode } from 'react'

import styles from './Tag.module.css'

export type TagTone = 'dark' | 'light'

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  onRemove?: () => void
  removeLabel?: string
  tone?: TagTone
}

const tagToneClassName: Record<TagTone, string> = {
  dark: styles.dark,
  light: styles.light,
}

export function Tag({ children, className, onRemove, removeLabel = '태그 삭제', tone = 'dark', ...props }: TagProps) {
  const tagClassName = [styles.tag, tagToneClassName[tone], className].filter(Boolean).join(' ')

  return (
    <span className={tagClassName} {...props}>
      <span className={styles.text}>{children}</span>
      {onRemove ? (
        <button aria-label={removeLabel} className={styles.removeButton} type="button" onClick={onRemove}>
          <CloseIcon className={styles.removeIcon} />
        </button>
      ) : null}
    </span>
  )
}

type CloseIconProps = {
  className?: string
}

function CloseIcon({ className }: CloseIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="18"
      viewBox="0 0 18 18"
      width="18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4 4L14 14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M14 4L4 14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}
