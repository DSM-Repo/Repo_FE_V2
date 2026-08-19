import type { InputHTMLAttributes } from 'react'

import { Icon } from '@/shared/ui/Icon'

import styles from './SearchField.module.css'

export type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'> & {
  readonly 'aria-label'?: string
  readonly className?: string
}

export function SearchField({ 'aria-label': ariaLabel = '학생 이름 검색', className, placeholder = '이름으로 학생을 찾아보세요.', ...props }: SearchFieldProps) {
  return (
    <label className={[styles.field, className].filter(Boolean).join(' ')}>
      <input aria-label={ariaLabel} className={styles.input} placeholder={placeholder} type="search" {...props} />
      <Icon className={styles.icon} name="search" />
    </label>
  )
}
