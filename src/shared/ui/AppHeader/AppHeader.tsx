'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { clearAuthTokens } from '@/features/auth/api'
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
  readonly showLogout?: boolean
  readonly showLogin?: boolean
}

export function AppHeader({ activeItem, items, loginHref = '/login', showLogout = false, showLogin = false }: AppHeaderProps) {
  const router = useRouter()

  const handleLogout = () => {
    clearAuthTokens()
    router.replace('/login')
  }

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
        ) : showLogout ? (
          <button className={styles.iconButton} onClick={handleLogout} type="button" aria-label="로그아웃" title="로그아웃">
            <Icon name="logout" />
          </button>
        ) : (
          <Link className={styles.iconButton} href={loginHref} aria-label="로그인" title="로그인">
            <Icon name="login" />
          </Link>
        )}
      </div>
    </header>
  )
}
