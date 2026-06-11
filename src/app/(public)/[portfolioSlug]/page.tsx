import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { isReservedPortfolioSlug, normalizePortfolioSlug } from '@/shared/lib/portfolioSlug'

import styles from '../publicRoute.module.css'

const mockPortfolio = {
  name: '오혜민',
  headline: '문제를 구조화하고 끝까지 구현하는 소프트웨어 메이커',
  school: '대덕소프트마이스터고등학교',
  skills: ['Product Thinking', 'Frontend', 'AI Native Workflow'],
}

type PortfolioPageProps = {
  params: Promise<{
    portfolioSlug: string
  }>
}

export async function generateMetadata({ params }: PortfolioPageProps): Promise<Metadata> {
  const { portfolioSlug } = await params

  if (isReservedPortfolioSlug(portfolioSlug)) {
    notFound()
  }

  const decodedSlug = normalizePortfolioSlug(portfolioSlug)

  return {
    title: `${decodedSlug} 포트폴리오`,
    description: `${decodedSlug} 학생의 공개 포트폴리오`,
  }
}

export default async function PortfolioPage({ params }: PortfolioPageProps) {
  const { portfolioSlug } = await params

  if (isReservedPortfolioSlug(portfolioSlug)) {
    notFound()
  }

  const decodedSlug = normalizePortfolioSlug(portfolioSlug)
  const displayName = decodedSlug === mockPortfolio.name ? mockPortfolio.name : decodedSlug

  return (
    <main>
      <div className={styles.pageShell}>
        <section className={styles.heroCard} aria-labelledby="portfolio-title">
          <span className={styles.eyebrow}>Public Portfolio</span>
          <h1 id="portfolio-title" className={styles.heroTitle}>
            {displayName}
          </h1>
          <p className={styles.heroDescription}>{mockPortfolio.headline}</p>
          <div className={styles.infoGrid} aria-label="포트폴리오 요약">
            <article className={styles.infoCard}>
              <h2>School</h2>
              <p>{mockPortfolio.school}</p>
            </article>
            <article className={styles.infoCard}>
              <h2>Slug</h2>
              <p>/{decodedSlug}</p>
            </article>
            <article className={styles.infoCard}>
              <h2>Skills</h2>
              <p>{mockPortfolio.skills.join(' · ')}</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}
