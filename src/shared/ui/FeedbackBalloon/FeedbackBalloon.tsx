import Image from 'next/image'
import type { HTMLAttributes, ReactNode } from 'react'

import styles from './FeedbackBalloon.module.css'

export interface FeedbackBalloonProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  avatarAlt?: string
  avatarSrc?: string
  checked?: boolean
  title: ReactNode
}

export function FeedbackBalloon({
  avatarAlt = '피드백 작성자 프로필',
  avatarSrc = '/person.svg',
  checked = true,
  className,
  title,
  ...props
}: FeedbackBalloonProps) {
  const balloonClassName = [styles.balloon, className].filter(Boolean).join(' ')

  return (
    <div className={balloonClassName} {...props}>
      <button aria-label="피드백 내용 보기" className={styles.avatar} type="button">
        <Image alt={avatarAlt} className={styles.avatarImage} height={32} src={avatarSrc} width={32} />
      </button>

      <div className={styles.message}>
        <span className={styles.title}>{title}</span>
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
      height="24"
      viewBox="0 0 24 24"
      width="24"
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
