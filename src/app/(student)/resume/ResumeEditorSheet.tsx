import styles from './ResumeEditorSheet.module.css'

export type ResumeDraftActivity = {
  readonly date: string
  readonly title: string
}

export type ResumeDraft = {
  readonly activities: readonly ResumeDraftActivity[]
  readonly contests: readonly string[]
  readonly email: string
  readonly headline: string
  readonly introTitle: string
  readonly introduce: string
  readonly majorName: string
  readonly name: string
  readonly pageContents: readonly [string, string]
  readonly portfolioUrl: string
  readonly projects: readonly string[]
  readonly skills: readonly string[]
}

export type ResumeEditorSheetProps = {
  readonly className?: string
  readonly draft: ResumeDraft
  readonly onChange: (nextDraft: ResumeDraft) => void
  readonly pageIndex: 0 | 1
}

function toCommaText(values: readonly string[]) {
  return values.join(', ')
}

function toCommaValues(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function toLineText(values: readonly string[]) {
  return values.join('\n')
}

function toLineValues(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function toActivityText(activities: readonly ResumeDraftActivity[]) {
  return activities.map((activity) => [activity.date, activity.title].filter(Boolean).join(' ')).join('\n')
}

function toActivities(value: string) {
  return toLineValues(value).map((line) => ({ date: '', title: line }))
}

export function ResumeEditorSheet({ className, draft, onChange, pageIndex }: ResumeEditorSheetProps) {
  const sheetClassName = [styles.sheet, className].filter(Boolean).join(' ')
  const pageContent = draft.pageContents[pageIndex]

  const updateDraft = (patch: Partial<ResumeDraft>) => {
    onChange({ ...draft, ...patch })
  }

  const updatePageContent = (value: string) => {
    const pageContents: readonly [string, string] =
      pageIndex === 0 ? [value, draft.pageContents[1]] : [draft.pageContents[0], value]

    updateDraft({ pageContents })
  }

  return (
    <article aria-label={`이력서 작성 ${pageIndex + 1}쪽`} className={sheetClassName}>
      <header className={styles.sheetHeader}>
        <div className={styles.profileImage} aria-label="프로필 이미지" />
        <div className={styles.identity}>
          <div className={styles.nameRow}>
            <label className={styles.srOnly} htmlFor={`resume-name-${pageIndex}`}>
              이름
            </label>
            <input
              className={styles.nameInput}
              id={`resume-name-${pageIndex}`}
              onChange={(event) => updateDraft({ name: event.target.value })}
              placeholder="이름"
              value={draft.name}
            />
            <label className={styles.srOnly} htmlFor={`resume-major-${pageIndex}`}>
              학번 전공
            </label>
            <input
              className={styles.majorInput}
              id={`resume-major-${pageIndex}`}
              onChange={(event) => updateDraft({ majorName: event.target.value })}
              placeholder="2415 인공지능소프트웨어과"
              value={draft.majorName}
            />
          </div>
          <div className={styles.metaRow}>
            <label className={styles.srOnly} htmlFor={`resume-headline-${pageIndex}`}>
              직무
            </label>
            <input
              className={styles.metaInput}
              id={`resume-headline-${pageIndex}`}
              onChange={(event) => updateDraft({ headline: event.target.value })}
              placeholder="Frontend Developer"
              value={draft.headline}
            />
            <span aria-hidden="true">|</span>
            <label className={styles.srOnly} htmlFor={`resume-email-${pageIndex}`}>
              이메일
            </label>
            <input
              className={styles.metaInput}
              id={`resume-email-${pageIndex}`}
              onChange={(event) => updateDraft({ email: event.target.value })}
              placeholder="email@example.com"
              value={draft.email}
            />
          </div>
        </div>
        <label className={styles.qrCode} aria-label="포트폴리오 URL">
          <span className={styles.srOnly}>포트폴리오 URL</span>
          <input
            onChange={(event) => updateDraft({ portfolioUrl: event.target.value })}
            placeholder="URL"
            value={draft.portfolioUrl}
          />
        </label>
      </header>

      <section className={styles.introBox} aria-label="자기소개">
        <label className={styles.srOnly} htmlFor={`resume-intro-title-${pageIndex}`}>
          자기소개 제목
        </label>
        <input
          className={styles.introTitleInput}
          id={`resume-intro-title-${pageIndex}`}
          onChange={(event) => updateDraft({ introTitle: event.target.value })}
          placeholder="안녕하세요 저는..."
          value={draft.introTitle}
        />
        <label className={styles.srOnly} htmlFor={`resume-introduce-${pageIndex}`}>
          자기소개 내용
        </label>
        <textarea
          className={styles.introduceInput}
          id={`resume-introduce-${pageIndex}`}
          onChange={(event) => updateDraft({ introduce: event.target.value })}
          placeholder="자기소개를 작성해주세요."
          value={draft.introduce}
        />
      </section>

      <section className={styles.section}>
        <h3>기술스택</h3>
        <label className={styles.srOnly} htmlFor={`resume-skills-${pageIndex}`}>
          기술스택
        </label>
        <input
          className={styles.pillInput}
          id={`resume-skills-${pageIndex}`}
          onChange={(event) => updateDraft({ skills: toCommaValues(event.target.value) })}
          placeholder="Figma, React, TypeScript"
          value={toCommaText(draft.skills)}
        />
      </section>

      <section className={styles.section}>
        <h3>활동</h3>
        <label className={styles.srOnly} htmlFor={`resume-activities-${pageIndex}`}>
          활동
        </label>
        <textarea
          className={styles.listInput}
          id={`resume-activities-${pageIndex}`}
          onChange={(event) => updateDraft({ activities: toActivities(event.target.value) })}
          placeholder={'2025.12.25 제 1회 SCSC 온라인 해커톤 2위\n2025.07.18 2025 교내 해커톤 우수상'}
          value={toActivityText(draft.activities)}
        />
      </section>

      <section className={styles.detailSection}>
        <h4>대회</h4>
        <label className={styles.srOnly} htmlFor={`resume-contests-${pageIndex}`}>
          대회
        </label>
        <textarea
          className={styles.listInput}
          id={`resume-contests-${pageIndex}`}
          onChange={(event) => updateDraft({ contests: toLineValues(event.target.value) })}
          placeholder={'제4회 2026 블레이버스 MVP 개발 해커톤\n제 1회 SCSC온라인 해커톤'}
          value={toLineText(draft.contests)}
        />
      </section>

      <section className={styles.detailSection}>
        <h4>Project</h4>
        <label className={styles.srOnly} htmlFor={`resume-projects-${pageIndex}`}>
          프로젝트
        </label>
        <textarea
          className={styles.listInput}
          id={`resume-projects-${pageIndex}`}
          onChange={(event) => updateDraft({ projects: toLineValues(event.target.value) })}
          placeholder={'Repo\nStudiz\nD-ask'}
          value={toLineText(draft.projects)}
        />
      </section>

      <label className={styles.srOnly} htmlFor={`resume-page-content-${pageIndex}`}>
        {pageIndex + 1}쪽 추가 내용
      </label>
      <textarea
        className={styles.pageContentInput}
        id={`resume-page-content-${pageIndex}`}
        onChange={(event) => updatePageContent(event.target.value)}
        placeholder="추가할 내용을 자유롭게 작성해주세요."
        value={pageContent}
      />
    </article>
  )
}
