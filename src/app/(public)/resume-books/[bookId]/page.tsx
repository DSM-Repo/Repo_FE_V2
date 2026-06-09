type ResumeBookPageProps = {
  params: Promise<{
    bookId: string
  }>
}

export default async function ResumeBookPage({ params }: ResumeBookPageProps) {
  const { bookId } = await params

  return (
    <main>
      <div className="page-shell">
        <section className="hero-card" aria-labelledby="resume-book-title">
          <span className="eyebrow">Resume Book</span>
          <h1 id="resume-book-title" className="hero-title">
            {bookId} 레주메북
          </h1>
          <p className="hero-description">
            학년/전공/주제별 학생 포트폴리오를 모아보는 레주메북 화면의 Next.js route placeholder입니다.
          </p>
        </section>
      </div>
    </main>
  )
}
