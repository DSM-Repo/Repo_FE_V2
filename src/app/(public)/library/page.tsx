import type { AppHeaderItem, LibraryBookCardProps } from '@/shared/ui'
import { AppHeader, LibraryBookCard, Toast } from '@/shared/ui'

import styles from './page.module.css'

const navigationItems = [
  { href: '/majors', label: '전공 관리', value: 'majors' },
  { href: '/students', label: '학생 관리', value: 'students' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

const libraryBooks = Array.from({ length: 8 }, (_, index) => ({
  ariaLabel: `2022 9기 2학년 ${index + 1}번째 포트폴리오 열람`,
  batchLabel: '9기',
  gradeLabel: '2학년',
  href: `/resume-books/${index + 1}` as const,
  title: '2022',
})) satisfies readonly LibraryBookCardProps[]

type LibraryPageProps = {
  readonly searchParams?: Promise<{
    readonly error?: string
  }>
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const params = await searchParams
  const showsLoadError = params?.error === 'portfolio'

  return (
    <main className={styles.page}>
      <AppHeader activeItem="library" items={navigationItems} />
      {showsLoadError ? (
        <div className={styles.toastLayer}>
          <Toast variant="error">포트폴리오 문서를 불러오는데 실패하였습니다. 잠시 후 다시 시도해 주세요.</Toast>
        </div>
      ) : null}
      <section className={styles.content} aria-labelledby="library-title">
        <div className={styles.hero}>
          <h1 className={styles.title} id="library-title">
            도서관
          </h1>
          <p className={styles.description}>다양한 학생들의 포트폴리오를 둘러보세요.</p>
        </div>
        <div className={styles.books} aria-label="포트폴리오 책 목록">
          {libraryBooks.map((book) => (
            <LibraryBookCard key={book.ariaLabel} {...book} />
          ))}
        </div>
      </section>
    </main>
  )
}
