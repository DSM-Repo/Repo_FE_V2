'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

import { getSavedAuthRole, type AuthLoginRole } from '@/features/auth/api'
import { getLibraryBooks, type LibraryBookGroup } from '@/features/library/api'
import type { InternalHref } from '@/shared/lib/internalHref'
import type { AppHeaderItem, LibraryBookCardProps } from '@/shared/ui'
import { AppHeader, LibraryBookCard, Toast } from '@/shared/ui'

import styles from './page.module.css'

const studentNavigationItems = [
  { href: '/home', label: '홈', value: 'home' },
  { href: '/resume', label: '이력서 관리', value: 'resume' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

const teacherNavigationItems = [
  { href: '/majors', label: '전공 관리', value: 'majors' },
  { href: '/students', label: '학생 관리', value: 'students' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

type LibraryPageContentProps = {
  readonly showsLoadError: boolean
}

type LibraryLoadState =
  | {
      readonly kind: 'failure'
      readonly message: string
    }
  | {
      readonly books: readonly LibraryBookGroup[]
      readonly kind: 'success'
    }
  | {
      readonly kind: 'loading'
    }

function subscribeToSavedAuthRole(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)

  return () => window.removeEventListener('storage', onStoreChange)
}

function getSavedAuthRoleSnapshot(): AuthLoginRole {
  return getSavedAuthRole() ?? 'student'
}

function getServerAuthRoleSnapshot(): AuthLoginRole {
  return 'student'
}

function toLibraryBookCard(book: LibraryBookGroup): LibraryBookCardProps {
  const href: InternalHref = `/library?date=${book.date}`

  return {
    ariaLabel: `${book.date} ${book.cohort}기 ${book.year}학년 포트폴리오 열람`,
    batchLabel: `${book.cohort}기`,
    gradeLabel: `${book.year}학년`,
    href,
    title: String(book.date),
  }
}

export function LibraryPageContent({ showsLoadError }: LibraryPageContentProps) {
  const role = useSyncExternalStore(subscribeToSavedAuthRole, getSavedAuthRoleSnapshot, getServerAuthRoleSnapshot)
  const [loadState, setLoadState] = useState<LibraryLoadState>({ kind: 'loading' })
  const navigationItems = role === 'teacher' ? teacherNavigationItems : studentNavigationItems
  const libraryBooks = loadState.kind === 'success' ? loadState.books.map(toLibraryBookCard) : []

  useEffect(() => {
    let ignoresResult = false

    async function loadLibraryBooks() {
      const result = await getLibraryBooks()

      if (ignoresResult) {
        return
      }

      if (result.kind === 'success') {
        setLoadState({
          books: result.books,
          kind: 'success',
        })
        return
      }

      setLoadState({
        kind: 'failure',
        message: result.message,
      })
    }

    void loadLibraryBooks()

    return () => {
      ignoresResult = true
    }
  }, [])

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
          {loadState.kind === 'loading' ? <p className={styles.emptyMessage}>도서관을 불러오는 중입니다.</p> : null}
          {loadState.kind === 'failure' ? (
            <p className={styles.emptyMessage} role="alert">
              {loadState.message}
            </p>
          ) : null}
          {loadState.kind === 'success' && libraryBooks.length > 0 ? (
            libraryBooks.map((book) => <LibraryBookCard key={book.ariaLabel} {...book} />)
          ) : null}
          {loadState.kind === 'success' && libraryBooks.length === 0 ? (
            <p className={styles.emptyMessage}>공개된 포트폴리오 책이 없습니다.</p>
          ) : null}
        </div>
      </section>
    </main>
  )
}
