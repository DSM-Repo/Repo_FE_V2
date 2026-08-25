'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import type { AppHeaderItem, MajorListItem, ToastVariant } from '@/shared/ui'
import { AppHeader, Button, Dropdown, LinkRow, MajorInputGroup, MajorList, Toast } from '@/shared/ui'

import styles from './page.module.css'

const navigationItems = [
  { href: '/majors', label: '전공 관리', value: 'majors' },
  { href: '/students', label: '학생 관리', value: 'students' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

type Major = MajorListItem & {
  readonly createdAt: string
  readonly hasStudents: boolean
}

type Student = {
  readonly classNumber: string
  readonly id: number
  readonly name: string
  readonly number: string
  readonly year: string
}

type Notice = {
  readonly message: string
  readonly variant: ToastVariant
}

const initialMajors: readonly Major[] = Array.from({ length: 9 }, (_, index) => ({
  createdAt: '2023.05.23',
  hasStudents: index === 0,
  id: `major-${index + 1}`,
  name: 'Frontend Developer',
}))

const students: readonly Student[] = Array.from({ length: 8 }, (_, index) => ({
  classNumber: '4',
  id: index + 1,
  name: '최하은',
  number: '2415',
  year: String(2023 + (index % 4)),
}))

const yearFilters = [
  { label: '전체', value: 'all' },
  { label: '2023', value: '2023' },
  { label: '2024', value: '2024' },
  { label: '2025', value: '2025' },
  { label: '2026', value: '2026' },
] as const

const classFilters = [
  { label: '전체', value: 'all' },
  { label: '1반', value: '1' },
  { label: '2반', value: '2' },
  { label: '3반', value: '3' },
  { label: '4반', value: '4' },
]

export default function TeacherMajorsPage() {
  const [majors, setMajors] = useState<readonly Major[]>(initialMajors)
  const [selectedMajorId, setSelectedMajorId] = useState<string | null>(null)
  const [majorName, setMajorName] = useState('')
  const [majorNameError, setMajorNameError] = useState<string | undefined>()
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedClass, setSelectedClass] = useState('all')
  const [notice, setNotice] = useState<Notice | null>(null)
  const nextMajorId = useRef(initialMajors.length + 1)
  const noticeTimerId = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedMajor = majors.find((major) => major.id === selectedMajorId) ?? null
  const filteredStudents = useMemo(() => {
    if (!selectedMajor?.hasStudents) {
      return []
    }

    return students.filter(
      (student) =>
        (selectedYear === 'all' || student.year === selectedYear) &&
        (selectedClass === 'all' || student.classNumber === selectedClass),
    )
  }, [selectedClass, selectedMajor, selectedYear])

  useEffect(() => {
    return () => {
      if (noticeTimerId.current) {
        clearTimeout(noticeTimerId.current)
      }
    }
  }, [])

  const showNotice = (nextNotice: Notice) => {
    if (noticeTimerId.current) {
      clearTimeout(noticeTimerId.current)
    }

    setNotice(nextNotice)
    noticeTimerId.current = setTimeout(() => {
      setNotice(null)
      noticeTimerId.current = null
    }, 2500)
  }

  const selectMajor = (majorId: string) => {
    setSelectedMajorId(majorId)
    setSelectedYear('all')
    setSelectedClass('all')
  }

  const addMajor = () => {
    const normalizedMajorName = majorName.trim()

    if (!normalizedMajorName) {
      setMajorNameError('전공명을 입력해 주세요.')
      return
    }

    const newMajor: Major = {
      createdAt: '2026.08.25',
      hasStudents: false,
      id: `major-${nextMajorId.current}`,
      name: normalizedMajorName,
    }

    nextMajorId.current += 1
    setMajors((currentMajors) => [...currentMajors, newMajor])
    setMajorName('')
    setMajorNameError(undefined)
    showNotice({ message: '전공이 추가되었습니다.', variant: 'success' })
  }

  const deleteSelectedMajor = () => {
    if (!selectedMajor) {
      return
    }

    setMajors((currentMajors) => currentMajors.filter((major) => major.id !== selectedMajor.id))
    setSelectedMajorId(null)
    showNotice({ message: '전공이 삭제되었습니다.', variant: 'success' })
  }

  return (
    <main className={styles.page} data-major-selected={selectedMajor ? 'true' : 'false'}>
      <AppHeader activeItem="majors" items={navigationItems} />

      <section className={styles.content} aria-labelledby="majors-title">
        {notice ? (
          <div className={styles.toastLayer}>
            <Toast variant={notice.variant}>{notice.message}</Toast>
          </div>
        ) : null}

        <header className={styles.hero}>
          <h1 id="majors-title">전공 관리</h1>
          <p>학생들의 전공을 체계적으로 관리하세요.</p>
        </header>

        <form
          aria-label="전공 추가"
          className={styles.majorForm}
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            addMajor()
          }}
        >
          <MajorInputGroup
            ariaLabelPrefix="추가할 전공"
            errorMessage={majorNameError}
            inputs={[{ id: '이름', placeholder: '추가할 전공을 입력해주세요.', value: majorName }]}
            onChange={(_, value) => {
              setMajorName(value)
              if (majorNameError) {
                setMajorNameError(undefined)
              }
            }}
          />
          <Button className={styles.addButton} iconRight="plus" type="submit">
            전공 추가
          </Button>
        </form>

        <div className={styles.management}>
          <div className={styles.majorList}>
            <MajorList
              items={majors}
              label="전공 목록"
              selectedId={selectedMajorId ?? undefined}
              onSelect={selectMajor}
            />
          </div>

          {selectedMajor ? (
            <section className={styles.detailPanel} aria-labelledby="selected-major-title">
              <header className={styles.detailHeader}>
                <h2 id="selected-major-title">{selectedMajor.name}</h2>
                <p>생성일 : {selectedMajor.createdAt}</p>
              </header>

              <div className={styles.detailDivider} />

              <div className={styles.filters}>
                <div className={styles.yearTabs} aria-label="연도 필터">
                  {yearFilters.map((filter) => (
                    <button
                      aria-pressed={selectedYear === filter.value}
                      className={selectedYear === filter.value ? styles.activeYear : undefined}
                      key={filter.value}
                      type="button"
                      onClick={() => setSelectedYear(filter.value)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <Dropdown
                  aria-label="반 필터"
                  className={styles.classDropdown}
                  onValueChange={setSelectedClass}
                  options={classFilters}
                  value={selectedClass}
                />
              </div>

              <div className={styles.studentContent}>
                {filteredStudents.length > 0 ? (
                  <div className={styles.studentList} aria-label={`${selectedMajor.name} 소속 학생`}>
                    {filteredStudents.map((student) => (
                      <LinkRow
                        actionLabel="레주메 보러가기"
                        className={styles.studentRow}
                        href={`/students/${student.id}`}
                        key={student.id}
                        title={`${student.number} ${student.name}`}
                      />
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyMessage}>해당 전공에 소속된 학생이 없습니다.</p>
                )}
              </div>

              <button className={styles.deleteButton} type="button" onClick={deleteSelectedMajor}>
                <TrashIcon />
                <span>전공 삭제</span>
              </button>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  )
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.75 5.25H14.25" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      <path d="M7 2.75H11L11.75 5.25H6.25L7 2.75Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M5.25 5.25L6 15.25H12L12.75 5.25" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M7.5 8V12.5M10.5 8V12.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  )
}
