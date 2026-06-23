import type { ComponentPropsWithoutRef } from 'react'

import { assertSafeInternalHref, type InternalHref } from '@/shared/lib/internalHref'

import styles from './LibraryBookCard.module.css'

type LibraryBookCardBaseProps = {
  actionLabel?: string
  ariaLabel?: string
  batchLabel?: string
  className?: string
  gradeLabel?: string
  href: InternalHref
  title?: string
}

/**
 * Fixed 160×220 library-entry book cover card for the current Figma-derived library/resume-book entry pattern.
 * Keep this API intentionally narrow until multiple cover variants or sizes are approved.
 */
export type LibraryBookCardProps = LibraryBookCardBaseProps & Omit<ComponentPropsWithoutRef<'a'>, keyof LibraryBookCardBaseProps | 'href'>

export function LibraryBookCard({
  actionLabel = '포트폴리오 열람',
  ariaLabel,
  batchLabel = '9기',
  className,
  gradeLabel = '2학년',
  href,
  title = '2022',
  ...anchorProps
}: LibraryBookCardProps) {
  const cardClassName = [styles.card, className].filter(Boolean).join(' ')
  const accessibleLabel = ariaLabel ?? `${title} ${batchLabel} ${gradeLabel} ${actionLabel}`

  return (
    <a className={cardClassName} href={assertSafeInternalHref(href)} aria-label={accessibleLabel} {...anchorProps}>
      <span className={styles.heading}>
        <span className={styles.title}>{title}</span>
        <span className={styles.batchLabel}>{batchLabel}</span>
      </span>
      <span className={styles.gradeLabel}>{gradeLabel}</span>
      <span className={styles.action}>
        <span>{actionLabel}</span>
        <span className={styles.arrow} aria-hidden="true">
          ›
        </span>
      </span>
    </a>
  )
}
