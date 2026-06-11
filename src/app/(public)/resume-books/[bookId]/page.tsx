import styles from '../../publicRoute.module.css'

type ResumeBookPageProps = {
  params: Promise<{
    bookId: string
  }>
}

export default async function ResumeBookPage({ params }: ResumeBookPageProps) {
  const { bookId } = await params

  return (
    <main>
      <div className={styles.pageShell}>
        <section className={styles.heroCard} aria-labelledby="resume-book-title">
          <span className={styles.eyebrow}>Resume Book</span>
          <h1 id="resume-book-title" className={styles.heroTitle}>
            {bookId} 레주메북
          </h1>
          <p className={styles.heroDescription}>
            학년/전공/주제별 학생 포트폴리오를 모아보는 레주메북 화면의 Next.js route placeholder입니다.
          </p>
        </section>
      </div>
    </main>
  )
}
