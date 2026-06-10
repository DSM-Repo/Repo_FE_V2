import type { ButtonHTMLAttributes, ReactNode } from 'react'

import styles from './Feedback.module.css'

export interface FeedbackProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'content' | 'onChange' | 'title'> {
  content?: ReactNode
  createdAtLabel: ReactNode
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  title: ReactNode
}

export function Feedback({
  className,
  content,
  createdAtLabel,
  disabled,
  expanded,
  onClick,
  onExpandedChange,
  title,
  ...props
}: FeedbackProps) {
  const feedbackClassName = [styles.feedback, expanded ? styles.expanded : undefined, className]
    .filter(Boolean)
    .join(' ')

  const handleClick: FeedbackProps['onClick'] = (event) => {
    onClick?.(event)

    if (event.defaultPrevented || disabled) {
      return
    }

    onExpandedChange(!expanded)
  }

  return (
    <article className={feedbackClassName}>
      <button {...props} aria-expanded={expanded} className={styles.trigger} disabled={disabled} onClick={handleClick} type="button">
        <span className={styles.summary}>
          <span className={styles.title}>{title}</span>
          <span className={styles.createdAt}>{createdAtLabel}</span>
        </span>
        <ChevronIcon className={styles.chevron} direction={expanded ? 'up' : 'down'} />
      </button>

      {expanded && content ? <div className={styles.content}>{content}</div> : null}
    </article>
  )
}

type ChevronIconProps = {
  className?: string
  direction: 'down' | 'up'
}

function ChevronIcon({ className, direction }: ChevronIconProps) {
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
      <path
        d={direction === 'up' ? 'M5 15L12 8L19 15' : 'M5 9L12 16L19 9'}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  )
}
