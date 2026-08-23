import styles from './ResumeBookSheet.module.css'

const defaultSkills = ['Figma', 'illustrator', 'photoshop']

const defaultActivities = [
  { date: '2025.12.25', title: '제 1회 SCSC 온라인 해커톤 2위' },
  { date: '2025.07.18', title: '2025 교내 해커톤 우수상' },
]

const defaultContests = ['제4회 2026 블레이버스 MVP 개발 해커톤', '제 1회 SCSC온라인 해커톤', '2025 교내 해커톤']
const defaultProjects = ['TEENS', '스플', 'D-ask', 'DSG', 'Studiz', 'hear', '마음씨', 'Repo']

export type ResumeBookSheetProps = {
  readonly ariaLabel?: string
  readonly className?: string
}

export function ResumeBookSheet({ ariaLabel = '최하은 포트폴리오', className }: ResumeBookSheetProps) {
  const sheetClassName = [styles.sheet, className].filter(Boolean).join(' ')

  return (
    <article className={sheetClassName} aria-label={ariaLabel}>
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
          새벽자습너무 졸립니다. 뭘 적지.. 한줄소개는 이런식으로 쭉쭉 들어갑니다.
          줄넘김 가능합니다. 자기소개자기소개자기소개자기소개자기소개자기소개.. 최대 4줄이면 충분하겠지만..
        </p>
      </section>

      <section className={styles.section}>
        <h2>기술스택</h2>
        <ul className={styles.skillList}>
          {defaultSkills.map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2>활동</h2>
        <ol className={styles.activityList}>
          {defaultActivities.map((activity) => (
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
          {defaultContests.map((contest) => (
            <li key={contest}>{contest}</li>
          ))}
        </ul>
      </section>

      <section className={styles.detailSection}>
        <h3>Project</h3>
        <ul>
          {defaultProjects.map((project) => (
            <li key={project}>{project}</li>
          ))}
        </ul>
      </section>
    </article>
  )
}
