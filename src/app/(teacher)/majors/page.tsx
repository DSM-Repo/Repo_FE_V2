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
  readonly createdAt?: string
  readonly majorId: number
  readonly students: readonly Student[]
}

type Student = {
  readonly classNumber?: number
  readonly grade: number
  readonly id: number
  readonly name: string
  readonly resumeId?: string
  readonly schoolNumber: string
}

type Notice = {
  readonly message: string
  readonly variant: ToastVariant
}

const initialMajors: readonly Major[] = []

const gradeFilters = [
  { label: '전체', value: 'all' },
  { label: '1학년', value: '1' },
  { label: '2학년', value: '2' },
  { label: '3학년', value: '3' },
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
    ...(major.createdAt ? { createdAt: major.createdAt } : {}),
    id: String(major.majorId),
    majorId: major.majorId,
    name: major.name,
    students: major.students.map((student) => ({
      ...(student.classNumber !== undefined ? { classNumber: student.classNumber } : {}),
      grade: student.grade,
      id: student.studentId,
      name: student.name,
      ...(student.resumeId ? { resumeId: student.resumeId } : {}),
      schoolNumber: student.schoolNumber,
    })),
  }
}

function formatMajorCreatedAt(value: string | undefined) {
  if (!value) {
    return '생성일 : -'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return `생성일 : ${value}`
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `생성일 : ${year}.${month}.${day}`
}

export default function TeacherMajorsPage() {
  const [majors, setMajors] = useState<readonly Major[]>(initialMajors)
  const [selectedMajorId, setSelectedMajorId] = useState<string | null>(null)
  const [majorName, setMajorName] = useState('')
  const [majorNameError, setMajorNameError] = useState<string | undefined>()
  const [selectedGrade, setSelectedGrade] = useState('all')
  const [selectedClass, setSelectedClass] = useState('all')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [isLoadingMajors, setIsLoadingMajors] = useState(false)
  const [isSubmittingMajor, setIsSubmittingMajor] = useState(false)
  const [isDeletingMajor, setIsDeletingMajor] = useState(false)
  const noticeTimerId = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedMajor = majors.find((major) => major.id === selectedMajorId) ?? null
  const filteredStudents = useMemo(() => {
    if (!selectedMajor) {
      return []
    }

    return selectedMajor.students.filter(
      (student) =>
        (selectedGrade === 'all' || String(student.grade) === selectedGrade) &&
        (selectedClass === 'all' || String(student.classNumber) === selectedClass),
    )
  }, [selectedClass, selectedGrade, selectedMajor])

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
    setSelectedGrade('all')
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
      <AppHeader activeItem="majors" items={navigationItems} showLogout />

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
                <p>{formatMajorCreatedAt(selectedMajor.createdAt)}</p>
              </header>

              <div className={styles.detailDivider} />

              <div className={styles.filters}>
                <div className={styles.gradeTabs} aria-label="학년 필터">
                  {gradeFilters.map((filter) => (
                    <button
                      aria-pressed={selectedGrade === filter.value}
                      className={selectedGrade === filter.value ? styles.activeGrade : undefined}
                      key={filter.value}
                      type="button"
                      onClick={() => setSelectedGrade(filter.value)}
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
                        title={`${student.schoolNumber} ${student.name}`}
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
