import type { HTMLAttributes, ReactNode } from 'react'

import styles from './Toast.module.css'

export type ToastVariant = 'error' | 'success'

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  variant: ToastVariant
}

const toastVariantClassName: Record<ToastVariant, string> = {
  error: styles.error,
  success: styles.success,
}

export function Toast({ children, className, variant, ...props }: ToastProps) {
  const toastClassName = [styles.toast, toastVariantClassName[variant], className].filter(Boolean).join(' ')
  const role = variant === 'error' ? 'alert' : 'status'

  return (
    <div className={toastClassName} role={role} {...props}>
      <ToastIcon className={styles.icon} variant={variant} />
      <span className={styles.message}>{children}</span>
    </div>
  )
}

type ToastIconProps = {
  className?: string
  variant: ToastVariant
}

function ToastIcon({ className, variant }: ToastIconProps) {
  if (variant === 'success') {
    return (
      <svg
        aria-hidden="true"
        className={className}
        fill="none"
        height="24"
        viewBox="0 0 24 24"
        width="24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20 7.2C18.45 4.65 15.65 3 12.5 3C7.8 3 4 6.8 4 11.5C4 16.2 7.8 20 12.5 20C15.4 20 17.95 18.55 19.5 16.35"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
        <path
          d="M8.5 11.7L11 14.2L16.6 8.6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 3L21 20H3L12 3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path d="M12 8.8V14" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
      <path d="M12 17.1H12.01" stroke="currentColor" strokeLinecap="round" strokeWidth="3.2" />
    </svg>
  )
}
