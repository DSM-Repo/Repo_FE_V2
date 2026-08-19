'use client'

import styles from './OptionList.module.css'

export type OptionListItem = {
  readonly id: string
  readonly label: string
}

export type OptionListProps = {
  readonly items: readonly OptionListItem[]
  readonly onSelect?: (id: string) => void
  readonly selectedId?: string
}

export function OptionList({ items, onSelect, selectedId }: OptionListProps) {
  return (
    <div className={styles.list} aria-label="전공 선택">
      {items.map((item) => (
        <button
          aria-pressed={item.id === selectedId}
          className={`${styles.item} ${item.id === selectedId ? styles.selected : ''}`}
          key={item.id}
          onClick={() => onSelect?.(item.id)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
