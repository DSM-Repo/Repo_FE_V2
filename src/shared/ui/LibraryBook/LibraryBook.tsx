import { Icon } from '@/shared/ui/Icon'

import styles from './LibraryBook.module.css'

export type LibraryBookProps = {
  readonly generation: string
  readonly grade: string
  readonly href: string
  readonly year: string
}

export function LibraryBook({ generation, grade, href, year }: LibraryBookProps) {
  return (
    <a className={styles.book} href={href}>
      <span className={styles.bookmark} aria-hidden="true" />
      <span className={styles.year}>
        {year} <span>{generation}</span>
      </span>
      <span className={styles.grade}>{grade}</span>
      <span className={styles.action}>
        포트폴리오 열람
        <Icon className={styles.icon} name="chevron-right" />
      </span>
    </a>
  )
}
