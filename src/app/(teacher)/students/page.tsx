'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import type { AppHeaderItem, LinkRowTone } from '@/shared/ui'
import { AppHeader, ClassCard, LinkRow, SearchField, Toast } from '@/shared/ui'

import styles from './page.module.css'

const navigationItems = [
  { href: '/majors', label: '전공 관리', value: 'majors' },
  { href: '/students', label: '학생 관리', value: 'students' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

const grades = [
  { label: '1학년', value: 1 },
  { label: '2학년', value: 2 },
  { label: '3학년', value: 3 },
] as const

const classes = [1, 2, 3, 4] as const

type Grade = (typeof grades)[number]['value']
type ClassNumber = (typeof classes)[number]
type SubmissionStatus = 'missing' | 'submitted'

type SelectedClass = {
  readonly grade: Grade
  readonly classNumber: ClassNumber
}

type StudentSummary = {
  readonly id: number
  readonly name: string
  readonly number: string
  readonly status: SubmissionStatus
}

const classSize = 16
const lastUpdatedDate = '2023.05.23'

const students = [
  { id: 1, name: '최하은', number: '2415', status: 'missing' },
  { id: 2, name: '최하은', number: '2415', status: 'submitted' },
  { id: 3, name: '최하은', number: '2415', status: 'missing' },
  { id: 4, name: '최하은', number: '2415', status: 'missing' },
  { id: 5, name: '최하은', number: '2415', status: 'missing' },
  { id: 6, name: '최하은', number: '2415', status: 'submitted' },
  { id: 7, name: '최하은', number: '2415', status: 'submitted' },
  { id: 8, name: '최하은', number: '2415', status: 'missing' },
  { id: 9, name: '최하은', number: '2415', status: 'missing' },
] satisfies readonly StudentSummary[]

const statusLabel: Record<SubmissionStatus, string> = {
  missing: '미제출',
  submitted: '제출됨',
}

const statusTone: Record<SubmissionStatus, LinkRowTone> = {
  missing: 'missing',
  submitted: 'submitted',
}

export default function TeacherStudentsPage() {
  return (
    <Suspense fallback={null}>
      <TeacherStudentsContent />
    </Suspense>
  )
}

function TeacherStudentsContent() {
  const searchParams = useSearchParams()
  const [selectedClass, setSelectedClass] = useState<SelectedClass | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const showsLoadError = searchParams.get('error') === 'students'

  useEffect(() => {
    if (!selectedClass) {
      return undefined
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedClass(null)
      }
    }

    window.addEventListener('keydown', closeOnEscape)

    return () => {
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [selectedClass])

  const selectedClassLabel = useMemo(() => {
    if (!selectedClass) {
      return ''
    }

    return `2026 ${selectedClass.grade}학년 ${selectedClass.classNumber}반`
  }, [selectedClass])

  return (
    <main className={styles.page} data-dialog-open={selectedClass ? 'true' : 'false'}>
      <AppHeader activeItem="students" items={navigationItems} />
      {showsLoadError ? (
        <div className={styles.toastLayer}>
          <Toast variant="error">학생 목록을 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.</Toast>
        </div>
      ) : null}

      <section className={styles.content} aria-labelledby="students-title">
        <div className={styles.contentLayer}>
          <div className={styles.hero}>
            <h1 className={styles.title} id="students-title">
              학생 관리
            </h1>
            <p className={styles.description}>학생들의 이력서를 확인하고, 피드백을 달아보세요!</p>
            <SearchField
              className={styles.searchField}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              spellCheck={false}
            />
          </div>

          <div className={styles.gradeGrid} aria-label="학년별 반 목록">
            {grades.map((grade) => (
              <section className={styles.gradeColumn} aria-labelledby={`grade-${grade.value}`} key={grade.value}>
                <h2 className={styles.gradeTitle} id={`grade-${grade.value}`}>
                  {grade.label}
                </h2>
                <div className={styles.divider} />
                <div className={styles.classList}>
                  {classes.map((classNumber) => (
                    <ClassCard
                      count={classSize}
                      key={`${grade.value}-${classNumber}`}
                      title={`${classNumber}반`}
                      onClick={() => setSelectedClass({ classNumber, grade: grade.value })}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {selectedClass ? (
          <div className={styles.dialogLayer} role="presentation" onMouseDown={() => setSelectedClass(null)}>
            <section
              aria-labelledby="class-dialog-title"
              aria-modal="true"
              className={styles.dialog}
              role="dialog"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button className={styles.closeButton} type="button" aria-label="반 상세 닫기" onClick={() => setSelectedClass(null)}>
                ×
              </button>

              <header className={styles.dialogHeader}>
                <h2 className={styles.dialogTitle} id="class-dialog-title">
                  {selectedClassLabel}
                </h2>
                <p className={styles.updatedAt}>마지막 업데이트 : {lastUpdatedDate}</p>
              </header>

              <div className={styles.dialogDivider} />

              <div className={styles.studentRows} aria-label={`${selectedClassLabel} 학생 제출 현황`}>
                {students.map((student) => (
                  <LinkRow
                    actionLabel="레주메 보러가기"
                    className={styles.studentRow}
                    href={`/students/${student.id}`}
                    key={student.id}
                    status={statusLabel[student.status]}
                    title={`${student.number} ${student.name}`}
                    tone={statusTone[student.status]}
                  />
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  )
}
