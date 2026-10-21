import Image from 'next/image'
import type { HTMLAttributes, ReactNode } from 'react'

import styles from './FeedbackBalloon.module.css'

export interface FeedbackBalloonProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  avatarAlt?: string
  avatarSrc?: string
  buttonAriaLabel?: string
  checked?: boolean
  messageSide?: 'left' | 'right'
  selected?: boolean
  onActivate?: () => void
  title: ReactNode
}

export function FeedbackBalloon({
  avatarAlt = '피드백 작성자 프로필',
  avatarSrc,
  buttonAriaLabel = '피드백 내용 보기',
  checked = false,
  messageSide = 'right',
  className,
  onActivate,
  selected = false,
  title,
  ...props
}: FeedbackBalloonProps) {
  const balloonClassName = [styles.balloon, className].filter(Boolean).join(' ')
  const statusLabel = checked ? '완료' : selected ? '선택됨' : '미완료'

  return (
    <div
      className={balloonClassName}
      data-completed={checked ? 'true' : undefined}
      data-message-side={messageSide}
      data-selected={selected ? 'true' : undefined}
      {...props}
    >
      <button aria-label={buttonAriaLabel} className={styles.avatar} onClick={onActivate} type="button">
        {avatarSrc ? (
          <Image alt={avatarAlt} className={styles.avatarImage} height={48} src={avatarSrc} width={48} />
        ) : (
          <svg aria-label={avatarAlt} className={styles.avatarImage} role="img" viewBox="0 0 32 32">
            <circle cx="16" cy="16" fill="var(--repo-gray-400)" r="16" />
            <circle cx="16" cy="13" fill="var(--repo-gray-300)" r="6" />
            <path d="M5 27.6a12 12 0 0 1 22 0 16 16 0 0 1-22 0Z" fill="var(--repo-gray-300)" />
          </svg>
        )}
      </button>

      <div className={styles.message}>
        <span className={styles.title}>{title}</span>
        <span className={styles.status}>{statusLabel}</span>
        {checked ? <CheckCircleIcon className={styles.checkIcon} /> : null}
      </div>
    </div>
  )
}

type CheckCircleIconProps = {
  className?: string
}

function CheckCircleIcon({ className }: CheckCircleIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="32"
      viewBox="0 0 24 24"
      width="32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" />
      <path
        d="M8 12.2L10.7 14.9L16.2 9.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  )
}
