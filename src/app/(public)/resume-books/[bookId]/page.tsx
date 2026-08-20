'use client'

import { useState, type ReactNode } from 'react'

import type { AppHeaderItem } from '@/shared/ui'
import { AppHeader, Button, CheckboxOption, SearchField, Tag } from '@/shared/ui'

import styles from './page.module.css'

const navigationItems = [
  { href: '/majors', label: '전공 관리', value: 'majors' },
  { href: '/students', label: '학생 관리', value: 'students' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]

const skills = ['Figma', 'illustrator', 'photoshop']

const activities = [
  { date: '2025.12.25', title: '제 1회 SCSC 온라인 해커톤 2위' },
  { date: '2025.07.18', title: '2025 교내 해커톤 우수상' },
]

const contests = ['제4회 2026 블레이버스 MVP 개발 해커톤', '제 1회 SCSC온라인 해커톤', '2025 교내 해커톤']
const projects = ['TEENS', '스플', 'D-ask', 'DSG', 'Studiz', 'hear', '마음씨', 'Repo']

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
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaultFilters)
  const [draftFilters, setDraftFilters] = useState<FilterState>(defaultFilters)
  const [expandedFilterSections, setExpandedFilterSections] = useState(defaultExpandedFilterSections)

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

  const hasAppliedFilters = appliedFilters.majors.length > 0 || appliedFilters.classes.length > 0

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
              <SearchField className={styles.searchField} />
            </div>
            <Button className={styles.downloadButton}>전체 PDF 다운로드</Button>
          </div>

          {hasAppliedFilters ? (
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

          <div className={styles.viewer}>
            <button className={`${styles.pageArrow} ${styles.previousArrow}`} type="button" aria-label="이전 페이지">
              ‹
            </button>
            <div className={styles.sheets} aria-label="포트폴리오 문서 페이지">
              <ResumeSheet />
              <ResumeSheet />
            </div>
            <button className={`${styles.pageArrow} ${styles.nextArrow}`} type="button" aria-label="다음 페이지">
              ›
            </button>
          </div>

          <p className={styles.pageIndicator} aria-label="현재 페이지">
            <strong>4</strong> / 126
          </p>
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

function ResumeSheet() {
  return (
    <article className={styles.sheet} aria-label="최하은 포트폴리오">
      <header className={styles.sheetHeader}>
        <div className={styles.profileImage} aria-label="프로필 이미지" />
        <div className={styles.identity}>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>최하은</h1>
            <span className={styles.major}>Frontend Developer</span>
          </div>
          <p className={styles.meta}>2415 인공지능소프트웨어과 | mare2mare6@gmail.com</p>
        </div>
        <div className={styles.qrCode} aria-label="포트폴리오 QR 코드" />
      </header>

      <section className={styles.introBox}>
        <h2>안녕하세요 저는 디자이너가 되고 싶은 인간입니다</h2>
        <p>
          새벽잠실너무 졸립니다. 웹 적지.. 한줄소개는 이런식으로 쭉쭉 들어갑니다.
          줄넘김 가능합니다. 자기소개자기소개자기소개까지소개까지소개까지소개까지... 최대 4줄이면 충분하겠지만..
          줄이 이런식으로 길어지면 폼도 자동으로 늘어납니다.
        </p>
      </section>

      <section className={styles.section}>
        <h2>기술스택</h2>
        <ul className={styles.skillList}>
          {skills.map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2>활동</h2>
        <ol className={styles.activityList}>
          {activities.map((activity) => (
            <li key={activity.title}>
              <time>{activity.date}</time>
              <span>{activity.title}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.detailSection}>
        <h3>대회</h3>
        <ul>
          {contests.map((contest) => (
            <li key={contest}>{contest}</li>
          ))}
        </ul>
      </section>

      <section className={styles.detailSection}>
        <h3>Project</h3>
        <ul>
          {projects.map((project) => (
            <li key={project}>{project}</li>
          ))}
        </ul>
      </section>
    </article>
  )
}

function FilterIcon() {
  return (
    <svg aria-hidden="true" className={styles.filterIcon} fill="none" viewBox="0 0 24 24">
      <path d="M4 5H20L14 12V19L10 17V12L4 5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  )
}
