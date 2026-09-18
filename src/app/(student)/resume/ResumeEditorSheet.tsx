import { Icon } from '@/shared/ui'

import { MarkdownTextarea } from './MarkdownTextarea'
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
  readonly projectEndDate: string
  readonly projectImageUrl: string
  readonly projectStartDate: string
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

export function ResumeEditorSheet({ className, draft, onChange, pageIndex }: ResumeEditorSheetProps) {
  const sheetClassName = [styles.sheet, className].filter(Boolean).join(' ')

  const updateDraft = (patch: Partial<ResumeDraft>) => {
    onChange({ ...draft, ...patch })
  }

  const updatePageContent = (value: string) => {
    const pageContents: readonly [string, string] =
      pageIndex === 0 ? [value, draft.pageContents[1]] : [draft.pageContents[0], value]

    updateDraft({ pageContents })
  }

  if (pageIndex === 1) {
    return (
      <article aria-label="이력서 작성 2쪽" className={sheetClassName}>
        <header className={styles.projectHeader}>
          <button className={styles.projectImageButton} type="button" aria-label="프로젝트 이미지 추가">
            <Icon name="plus" />
          </button>
          <div className={styles.projectIdentity}>
            <label className={styles.srOnly} htmlFor="resume-project-name">
              프로젝트 이름
            </label>
            <input
              className={styles.projectNameInput}
              id="resume-project-name"
              onChange={(event) => updateDraft({ projects: toLineValues(event.target.value) })}
              placeholder="프로젝트 이름을 작성해주세요."
              value={toLineText(draft.projects)}
            />
            <div className={styles.projectDateRow}>
              <label className={styles.srOnly} htmlFor="resume-project-start-date">
                프로젝트 시작일
              </label>
              <input
                className={styles.projectDateInput}
                id="resume-project-start-date"
                onChange={(event) => updateDraft({ projectStartDate: event.target.value })}
                placeholder="202X-XX-XX"
                value={draft.projectStartDate}
              />
              <span aria-hidden="true">~</span>
              <label className={styles.srOnly} htmlFor="resume-project-end-date">
                프로젝트 종료일
              </label>
              <input
                className={styles.projectDateInput}
                id="resume-project-end-date"
                onChange={(event) => updateDraft({ projectEndDate: event.target.value })}
                placeholder="202X-XX-XX"
                value={draft.projectEndDate}
              />
              <button className={styles.inlineIconButton} type="button" aria-label="프로젝트 기간 수정">
                ✎
              </button>
            </div>
          </div>
        </header>

        <section className={styles.projectIntroBox} aria-label="프로젝트 소개">
          <label className={styles.srOnly} htmlFor="resume-project-intro">
            프로젝트 소개
          </label>
          <input
            className={styles.projectIntroInput}
            id="resume-project-intro"
            onChange={(event) => updateDraft({ contests: [event.target.value].filter(Boolean) })}
            placeholder="프로젝트 소개를 입력해주세요."
            value={draft.contests[0] ?? ''}
          />
        </section>

        <MarkdownTextarea
          className={styles.projectContentInput}
          id="resume-page-content-1"
          label="2쪽 추가 내용"
          onChange={updatePageContent}
          placeholder="프로젝트에서 수행한 역할과 기여 내용, 그리고 진행 과정에 대한 회고 등을 작성해 주세요."
          previewLabel="프로젝트 Markdown 미리보기"
          toolbarLabel="프로젝트 작성 도구"
          value={draft.pageContents[1]}
        />
      </article>
    )
  }

  return (
    <article aria-label="이력서 작성 1쪽" className={sheetClassName}>
      <header className={styles.profileHeader}>
        <button className={styles.profileImageButton} type="button" aria-label="프로필 이미지 추가">
          <Icon name="plus" />
        </button>
        <div className={styles.identity}>
          <div className={styles.nameRow}>
            <label className={styles.srOnly} htmlFor="resume-name">
              이름
            </label>
            <input
              className={styles.nameInput}
              id="resume-name"
              onChange={(event) => updateDraft({ name: event.target.value })}
              placeholder="홍길동"
              value={draft.name}
            />
            <button className={styles.majorSelect} type="button">
              전공미정
              <span aria-hidden="true">⌄</span>
            </button>
          </div>
          <div className={styles.metaRow}>
            <label className={styles.srOnly} htmlFor="resume-major">
              학번 전공
            </label>
            <input
              className={styles.majorInput}
              id="resume-major"
              onChange={(event) => updateDraft({ majorName: event.target.value })}
              placeholder="2415 인공지능소프트웨어과"
              value={draft.majorName}
            />
            <span aria-hidden="true">|</span>
            <label className={styles.srOnly} htmlFor="resume-email">
              이메일
            </label>
            <input
              className={styles.emailInput}
              id="resume-email"
              onChange={(event) => updateDraft({ email: event.target.value })}
              placeholder="이메일을 입력해주세요."
              value={draft.email}
            />
          </div>
        </div>
        <button className={styles.qrButton} type="button" aria-label="포트폴리오 URL 추가">
          <Icon name="plus" />
        </button>
      </header>

      <section className={styles.introBox} aria-label="자기소개">
        <label className={styles.srOnly} htmlFor="resume-intro-title">
          자기소개 제목
        </label>
        <input
          className={styles.introTitleInput}
          id="resume-intro-title"
          onChange={(event) => updateDraft({ introTitle: event.target.value })}
          placeholder="한줄 자기소개를 작성해주세요."
          value={draft.introTitle}
        />
        <label className={styles.srOnly} htmlFor="resume-introduce">
          자기소개 내용
        </label>
        <textarea
          className={styles.introduceInput}
          id="resume-introduce"
          onChange={(event) => updateDraft({ introduce: event.target.value })}
          placeholder="자기소개를 작성해주세요."
          value={draft.introduce}
        />
      </section>

      <section className={styles.skillSection}>
        <div className={styles.sectionTitleRow}>
          <h3>기술스택</h3>
          <button className={styles.addInlineButton} type="button" aria-label="기술스택 추가">
            <Icon name="plus" />
          </button>
        </div>
        <label className={styles.srOnly} htmlFor="resume-skills">
          기술스택
        </label>
        <input
          className={styles.skillInput}
          id="resume-skills"
          onChange={(event) => updateDraft({ skills: toCommaValues(event.target.value) })}
          placeholder="전공을 입력 후 Enter를 눌러 추가하세요."
          value={toCommaText(draft.skills)}
        />
      </section>

      <section className={styles.activitySection}>
        <div className={styles.activityHeadingRow}>
          <h3>활동</h3>
        </div>
        <MarkdownTextarea
          className={styles.activityInput}
          id="resume-activities"
          label="1쪽 추가 내용"
          onChange={updatePageContent}
          placeholder="활동 내용과 날짜, 상세를 입력해주세요."
          previewLabel="활동 Markdown 미리보기"
          toolbarLabel="활동 작성 도구"
          value={draft.pageContents[0]}
        />
      </section>
    </article>
  )
}
