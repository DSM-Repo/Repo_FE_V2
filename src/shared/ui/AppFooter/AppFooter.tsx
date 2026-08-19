import Link from 'next/link'

import styles from './AppFooter.module.css'

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <strong className={styles.brand}>Repo</strong>
        <p className={styles.copy}>©2026 REPO</p>
        <address className={styles.address}>
          주소 : 대전광역시 유성구 가정북로 76 (장동 23-9)
          <br />
          교무실 : 042-866-8822 | Fax : 042-867-9900 | 행정실 : 042-866-8885 | Fax : 042-863-4308
        </address>
        <nav className={styles.links} aria-label="약관">
          <Link href="/terms">이용약관</Link>
          <span aria-hidden="true">|</span>
          <Link href="/privacy">개인정보처리방침</Link>
        </nav>
      </div>
    </footer>
  )
}
