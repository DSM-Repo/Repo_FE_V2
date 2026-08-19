'use client'

import type { ChangeEventHandler, ReactNode } from 'react'

import styles from './TextSlot.module.css'

export type TextSlotVariant = 'compact' | 'wide'

export type TextSlotProps = {
  readonly className?: string
  readonly editableAriaLabel?: string
  readonly editablePlaceholder?: string
  readonly editableValue?: string
  readonly errorMessage?: string
  readonly label: ReactNode
  readonly onEditableValueChange?: (value: string) => void
  readonly value?: ReactNode
  readonly variant?: TextSlotVariant
}

const variantClassName: Record<TextSlotVariant, string> = {
  compact: styles.compact,
  wide: styles.wide,
}

export function TextSlot({
  className,
  editableAriaLabel = '텍스트 입력',
  editablePlaceholder,
  editableValue,
  errorMessage,
  label,
  onEditableValueChange,
  value,
  variant = 'compact',
}: TextSlotProps) {
  const slotClassName = [styles.slot, variantClassName[variant], errorMessage ? styles.error : '', className].filter(Boolean).join(' ')
  const handleEditableValueChange: ChangeEventHandler<HTMLInputElement> = (event) => onEditableValueChange?.(event.target.value)

  return (
    <section className={slotClassName}>
      <p className={styles.label}>{label}</p>
      <div className={styles.line} aria-hidden="true" />
      {value ? <p className={styles.value}>{value}</p> : null}
      {editableValue !== undefined ? (
        <input
          aria-label={editableAriaLabel}
          className={styles.editable}
          onChange={handleEditableValueChange}
          placeholder={editablePlaceholder}
          value={editableValue}
        />
      ) : null}
      {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}
    </section>
  )
}
