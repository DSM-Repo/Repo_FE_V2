import Link from 'next/link'

import { samplePortfolioHref, sampleResumeBookHref } from '@/shared/fixtures/examples/publicExamples'
import { LibraryBookCard } from '@/shared/ui'

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
            <Link className={`${styles.actionLink} ${styles.primaryActionLink}`} href={samplePortfolioHref}>
              공개 포트폴리오 예시
            </Link>
            <Link className={styles.actionLink} href={sampleResumeBookHref}>
              레주메북 예시
            </Link>
          </div>
        </section>

        <section className={styles.exampleSection} aria-labelledby="home-example-title">
          <div className={styles.exampleSectionHeader}>
            <span className={styles.eyebrow}>Examples</span>
            <h2 id="home-example-title" className={styles.exampleTitle}>
              바로 확인하는 포트폴리오와 레주메북 예시
            </h2>
            <p className={styles.exampleDescription}>
              실제 데이터 연동 전에도 공개 포트폴리오와 레주메북의 진입 카드를 같은 컴포넌트 패턴으로 확인합니다.
            </p>
          </div>

          <div className={styles.libraryBookGrid}>
            <LibraryBookCard href={samplePortfolioHref} title="2022" batchLabel="9기" gradeLabel="2학년" actionLabel="포트폴리오 열람" />
            <LibraryBookCard href={sampleResumeBookHref} title="2022" batchLabel="9기" gradeLabel="2학년" actionLabel="레주메북 열람" />
          </div>
        </section>
      </div>
    </main>
  )
}
