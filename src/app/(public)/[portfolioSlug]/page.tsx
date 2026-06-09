import type { Metadata } from 'next'

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
  const decodedSlug = decodeURIComponent(portfolioSlug)

  return {
    title: `${decodedSlug} 포트폴리오`,
    description: `${decodedSlug} 학생의 공개 포트폴리오`,
  }
}

export default async function PortfolioPage({ params }: PortfolioPageProps) {
  const { portfolioSlug } = await params
  const decodedSlug = decodeURIComponent(portfolioSlug)
  const displayName = decodedSlug === mockPortfolio.name ? mockPortfolio.name : decodedSlug

  return (
    <main>
      <div className="page-shell">
        <section className="hero-card" aria-labelledby="portfolio-title">
          <span className="eyebrow">Public Portfolio</span>
          <h1 id="portfolio-title" className="hero-title">
            {displayName}
          </h1>
          <p className="hero-description">{mockPortfolio.headline}</p>
          <div className="info-grid" aria-label="포트폴리오 요약">
            <article className="info-card">
              <h2>School</h2>
              <p>{mockPortfolio.school}</p>
            </article>
            <article className="info-card">
              <h2>Slug</h2>
              <p>/{decodedSlug}</p>
            </article>
            <article className="info-card">
              <h2>Skills</h2>
              <p>{mockPortfolio.skills.join(' · ')}</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}
