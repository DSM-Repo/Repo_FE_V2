import Link from 'next/link'

import styles from './publicRoute.module.css'

export default function HomePage() {
  return (
    <main>
      <div className={styles.pageShell}>
        <section className={styles.heroCard} aria-labelledby="home-title">
          <span className={styles.eyebrow}>Repo</span>
          <h1 id="home-title" className={styles.heroTitle}>
            대덕소프트마이스터고 학생을 위한 포트폴리오 플랫폼
          </h1>
          <p className={styles.heroDescription}>
            Repo는 학생의 이력서와 포트폴리오를 정리하고, 공개 URL을 통해 성장 기록을 보여주기 위한 서비스입니다.
          </p>
          <div className={styles.actionRow}>
            <Link className={`${styles.actionLink} ${styles.primaryActionLink}`} href="/오혜민">
              공개 포트폴리오 예시
            </Link>
            <Link className={styles.actionLink} href="/resume-books/sample">
              레주메북 예시
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
