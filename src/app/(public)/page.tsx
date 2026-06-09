import Link from 'next/link'

const publishingReadiness = [
  {
    title: 'Next.js App Router',
    description: '공개 페이지의 metadata, semantic content, server/static rendering 기준을 우선 적용합니다.',
  },
  {
    title: 'Slug URL',
    description: '학생 포트폴리오는 /오혜민처럼 읽기 쉬운 공개 URL을 목표로 설계합니다.',
  },
  {
    title: 'Simple Mock',
    description: '퍼블리싱 단계에서는 MSW 없이 화면 가까이에 있는 단순 object mock data로 시작합니다.',
  },
]

export default function HomePage() {
  return (
    <main>
      <div className="page-shell">
        <section className="hero-card" aria-labelledby="home-title">
          <span className="eyebrow">Repo-V2 Publishing Base</span>
          <h1 id="home-title" className="hero-title">
            학생 포트폴리오를 외부에 보여주는 제품 기준으로 시작합니다.
          </h1>
          <p className="hero-description">
            Repo-V2는 대덕소프트마이스터고 학생의 이력서와 포트폴리오를 관리하고,
            장기적으로 공개 포트폴리오와 레주메북까지 연결하는 서비스입니다.
          </p>
          <div className="action-row" aria-label="주요 이동 링크">
            <Link className="action-link primary" href="/오혜민">
              공개 포트폴리오 예시
            </Link>
            <Link className="action-link" href="/resume-books/2026">
              레주메북 예시
            </Link>
          </div>
        </section>

        <section className="info-grid" aria-label="퍼블리싱 기준">
          {publishingReadiness.map((item) => (
            <article className="info-card" key={item.title}>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
