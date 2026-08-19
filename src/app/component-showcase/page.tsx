import {
  AppFooter,
  AppHeader,
  ClassCard,
  LibraryBook,
  LinkRow,
  MajorInputGroup,
  MajorList,
  OptionList,
  PortfolioUrlModal,
  SearchField,
  TextSlot,
} from '@/shared/ui'

import styles from './page.module.css'

const studentNavItems = [
  { href: '/', label: '홈', value: 'home' },
  { href: '/student/resume', label: '이력서 관리', value: 'resume' },
  { href: '/library', label: '도서관', value: 'library' },
] as const

const teacherNavItems = [
  { href: '/teacher/majors', label: '전공 관리', value: 'major' },
  { href: '/teacher/students', label: '학생 관리', value: 'students' },
  { href: '/library', label: '도서관', value: 'library' },
] as const

const majors = [
  { id: 'frontend', name: 'Frontend Developer' },
  { id: 'backend', name: 'Backend Developer' },
] as const

const options = [
  { id: 'frontend-1', label: 'Frontend Developer' },
  { id: 'backend-1', label: 'Backend Developer' },
  { id: 'frontend-2', label: 'Frontend Developer' },
  { id: 'backend-2', label: 'Backend Developer' },
  { id: 'frontend-3', label: 'Frontend Developer' },
  { id: 'backend-3', label: 'Backend Developer' },
] as const

export default function ComponentShowcasePage() {
  return (
    <main className={styles.page}>
      <section className={styles.section}>
        <h1 className={styles.sectionTitle}>Rows</h1>
        <div className={styles.stack}>
          <LinkRow actionLabel="레주메 보러가기" href="/student/choi-haeun" status="제출됨" title="2415 최하은" tone="submitted" />
          <LinkRow actionLabel="레주메 보러가기" href="/student/choi-haeun" status="미제출" title="2415 최하은" tone="missing" />
          <LinkRow href="/notice/1" meta="202X.XX.XX" title="알림내용" />
          <LinkRow href="/notice/2" meta="202X.XX.XX" surface="muted" title="알림내용" />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Cards</h2>
        <div className={styles.grid}>
          <ClassCard count={16} selected title="1반" />
          <ClassCard count={16} title="1반" />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Text Slots</h2>
        <div className={styles.gridWide}>
          <TextSlot label="전체" value="전체" />
          <TextSlot editableValue="Frontend Developer" label="Frontend Developer" value="Frontend Developer" variant="wide" />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Major Controls</h2>
        <SearchField />
        <MajorInputGroup
          errorMessage="에러메시지를 띄워줍니다."
          inputs={[
            { id: 'major-1', placeholder: '추가할 전공을 입력해주세요.' },
            { id: 'major-2', placeholder: '추가할 전공을 입력해주세요.' },
          ]}
        />
        <MajorList items={majors} selectedId="frontend" />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Header</h2>
        <AppHeader activeItem="home" items={studentNavItems} />
        <AppHeader activeItem="resume" items={studentNavItems} />
        <AppHeader showLogin items={studentNavItems} />
        <AppHeader activeItem="major" items={teacherNavItems} />
        <AppHeader activeItem="students" items={teacherNavItems} />
        <AppHeader activeItem="library" items={teacherNavItems} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Library And Modal</h2>
        <div className={styles.libraryArea}>
          <OptionList items={options} />
          <LibraryBook generation="9기" grade="2학년" href="/resume-books/2022" year="2022" />
          <PortfolioUrlModal />
        </div>
      </section>

      <AppFooter />
    </main>
  )
}
