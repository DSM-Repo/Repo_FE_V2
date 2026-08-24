'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

import type { AppHeaderItem } from '@/shared/ui'
import { AppHeader, Button, CheckboxOption, ResumeBookSheet, SearchField, Tag, Toast } from '@/shared/ui'

import styles from './page.module.css'

const navigationItems = [
  { href: '/majors', label: '전공 관리', value: 'majors' },
  { href: '/students', label: '학생 관리', value: 'students' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

const majorFilters = [
  { chipLabel: 'Frontend', label: 'Frontend Developer', value: 'frontend' },
  { chipLabel: 'Backend', label: 'Backend Developer', value: 'backend' },
  { chipLabel: 'UI/UX', label: 'UI/UX Engineer', value: 'ui-ux' },
  { chipLabel: 'AI', label: 'AI Developer', value: 'ai' },
  { chipLabel: 'Blockchain', label: 'Blockchain Developer', value: 'blockchain' },
  { chipLabel: 'Embedded', label: 'Embedded Developer', value: 'embedded' },
  { chipLabel: 'Android', label: 'Android Developer', value: 'android' },
  { chipLabel: 'iOS', label: 'iOS Developer', value: 'ios' },
  { chipLabel: 'QA', label: 'QA Master', value: 'qa' },
] as const

const classFilters = ['1반', '2반', '3반', '4반'] as const

type MajorFilterValue = (typeof majorFilters)[number]['value']
type ClassFilterValue = (typeof classFilters)[number]

type FilterState = {
  readonly classes: readonly ClassFilterValue[]
  readonly majors: readonly MajorFilterValue[]
}

type FilterSectionKey = 'classes' | 'majors'

const defaultFilters: FilterState = {
  classes: ['4반'],
  majors: ['frontend', 'ui-ux'],
}

const defaultExpandedFilterSections: Record<FilterSectionKey, boolean> = {
  classes: false,
  majors: false,
}

export default function ResumeBookPage() {
  const router = useRouter()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showsDownloadToast, setShowsDownloadToast] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaultFilters)
  const [draftFilters, setDraftFilters] = useState<FilterState>(defaultFilters)
  const [expandedFilterSections, setExpandedFilterSections] = useState(defaultExpandedFilterSections)
  const downloadToastTimerId = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (downloadToastTimerId.current) {
        clearTimeout(downloadToastTimerId.current)
      }
    }
  }, [])

  const openFilter = () => {
    setDraftFilters(appliedFilters)
    setExpandedFilterSections(defaultExpandedFilterSections)
    setIsFilterOpen(true)
  }

  const closeFilter = () => {
    setDraftFilters(appliedFilters)
    setIsFilterOpen(false)
  }

  const applyFilters = () => {
    setAppliedFilters(draftFilters)
    setIsFilterOpen(false)
  }

  const resetFilters = () => {
    const emptyFilters: FilterState = { classes: [], majors: [] }

    setDraftFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
  }

  const toggleFilterSection = (sectionKey: FilterSectionKey) => {
    setExpandedFilterSections((currentSections) => ({
      ...currentSections,
      [sectionKey]: !currentSections[sectionKey],
    }))
  }

  const removeMajorFilter = (value: MajorFilterValue) => {
    setAppliedFilters((currentFilters) => ({
      ...currentFilters,
      majors: currentFilters.majors.filter((major) => major !== value),
    }))
  }

  const removeClassFilter = (value: ClassFilterValue) => {
    setAppliedFilters((currentFilters) => ({
      ...currentFilters,
      classes: currentFilters.classes.filter((className) => className !== value),
    }))
  }

  const toggleMajorFilter = (value: MajorFilterValue, checked: boolean) => {
    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      majors: checked
        ? [...currentFilters.majors, value]
        : currentFilters.majors.filter((major) => major !== value),
    }))
  }

  const toggleClassFilter = (value: ClassFilterValue, checked: boolean) => {
    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      classes: checked
        ? [...currentFilters.classes, value]
        : currentFilters.classes.filter((className) => className !== value),
    }))
  }

  const showDownloadToast = () => {
    if (downloadToastTimerId.current) {
      clearTimeout(downloadToastTimerId.current)
    }

    setShowsDownloadToast(true)
    downloadToastTimerId.current = setTimeout(() => {
      setShowsDownloadToast(false)
      downloadToastTimerId.current = null
    }, 2500)
  }

  const hasAppliedFilters = appliedFilters.majors.length > 0 || appliedFilters.classes.length > 0
  const normalizedSearchQuery = searchQuery.trim()
  const showsEmptySearchResult = normalizedSearchQuery.length > 0

  return (
    <main className={styles.page} data-filter-open={isFilterOpen}>
      <AppHeader activeItem="library" items={navigationItems} />
      <section className={styles.workspace} aria-label="레주메북 포트폴리오 열람">
        <div className={styles.contentLayer}>
          <div className={styles.toolbar}>
            <div className={styles.searchGroup}>
              <button
                aria-label="필터 열기"
                aria-expanded={isFilterOpen}
                aria-haspopup="dialog"
                className={styles.filterButton}
                type="button"
                onClick={openFilter}
              >
                <FilterIcon />
              </button>
              <SearchField
                className={styles.searchField}
                spellCheck={false}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <Button className={styles.downloadButton} onClick={showDownloadToast}>
              전체 PDF 다운로드
            </Button>
          </div>

          {showsDownloadToast ? (
            <div className={styles.toastLayer}>
              <Toast variant="success">PDF 다운로드에 성공했습니다.</Toast>
            </div>
          ) : null}

          {hasAppliedFilters && !showsEmptySearchResult ? (
            <div className={styles.activeFilters} aria-label="적용된 필터">
              {appliedFilters.classes.map((className) => (
                <Tag key={className} removeLabel={`${className} 필터 삭제`} onRemove={() => removeClassFilter(className)}>
                  {className}
                </Tag>
              ))}
              {appliedFilters.majors.map((major) => {
                const option = majorFilters.find((filter) => filter.value === major)

                return option ? (
                  <Tag key={major} removeLabel={`${option.chipLabel} 필터 삭제`} onRemove={() => removeMajorFilter(major)}>
                    {option.chipLabel}
                  </Tag>
                ) : null
              })}
            </div>
          ) : null}

          {showsEmptySearchResult ? (
            <SearchEmptyState searchQuery={normalizedSearchQuery} onReturn={() => router.push('/library')} />
          ) : (
            <>
              <div className={styles.viewer}>
                <button className={`${styles.pageArrow} ${styles.previousArrow}`} type="button" aria-label="이전 페이지">
                  ‹
                </button>
                <div className={styles.sheets} aria-label="포트폴리오 문서 페이지">
                  <ResumeBookSheet ariaLabel="최하은 포트폴리오 왼쪽 페이지" />
                  <ResumeBookSheet ariaLabel="최하은 포트폴리오 오른쪽 페이지" />
                </div>
                <button className={`${styles.pageArrow} ${styles.nextArrow}`} type="button" aria-label="다음 페이지">
                  ›
                </button>
              </div>

              <p className={styles.pageIndicator} aria-label="현재 페이지">
                <strong>4</strong> / 126
              </p>
            </>
          )}
        </div>

        {isFilterOpen ? (
          <aside className={styles.filterPanel} role="dialog" aria-label="필터링" aria-modal="true">
            <header className={styles.filterHeader}>
              <h2>필터링</h2>
              <button className={styles.closeButton} type="button" aria-label="필터 닫기" onClick={closeFilter}>
                ×
              </button>
            </header>

            <div className={styles.filterBody}>
              <FilterSection
                expanded={expandedFilterSections.majors}
                title="전공"
                onToggle={() => toggleFilterSection('majors')}
              >
                {majorFilters.map((filter) => (
                  <CheckboxOption
                    checked={draftFilters.majors.includes(filter.value)}
                    key={filter.value}
                    onCheckedChange={(checked) => toggleMajorFilter(filter.value, checked)}
                  >
                    {filter.label}
                  </CheckboxOption>
                ))}
              </FilterSection>

              <FilterSection
                expanded={expandedFilterSections.classes}
                title="반"
                onToggle={() => toggleFilterSection('classes')}
              >
                {classFilters.map((className) => (
                  <CheckboxOption
                    checked={draftFilters.classes.includes(className)}
                    key={className}
                    onCheckedChange={(checked) => toggleClassFilter(className, checked)}
                  >
                    {className}
                  </CheckboxOption>
                ))}
              </FilterSection>
            </div>

            <footer className={styles.filterActions}>
              <Button className={styles.resetButton} variant="bordered-dark" onClick={resetFilters}>
                초기화
              </Button>
              <Button className={styles.applyButton} onClick={applyFilters}>
                적용하기
              </Button>
            </footer>
          </aside>
        ) : null}
      </section>
    </main>
  )
}

function SearchEmptyState({
  onReturn,
  searchQuery,
}: {
  readonly onReturn: () => void
  readonly searchQuery: string
}) {
  return (
    <section className={styles.emptyState} aria-live="polite">
      <p className={styles.emptyMessage}>
        입력하신 &apos;{searchQuery}&apos;와(과) 일치하는 학생이 없습니다.
        <br />
        이름을 다시 확인해주세요.
      </p>
      <Button className={styles.returnButton} iconRight="chevron-right" variant="bordered-dark" onClick={onReturn}>
        도서관 돌아가기
      </Button>
    </section>
  )
}

function FilterSection({
  children,
  expanded,
  onToggle,
  title,
}: {
  readonly children: ReactNode
  readonly expanded: boolean
  readonly onToggle: () => void
  readonly title: string
}) {
  return (
    <section className={styles.filterSection}>
      <button className={styles.filterSectionTitle} type="button" aria-expanded={expanded} onClick={onToggle}>
        <span>{title}</span>
        <span className={styles.filterSectionIcon} aria-hidden="true">
          ⌃
        </span>
      </button>
      {expanded ? <div className={styles.filterOptions}>{children}</div> : null}
    </section>
  )
}

function FilterIcon() {
  return (
    <svg aria-hidden="true" className={styles.filterIcon} fill="none" viewBox="0 0 24 24">
      <path d="M4 5H20L14 12V19L10 17V12L4 5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}
