import type { MouseEventHandler, ReactNode } from 'react'

import { Icon } from '@/shared/ui/Icon'

import styles from './LinkRow.module.css'

export type LinkRowTone = 'submitted' | 'missing' | 'neutral'
export type LinkRowSurface = 'default' | 'muted'

type LinkRowBaseProps = {
  readonly actionLabel?: string
  readonly className?: string
  readonly meta?: ReactNode
  readonly status?: ReactNode
  readonly surface?: LinkRowSurface
  readonly title: ReactNode
  readonly tone?: LinkRowTone
}

type LinkRowAnchorProps = LinkRowBaseProps & {
  readonly href: string
}

type LinkRowButtonProps = LinkRowBaseProps & {
  readonly disabled?: boolean
  readonly href?: never
  readonly onClick?: MouseEventHandler<HTMLButtonElement>
}

export type LinkRowProps = LinkRowAnchorProps | LinkRowButtonProps

const toneClassName: Record<LinkRowTone, string> = {
  missing: styles.missing,
  neutral: styles.neutral,
  submitted: styles.submitted,
}

const surfaceClassName: Record<LinkRowSurface, string> = {
  default: styles.defaultSurface,
  muted: styles.mutedSurface,
}

export function LinkRow(props: LinkRowProps) {
  const { actionLabel, className, meta, status, surface = 'default', title, tone = 'neutral' } = props
  const rowClassName = [styles.row, surfaceClassName[surface], toneClassName[tone], className].filter(Boolean).join(' ')
  const content = (
    <>
      <span className={styles.leading}>
        <span className={styles.title}>{title}</span>
        {status ? <span className={styles.status}>{status}</span> : null}
      </span>
      <span className={styles.trailing}>
        {actionLabel ? <span className={styles.action}>{actionLabel}</span> : null}
        {meta ? <span className={styles.meta}>{meta}</span> : null}
        <Icon className={styles.chevron} name="chevron-right" />
      </span>
    </>
  )

  if ('href' in props) {
    return (
      <a className={rowClassName} href={props.href}>
        {content}
      </a>
    )
  }

  return (
    <button className={rowClassName} disabled={props.disabled} onClick={props.onClick} type="button">
      {content}
    </button>
  )
}
