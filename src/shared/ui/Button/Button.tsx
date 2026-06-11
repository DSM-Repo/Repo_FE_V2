import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { Icon, type IconName } from '@/shared/ui/Icon'

import styles from './Button.module.css'

export type ButtonVariant = 'filled' | 'bordered-dark'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  iconRight?: IconName
  variant?: ButtonVariant
}

const variantClassName: Record<ButtonVariant, string> = {
  filled: styles.filled,
  'bordered-dark': styles.borderedDark,
}

export function Button({ children, className, iconRight, type = 'button', variant = 'filled', ...props }: ButtonProps) {
  const buttonClassName = [styles.button, variantClassName[variant], className].filter(Boolean).join(' ')

  return (
    <button className={buttonClassName} type={type} {...props}>
      <span>{children}</span>
      {iconRight ? <Icon className={styles.icon} name={iconRight} /> : null}
    </button>
  )
}
