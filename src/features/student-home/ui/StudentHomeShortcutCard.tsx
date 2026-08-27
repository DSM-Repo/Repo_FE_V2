import Image from 'next/image'
import Link from 'next/link'
import type { ReactElement, ReactNode } from 'react'

import { Icon } from '@/shared/ui'

import styles from './StudentHomeShortcutCard.module.css'

type StudentHomeShortcutCardVariant = 'resume' | 'library'

type StudentHomeShortcutCardProps = {
  readonly ctaLabel: string
  readonly href: string
  readonly title: ReactNode
  readonly variant: StudentHomeShortcutCardVariant
}

const shortcutAssets = {
  library: [
    {
      className: styles.assetBack,
      height: 250,
      src: '/assets/student-home/library-document-back.svg',
      width: 194,
    },
    {
      className: styles.assetFront,
      height: 274,
      src: '/assets/student-home/library-book-front.svg',
      width: 219,
    },
  ],
  resume: [
    {
      className: styles.assetBack,
      height: 250,
      src: '/assets/student-home/resume-document-back.svg',
      width: 194,
    },
    {
      className: styles.assetFront,
      height: 291,
      src: '/assets/student-home/resume-document-front.svg',
      width: 205,
    },
  ],
} satisfies Record<
  StudentHomeShortcutCardVariant,
  readonly {
    readonly className: string
    readonly height: number
    readonly src: string
    readonly width: number
  }[]
>

export function StudentHomeShortcutCard({ ctaLabel, href, title, variant }: StudentHomeShortcutCardProps): ReactElement {
  return (
    <Link className={styles.card} data-variant={variant} href={href}>
      <strong className={styles.title}>{title}</strong>
      <span className={styles.action}>
        {ctaLabel}
        <Icon name="chevron-right" />
      </span>
      <span className={styles.art} aria-hidden="true">
        {shortcutAssets[variant].map((asset) => (
          <Image
            alt=""
            className={asset.className}
            height={asset.height}
            key={asset.src}
            src={asset.src}
            width={asset.width}
          />
        ))}
      </span>
    </Link>
  )
}
