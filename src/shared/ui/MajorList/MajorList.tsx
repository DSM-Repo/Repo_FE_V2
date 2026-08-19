'use client'

import { LinkRow } from '@/shared/ui/LinkRow'

import styles from './MajorList.module.css'

export type MajorListItem = {
  readonly id: string
  readonly name: string
}

export type MajorListProps = {
  readonly items: readonly MajorListItem[]
  readonly label?: string
  readonly onSelect?: (id: string) => void
  readonly selectedId?: string
}

export function MajorList({ items, label = '전공관리 전공', onSelect, selectedId }: MajorListProps) {
  return (
    <section className={styles.section} aria-labelledby="major-list-title">
      <h2 className={styles.label} id="major-list-title">
        {label}
      </h2>
      <div className={styles.list}>
        {items.map((item) => (
          <LinkRow key={item.id} onClick={() => onSelect?.(item.id)} surface={item.id === selectedId ? 'default' : 'muted'} title={item.name} />
        ))}
      </div>
    </section>
  )
}
