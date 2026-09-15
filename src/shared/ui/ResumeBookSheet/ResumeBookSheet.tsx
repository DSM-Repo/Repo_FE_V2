import styles from './ResumeBookSheet.module.css'

export type ResumeBookSheetActivity = {
  readonly date: string
  readonly title: string
}

export type ResumeBookSheetContent = {
  readonly activities: readonly ResumeBookSheetActivity[]
  readonly contests: readonly string[]
  readonly email?: string
  readonly headline: string
  readonly introTitle?: string
  readonly introduce: string
  readonly majorName: string
  readonly name: string
  readonly pageContent?: string
  readonly portfolioUrl?: string
  readonly projects: readonly string[]
  readonly skills: readonly string[]
}

export type ResumeBookSheetProps = {
  readonly ariaLabel?: string
  readonly className?: string
  readonly content: ResumeBookSheetContent
}

export function ResumeBookSheet({ ariaLabel, className, content }: ResumeBookSheetProps) {
  const sheetClassName = [styles.sheet, className].filter(Boolean).join(' ')
  const label = ariaLabel ?? `${content.name} 포트폴리오`

  return (
    <article className={sheetClassName} aria-label={label}>
      <header className={styles.sheetHeader}>
        <div className={styles.profileImage} aria-label="프로필 이미지" />
        <div className={styles.identity}>
          <div className={styles.nameRow}>
            <h2 className={styles.name}>{content.name}</h2>
            <span className={styles.major}>{content.majorName}</span>
          </div>
          <p className={styles.meta}>
            {[content.headline, content.email].filter(Boolean).join(' | ')}
          </p>
        </div>
        <div className={styles.qrCode} aria-label="포트폴리오 QR 코드" />
      </header>

      <section className={styles.introBox}>
        <h3>{content.introTitle ?? content.headline}</h3>
        <p>{content.introduce}</p>
      </section>

      {content.skills.length > 0 ? (
        <section className={styles.section}>
          <h3>기술스택</h3>
          <ul className={styles.skillList}>
            {content.skills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {content.activities.length > 0 ? (
        <section className={styles.section}>
          <h3>활동</h3>
          <ol className={styles.activityList}>
            {content.activities.map((activity) => (
              <li key={activity.title}>
                <time>{activity.date}</time>
                <span>{activity.title}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {content.contests.length > 0 ? (
        <section className={styles.detailSection}>
          <h4>대회</h4>
          <ul>
            {content.contests.map((contest) => (
              <li key={contest}>{contest}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {content.projects.length > 0 ? (
        <section className={styles.detailSection}>
          <h4>Project</h4>
          <ul>
            {content.projects.map((project) => (
              <li key={project}>{project}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {content.pageContent ? <p className={styles.pageContent}>{content.pageContent}</p> : null}
    </article>
  )
}
