'use client'

import type { HTMLAttributes, KeyboardEvent } from 'react'
import { useId, useState } from 'react'

import styles from './Dropdown.module.css'

export type DropdownOption = {
  disabled?: boolean
  label: string
  value: string
}

export interface DropdownProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  defaultOpen?: boolean
  disabled?: boolean
  onOpenChange?: (open: boolean) => void
  onValueChange: (value: string) => void
  open?: boolean
  options: DropdownOption[]
  value: string
}

export function Dropdown({
  className,
  defaultOpen = false,
  disabled = false,
  onKeyDown,
  onOpenChange,
  onValueChange,
  open,
  options,
  value,
  ...props
}: DropdownProps) {
  const listboxId = useId()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isOpen = open ?? uncontrolledOpen
  const selectedOption = options.find((option) => option.value === value) ?? options[0]
  const visibleOptions = options.filter((option) => option.value !== selectedOption?.value)
  const dropdownClassName = [styles.dropdown, className].filter(Boolean).join(' ')

  const setOpen = (nextOpen: boolean) => {
    if (open === undefined) {
      setUncontrolledOpen(nextOpen)
    }

    onOpenChange?.(nextOpen)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)

    if (event.defaultPrevented) {
      return
    }

    if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const trigger = (
    <button
      aria-controls={isOpen ? listboxId : undefined}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''}`}
      disabled={disabled}
      type="button"
      onClick={() => setOpen(!isOpen)}
    >
      <span className={styles.label}>{selectedOption?.label}</span>
      <ChevronIcon className={styles.chevron} direction={isOpen ? 'up' : 'down'} />
    </button>
  )

  return (
    <div className={dropdownClassName} onKeyDown={handleKeyDown} {...props}>
      {isOpen ? (
        <div className={styles.panel}>
          {trigger}
          <ul className={styles.listbox} id={listboxId} role="listbox" aria-label="드롭다운 옵션">
            {visibleOptions.map((option) => (
              <li key={option.value} role="presentation">
                <button
                  aria-selected={false}
                  className={styles.option}
                  disabled={option.disabled}
                  role="option"
                  type="button"
                  onClick={() => {
                    if (option.disabled) {
                      return
                    }

                    onValueChange(option.value)
                    setOpen(false)
                  }}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        trigger
      )}
    </div>
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
      height="20"
      viewBox="0 0 20 20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={direction === 'up' ? 'M4 12L10 6L16 12' : 'M4 8L10 14L16 8'}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  )
}
