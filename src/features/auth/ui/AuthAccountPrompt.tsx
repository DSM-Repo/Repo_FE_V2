import Link from 'next/link'

import styles from './AuthAccountPrompt.module.css'

type AuthAccountPromptProps = {
  readonly className?: string
  readonly href: '/login' | '/signup'
  readonly linkLabel: string
  readonly prompt: string
}

export function AuthAccountPrompt({ className, href, linkLabel, prompt }: AuthAccountPromptProps) {
  const rootClassName = className ? `${styles.root} ${className}` : styles.root

  return (
    <p className={rootClassName}>
      <span>{prompt}</span>
      <Link className={styles.link} href={href}>
        {linkLabel}
      </Link>
    </p>
  )
}
