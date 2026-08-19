import Link from 'next/link'

import { Icon, Logo } from '@/shared/ui'

import styles from './AppHeader.module.css'

export type AppHeaderItem = {
  readonly href: string
  readonly label: string
  readonly value: string
}

export type AppHeaderProps = {
  readonly activeItem?: string
  readonly items: readonly AppHeaderItem[]
  readonly loginHref?: string
  readonly showLogin?: boolean
}

export function AppHeader({ activeItem, items, loginHref = '/login', showLogin = false }: AppHeaderProps) {
  return (
    <header className={styles.header}>
      <Logo />
      <nav className={styles.nav} aria-label="주요 메뉴">
        {items.map((item) => {
          const isActive = item.value === activeItem

          return (
            <Link className={`${styles.navItem} ${isActive ? styles.active : ''}`} href={item.href} key={item.value} aria-current={isActive ? 'page' : undefined}>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className={styles.action}>
        {showLogin ? (
          <Link className={styles.loginButton} href={loginHref}>
            <Icon name="login" />
            <span>로그인</span>
          </Link>
        ) : (
          <Link className={styles.iconButton} href={loginHref} aria-label="알림">
            <Icon name="bell" />
          </Link>
        )}
      </div>
    </header>
  )
}
