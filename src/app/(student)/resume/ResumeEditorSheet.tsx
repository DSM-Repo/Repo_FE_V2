'use client'

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'

import type { Major } from '@/features/major/api'
import type { ResumePageType } from '@/features/resume/api'
import { Icon } from '@/shared/ui'

import { MarkdownTextarea } from './MarkdownTextarea'
import styles from './ResumeEditorSheet.module.css'

export type ResumeDraftActivity = {
  readonly date: string
  readonly title: string
}

export type ResumeDraftProject = {
  readonly endDate: string
  readonly imageUrl: string
  readonly name: string
  readonly startDate: string
  readonly summary: string
}

export type ResumeDraftPage = {
  readonly content: string
  readonly id?: string
  readonly index: number
  readonly project?: ResumeDraftProject
  readonly type: ResumePageType
}

export type ResumeDraft = {
  readonly activities: readonly ResumeDraftActivity[]
  readonly email: string
  readonly headline: string
  readonly introduce: string
  readonly introTitle: string
  readonly name: string
  readonly pages: readonly ResumeDraftPage[]
  readonly portfolioUrl: string
  readonly schoolNumber: string
  readonly skills: readonly string[]
}

export type ResumeEditorSheetProps = {
  readonly className?: string
  readonly draft: ResumeDraft
  readonly isMajorLoading?: boolean
  readonly isMajorPending?: boolean
  readonly majors?: readonly Major[]
  readonly onChange: (nextDraft: ResumeDraft) => void
  readonly onMajorChange?: (majorId: number) => void
  readonly pageIndex: number
}

const emptyProject: ResumeDraftProject = {
  endDate: '',
  imageUrl: '',
  name: '',
  startDate: '',
  summary: '',
}

export function getDepartmentFromSchoolNumber(schoolNumber: string) {
  const normalizedSchoolNumber = schoolNumber.trim()
  const grade = normalizedSchoolNumber[0]
  const classNumber = normalizedSchoolNumber[1]

  if (grade === '1') {
    return '공통과정'
  }

  if (grade !== '2' && grade !== '3') {
    return ''
  }

  if (classNumber === '1' || classNumber === '2') {
    return '소프트웨어개발과'
  }

  if (classNumber === '3') {
    return '임베디드소프트웨어과'
  }

  if (classNumber === '4') {
    return '인공지능소프트웨어과'
  }

  return ''
}

function toStudentMeta(schoolNumber: string) {
  return [schoolNumber.trim(), getDepartmentFromSchoolNumber(schoolNumber)].filter(Boolean).join(' ')
}

export function ResumeEditorSheet({
  className,
  draft,
  isMajorLoading = false,
  isMajorPending = false,
  majors = [],
  onChange,
  onMajorChange,
  pageIndex,
}: ResumeEditorSheetProps) {
  const [skillInput, setSkillInput] = useState('')
  const introBodyRef = useRef<HTMLTextAreaElement>(null)
  const isSkillComposingRef = useRef(false)
  const sheetClassName = [styles.sheet, className].filter(Boolean).join(' ')
  const selectedMajor = majors.find((major) => major.name === draft.headline)
  const page = draft.pages[pageIndex]

  if (!page) {
    return null
  }

  const updateDraft = (patch: Partial<ResumeDraft>) => {
    onChange({ ...draft, ...patch })
  }

  const updatePage = (patch: Partial<ResumeDraftPage>) => {
    updateDraft({
      pages: draft.pages.map((draftPage, index) => (index === pageIndex ? { ...draftPage, ...patch } : draftPage)),
    })
  }

  const updateProject = (patch: Partial<ResumeDraftProject>) => {
    updatePage({ project: { ...(page.project ?? emptyProject), ...patch } })
  }

  const addSkill = () => {
    const skill = skillInput.trim()

    if (!skill || draft.skills.some((existingSkill) => existingSkill.toLocaleLowerCase() === skill.toLocaleLowerCase())) {
      return
    }

    updateDraft({ skills: [...draft.skills, skill] })
    setSkillInput('')
  }

  const handleSkillKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || isSkillComposingRef.current) {
      return
    }

    event.preventDefault()
    addSkill()
  }

  const handleIntroPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pastedText = event.clipboardData.getData('text')

    if (!pastedText.includes('\n')) {
      return
    }

    event.preventDefault()
    const [title = '', ...bodyLines] = pastedText.replace(/\r/g, '').split('\n')
    updateDraft({ introTitle: title, introduce: bodyLines.join('\n') })
    window.requestAnimationFrame(() => introBodyRef.current?.focus())
  }

  const removeSkill = (skillToRemove: string) => {
    updateDraft({ skills: draft.skills.filter((skill) => skill !== skillToRemove) })
  }

  if (page.type === 'FREE') {
    return (
      <article aria-label={`이력서 작성 ${page.index + 1}쪽`} className={sheetClassName}>
        <MarkdownTextarea
          className={styles.freePageContentInput}
          id={`resume-page-content-${page.index}`}
          label={`${page.index + 1}쪽 추가 내용`}
          onChange={(content) => updatePage({ content })}
          placeholder="추가 내용을 작성해주세요."
          toolbarLabel="추가 페이지 작성 도구"
          value={page.content}
        />
      </article>
    )
  }

  if (page.type === 'PROJECT') {
    const project = page.project ?? emptyProject

    return (
      <article aria-label={`이력서 작성 ${page.index + 1}쪽`} className={sheetClassName}>
        <header className={styles.projectHeader}>
          <button className={styles.projectImageButton} type="button" aria-label="프로젝트 이미지 추가">
            <Icon name="plus" />
          </button>
          <div className={styles.projectIdentity}>
            <label className={styles.srOnly} htmlFor={`resume-project-name-${page.index}`}>
              프로젝트 이름
            </label>
            <input
              className={styles.projectNameInput}
              id={`resume-project-name-${page.index}`}
              onChange={(event) => updateProject({ name: event.target.value })}
              placeholder="프로젝트 이름을 작성해주세요."
              value={project.name}
            />
            <div className={styles.projectDateRow}>
              <label className={styles.srOnly} htmlFor={`resume-project-start-date-${page.index}`}>
                프로젝트 시작일
              </label>
              <input
                className={styles.projectDateInput}
                id={`resume-project-start-date-${page.index}`}
                onChange={(event) => updateProject({ startDate: event.target.value })}
                placeholder="202X-XX-XX"
                value={project.startDate}
              />
              <span aria-hidden="true">~</span>
              <label className={styles.srOnly} htmlFor={`resume-project-end-date-${page.index}`}>
                프로젝트 종료일
              </label>
              <input
                className={styles.projectDateInput}
                id={`resume-project-end-date-${page.index}`}
                onChange={(event) => updateProject({ endDate: event.target.value })}
                placeholder="202X-XX-XX"
                value={project.endDate}
              />
              <button className={styles.inlineIconButton} type="button" aria-label="프로젝트 기간 수정">
                ✎
              </button>
            </div>
          </div>
        </header>

        <section className={styles.projectIntroBox} aria-label="프로젝트 소개">
          <label className={styles.srOnly} htmlFor={`resume-project-intro-${page.index}`}>
            프로젝트 소개
          </label>
          <input
            className={styles.projectIntroInput}
            id={`resume-project-intro-${page.index}`}
            onChange={(event) => updateProject({ summary: event.target.value })}
            placeholder="프로젝트 소개를 입력해주세요."
            value={project.summary}
          />
        </section>

        <MarkdownTextarea
          className={styles.projectContentInput}
          id={`resume-page-content-${page.index}`}
          label={`${page.index + 1}쪽 추가 내용`}
          onChange={(content) => updatePage({ content })}
          placeholder="프로젝트에서 수행한 역할과 기여 내용, 그리고 진행 과정에 대한 회고 등을 작성해 주세요."
          toolbarLabel="프로젝트 작성 도구"
          value={page.content}
        />
      </article>
    )
  }

  return (
    <article aria-label={`이력서 작성 ${page.index + 1}쪽`} className={sheetClassName}>
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
              placeholder="이름을 입력해주세요."
              value={draft.name}
            />
            <label className={styles.srOnly} htmlFor="resume-major-selection">
              희망 전공
            </label>
            <select
              aria-busy={isMajorLoading || isMajorPending}
              className={styles.majorSelect}
              disabled={isMajorLoading || isMajorPending || majors.length === 0}
              id="resume-major-selection"
              onChange={(event) => {
                const majorId = Number(event.target.value)

                if (Number.isInteger(majorId) && majorId > 0) {
                  onMajorChange?.(majorId)
                }
              }}
              value={selectedMajor ? String(selectedMajor.majorId) : ''}
            >
              <option value="">{isMajorLoading ? '전공 불러오는 중' : '전공미정'}</option>
              {majors.map((major) => (
                <option key={major.majorId} value={major.majorId}>
                  {major.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.metaRow}>
            <span aria-label="학번 전공" className={styles.majorInput}>
              {toStudentMeta(draft.schoolNumber)}
            </span>
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
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault()
              introBodyRef.current?.focus()
            }
          }}
          onPaste={handleIntroPaste}
          placeholder="한줄 자기소개를 작성해주세요."
          value={draft.introTitle}
        />
        <label className={styles.srOnly} htmlFor="resume-intro-body">
          자기소개 내용
        </label>
        <textarea
          className={styles.introBodyInput}
          id="resume-intro-body"
          onChange={(event) => updateDraft({ introduce: event.target.value })}
          placeholder="자기소개 내용을 입력해주세요."
          ref={introBodyRef}
          rows={1}
          value={draft.introduce}
        />
      </section>

      <section className={styles.skillSection}>
        <div className={styles.sectionTitleRow}>
          <h3>기술스택</h3>
          <button className={styles.addInlineButton} onClick={addSkill} type="button" aria-label="기술스택 추가">
            <Icon name="plus" />
          </button>
        </div>
        {draft.skills.length > 0 ? (
          <ul aria-label="기술스택 태그" className={styles.skillList}>
            {draft.skills.map((skill) => (
              <li className={styles.skillTag} key={skill}>
                <span>{skill}</span>
                <button aria-label={`${skill} 기술스택 삭제`} onClick={() => removeSkill(skill)} type="button">
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <label className={styles.srOnly} htmlFor="resume-skills">
          기술스택
        </label>
        <input
          className={styles.skillInput}
          id="resume-skills"
          onChange={(event) => setSkillInput(event.target.value)}
          onCompositionEnd={() => {
            isSkillComposingRef.current = false
          }}
          onCompositionStart={() => {
            isSkillComposingRef.current = true
          }}
          onKeyDown={handleSkillKeyDown}
          placeholder="기술스택을 입력 후 Enter를 눌러 추가하세요."
          value={skillInput}
        />
      </section>

      <section className={styles.activitySection}>
        <div className={styles.activityHeadingRow}>
          <h3>활동</h3>
        </div>
        <MarkdownTextarea
          className={styles.activityInput}
          id={`resume-page-content-${page.index}`}
          label={`${page.index + 1}쪽 추가 내용`}
          onChange={(content) => updatePage({ content })}
          placeholder="활동 내용과 날짜, 상세를 입력해주세요."
          toolbarLabel="활동 작성 도구"
          value={page.content}
        />
      </section>
    </article>
  )
}
