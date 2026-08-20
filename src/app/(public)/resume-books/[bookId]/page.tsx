import type { AppHeaderItem } from '@/shared/ui'
import { AppHeader, Button, SearchField } from '@/shared/ui'

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

type ResumeBookPageProps = {
  readonly params: Promise<{
    readonly bookId: string
  }>
}

export default async function ResumeBookPage({ params }: ResumeBookPageProps) {
  await params

  return (
    <main className={styles.page}>
      <AppHeader activeItem="library" items={navigationItems} />
      <section className={styles.workspace} aria-label="레주메북 포트폴리오 열람">
        <div className={styles.toolbar}>
          <div className={styles.searchGroup}>
            <button className={styles.filterButton} type="button" aria-label="필터 열기">
              <FilterIcon />
            </button>
            <SearchField className={styles.searchField} />
          </div>
          <Button className={styles.downloadButton}>전체 PDF 다운로드</Button>
        </div>

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
      </section>
    </main>
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
