import type { ButtonHTMLAttributes } from 'react'

import { Icon } from '@/shared/ui/Icon'

import styles from './ClassCard.module.css'

export type ClassCardProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & {
  readonly className?: string
  readonly count: number
  readonly selected?: boolean
  readonly title: string
}

export function ClassCard({ className, count, selected = false, title, type = 'button', ...props }: ClassCardProps) {
  const cardClassName = [styles.card, selected ? styles.selected : '', className].filter(Boolean).join(' ')

  return (
    <button className={cardClassName} type={type} {...props}>
      <span className={styles.content}>
        <span className={styles.title}>{title}</span>
        <span className={styles.count}>{count}명</span>
      </span>
      <Icon className={styles.icon} name="chevron-right" />
    </button>
  )
}
