import styles from './PortfolioResumeSheet.module.css'

type ResumeActivity = {
  dateLabel?: string
  description: string
}

/**
 * Figma-derived portfolio intro/resume sheet. Typography contract: name uses Title Small,
 * major status uses Body Tiny, and student number/department/email metadata uses Body very Tiny.
 */
export type PortfolioResumeSheetProps = {
  activities?: ResumeActivity[]
  department: string
  email?: string
  headline: string
  intro: string
  majorStatus?: string
  name: string
  profileImageLabel?: string
  qrLabel?: string
  skills?: string[]
  studentNumber: string
}

export function PortfolioResumeSheet({
  activities = [],
  department,
  email,
  headline,
  intro,
  majorStatus = '전공미정',
  name,
  profileImageLabel = '프로필 이미지 영역',
  qrLabel = 'QR 코드 영역',
  skills = [],
  studentNumber,
}: PortfolioResumeSheetProps) {
  return (
    <article className={styles.sheet} aria-label={`${name} 포트폴리오 자기소개`}>
      <header className={styles.header}>
        <div className={styles.profilePlaceholder} aria-label={profileImageLabel}>
          <span aria-hidden="true">＋</span>
        </div>

        <div className={styles.identity}>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{name}</h1>
            <span className={styles.majorStatus}>{majorStatus}</span>
          </div>
          <p className={styles.meta}>
            <span>{studentNumber}</span>
            <span>{department}</span>
            {email ? <span>{email}</span> : null}
          </p>
        </div>

        <div className={styles.qrPlaceholder} aria-label={qrLabel}>
          <span aria-hidden="true">▦</span>
        </div>
      </header>

      <section className={styles.introBox}>
<h2 className={styles.headline}>{headline}</h2>
        <p className={styles.intro}>{intro}</p>
      </section>

      <section className={styles.section}>
<h2 className={styles.sectionTitle}>기술스택</h2>
        <ul className={styles.skillList} aria-label="기술스택 목록">
          {skills.map((skill) => (
            <li className={styles.skillChip} key={skill}>
              {skill}
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
<h2 className={styles.sectionTitle}>활동</h2>
        <ol className={styles.activityList}>
          {activities.map((activity) => (
            <li className={styles.activityItem} key={`${activity.dateLabel ?? 'activity'}-${activity.description}`}>
              {activity.dateLabel ? <time className={styles.activityDate}>{activity.dateLabel}</time> : null}
              <span>{activity.description}</span>
            </li>
          ))}
        </ol>
      </section>
    </article>
  )
}
