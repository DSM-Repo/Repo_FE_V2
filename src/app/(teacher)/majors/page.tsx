'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getSavedAccessToken } from '@/features/auth/api'
import { createMajor, deleteMajor, getMajors, type Major as ApiMajor } from '@/features/major/api'
import type { AppHeaderItem, MajorListItem, ToastVariant } from '@/shared/ui'
import { AppHeader, Button, Dropdown, LinkRow, MajorInputGroup, MajorList, Toast } from '@/shared/ui'

import styles from './page.module.css'

const navigationItems = [
  { href: '/majors', label: '전공 관리', value: 'majors' },
  { href: '/students', label: '학생 관리', value: 'students' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

type Major = MajorListItem & {
  readonly hasStudents: boolean
  readonly majorId: number
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

const initialMajors: readonly Major[] = []

const students: readonly Student[] = []

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

function toMajor(major: ApiMajor): Major {
  return {
    hasStudents: false,
    id: String(major.majorId),
    majorId: major.majorId,
    name: major.name,
  }
}

export default function TeacherMajorsPage() {
  const [majors, setMajors] = useState<readonly Major[]>(initialMajors)
  const [selectedMajorId, setSelectedMajorId] = useState<string | null>(null)
  const [majorName, setMajorName] = useState('')
  const [majorNameError, setMajorNameError] = useState<string | undefined>()
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedClass, setSelectedClass] = useState('all')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [isLoadingMajors, setIsLoadingMajors] = useState(false)
  const [isSubmittingMajor, setIsSubmittingMajor] = useState(false)
  const [isDeletingMajor, setIsDeletingMajor] = useState(false)
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

  const showNotice = useCallback((nextNotice: Notice) => {
    if (noticeTimerId.current) {
      clearTimeout(noticeTimerId.current)
    }

    setNotice(nextNotice)
    noticeTimerId.current = setTimeout(() => {
      setNotice(null)
      noticeTimerId.current = null
    }, 2500)
  }, [])

  const loadMajors = useCallback(async () => {
    const accessToken = getSavedAccessToken()

    if (!accessToken) {
      showNotice({ message: '로그인 후 전공 목록을 조회할 수 있습니다.', variant: 'error' })
      return
    }

    setIsLoadingMajors(true)

    const result = await getMajors({ accessToken })

    setIsLoadingMajors(false)

    if (result.kind !== 'success') {
      showNotice({ message: result.message, variant: 'error' })
      return
    }

    setMajors(result.value.majors.map(toMajor))
    setSelectedMajorId((currentId) => {
      if (!currentId || result.value.majors.some((major) => String(major.majorId) === currentId)) {
        return currentId
      }

      return null
    })
  }, [showNotice])

  useEffect(() => {
    void Promise.resolve().then(loadMajors)
  }, [loadMajors])

  const toFailureNotice = (message: string): Notice => {
    return {
      message,
      variant: 'error',
    }
  }

  const selectMajor = (majorId: string) => {
    setSelectedMajorId(majorId)
    setSelectedYear('all')
    setSelectedClass('all')
  }

  const addMajor = async () => {
    const normalizedMajorName = majorName.trim()

    if (isSubmittingMajor) {
      return
    }

    if (!normalizedMajorName) {
      setMajorNameError('전공명을 입력해 주세요.')
      return
    }

    const accessToken = getSavedAccessToken()

    if (!accessToken) {
      showNotice({ message: '로그인 후 전공을 추가할 수 있습니다.', variant: 'error' })
      return
    }

    setIsSubmittingMajor(true)

    const result = await createMajor({
      accessToken,
      name: normalizedMajorName,
    })

    setIsSubmittingMajor(false)

    if (result.kind !== 'success') {
      showNotice(toFailureNotice(result.message))
      return
    }

    const newMajor = toMajor(result.major)

    setMajors((currentMajors) => [...currentMajors, newMajor].sort((left, right) => left.name.localeCompare(right.name, 'ko')))
    setSelectedMajorId(newMajor.id)
    setMajorName('')
    setMajorNameError(undefined)
    showNotice({ message: '전공이 추가되었습니다.', variant: 'success' })
  }

  const deleteSelectedMajor = async () => {
    if (!selectedMajor || isDeletingMajor) {
      return
    }

    const accessToken = getSavedAccessToken()

    if (!accessToken) {
      showNotice({ message: '로그인 후 전공을 삭제할 수 있습니다.', variant: 'error' })
      return
    }

    setIsDeletingMajor(true)

    const result = await deleteMajor({
      accessToken,
      majorId: selectedMajor.majorId,
    })

    setIsDeletingMajor(false)

    if (result.kind !== 'success') {
      showNotice(toFailureNotice(result.message))
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
            void addMajor()
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
          <Button className={styles.addButton} disabled={isSubmittingMajor} iconRight="plus" type="submit">
            {isSubmittingMajor ? '추가 중' : '전공 추가'}
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
                <p>학생들이 선택할 수 있는 전공입니다.</p>
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

              <button className={styles.deleteButton} disabled={isDeletingMajor} type="button" onClick={() => void deleteSelectedMajor()}>
                <TrashIcon />
                <span>{isDeletingMajor ? '삭제 중' : '전공 삭제'}</span>
              </button>
            </section>
          ) : isLoadingMajors ? (
            <p className={styles.emptyMessage}>전공 목록을 불러오는 중입니다.</p>
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
