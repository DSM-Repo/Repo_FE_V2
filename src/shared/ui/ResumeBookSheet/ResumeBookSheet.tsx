import { Fragment, type MouseEvent, type ReactNode } from 'react'
import Image from 'next/image'

import { FeedbackBalloon } from '@/shared/ui/FeedbackBalloon'
import { Icon } from '@/shared/ui/Icon'
import { QrCode } from '@/shared/ui/QrCode'

import styles from './ResumeBookSheet.module.css'

export type ResumeBookSheetActivity = {
  readonly date: string
  readonly title: string
}

export type ResumeBookSheetProject = {
  readonly endDate: string
  readonly imageUrl: string
  readonly name: string
  readonly startDate: string
  readonly summary: string
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
  readonly pageType?: 'FREE' | 'PROFILE' | 'PROJECT'
  readonly portfolioUrl?: string
  readonly profileImageUrl?: string
  readonly project?: ResumeBookSheetProject
  readonly projects: readonly string[]
  readonly skills: readonly string[]
}

export type ResumeBookSheetProps = {
  readonly ariaLabel?: string
  readonly className?: string
  readonly content: ResumeBookSheetContent
  readonly feedbackMarkers?: readonly ResumeBookSheetFeedbackMarker[]
  readonly onFeedbackPointSelect?: (point: ResumeBookSheetFeedbackPoint) => void
}

export type ResumeBookSheetFeedbackMarker = {
  readonly active?: boolean
  readonly avatarAlt?: string
  readonly avatarSrc?: string
  readonly checked?: boolean
  readonly id: string
  readonly onSelect?: () => void
  readonly title: string
  readonly x: number
  readonly y: number
}

export type ResumeBookSheetFeedbackPoint = {
  readonly x: number
  readonly y: number
}

type MarkdownBlock =
  | {
      readonly kind: 'heading'
      readonly level: 1 | 2 | 3 | 4
      readonly text: string
    }
  | {
      readonly kind: 'divider'
    }
  | {
      readonly kind: 'paragraph'
      readonly text: string
    }
  | {
      readonly kind: 'quote'
      readonly text: string
    }
  | {
      readonly kind: 'bulletList'
      readonly text: string
    }

function toMarkdownBlock(line: string): MarkdownBlock | undefined {
  const trimmedLine = line.trim()

  if (!trimmedLine) {
    return undefined
  }

  if (trimmedLine.startsWith('#### ')) {
    return { kind: 'heading', level: 4, text: trimmedLine.slice(5) }
  }

  if (trimmedLine.startsWith('### ')) {
    return { kind: 'heading', level: 3, text: trimmedLine.slice(4) }
  }

  if (trimmedLine.startsWith('## ')) {
    return { kind: 'heading', level: 2, text: trimmedLine.slice(3) }
  }

  if (trimmedLine.startsWith('# ')) {
    return { kind: 'heading', level: 1, text: trimmedLine.slice(2) }
  }

  if (trimmedLine.startsWith('> ')) {
    return { kind: 'quote', text: trimmedLine.slice(2) }
  }

  if (trimmedLine === '---') {
    return { kind: 'divider' }
  }

  if (trimmedLine.startsWith('- ')) {
    return { kind: 'bulletList', text: trimmedLine.slice(2) }
  }

  return { kind: 'paragraph', text: trimmedLine }
}

function toSafeHref(value: string) {
  try {
    const url = new URL(value)

    if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:') {
      return url.href
    }
  } catch (error) {
    if (error instanceof TypeError) {
      return undefined
    }

    throw error
  }

  return undefined
}

function toSafeImageSrc(value: string) {
  if (value.startsWith('data:image/')) {
    return value
  }

  try {
    const url = new URL(value)

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.href
    }
  } catch (error) {
    if (error instanceof TypeError) {
      return undefined
    }

    throw error
  }

  return undefined
}

function renderMarkdownInline(value: string): readonly ReactNode[] {
  const pattern = /(!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|<u>(.*?)<\/u>)/g
  const nodes: ReactNode[] = []
  let currentIndex = 0
  let match = pattern.exec(value)

  while (match) {
    const matchStart = match.index
    const matchText = match[0] ?? ''

    if (matchStart > currentIndex) {
      nodes.push(value.slice(currentIndex, matchStart))
    }

    const imageAlt = match[2]
    const imageSrc = match[3]
    const linkText = match[4]
    const linkHref = match[5]
    const boldText = match[6]
    const italicText = match[7]
    const underlineText = match[8]
    const key = `${matchStart}-${matchText}`

    if (imageAlt !== undefined && imageSrc !== undefined) {
      const safeImageSrc = toSafeImageSrc(imageSrc)
      nodes.push(
        safeImageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- Markdown image sources may be remote or data URLs pasted from an editor.
          <img alt={imageAlt} className={styles.markdownImage} key={key} src={safeImageSrc} />
        ) : (
          <span key={key}>{imageAlt}</span>
        ),
      )
    } else if (linkText !== undefined && linkHref !== undefined) {
      const safeHref = toSafeHref(linkHref)
      nodes.push(
        safeHref ? (
          <a href={safeHref} key={key} rel="noreferrer" target="_blank">
            {linkText}
          </a>
        ) : (
          <span key={key}>{linkText}</span>
        ),
      )
    } else if (boldText !== undefined) {
      nodes.push(<strong key={key}>{boldText}</strong>)
    } else if (italicText !== undefined) {
      nodes.push(<em key={key}>{italicText}</em>)
    } else if (underlineText !== undefined) {
      nodes.push(<u key={key}>{underlineText}</u>)
    }

    currentIndex = matchStart + matchText.length
    match = pattern.exec(value)
  }

  if (currentIndex < value.length) {
    nodes.push(value.slice(currentIndex))
  }

  return nodes
}

function decodeBasicHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function normalizeStoredMarkdown(value: string) {
  if (!/<\/?(p|br|h[1-6]|ul|ol|li|blockquote|hr|strong|b|em|i|u|a)\b/i.test(value)) {
    return value
  }

  return decodeBasicHtmlEntities(value)
    .replace(/\r/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n---\n')
    .replace(/<h1[^>]*>/gi, '\n# ')
    .replace(/<h2[^>]*>/gi, '\n## ')
    .replace(/<h3[^>]*>/gi, '\n### ')
    .replace(/<h4[^>]*>/gi, '\n#### ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<blockquote[^>]*>/gi, '\n> ')
    .replace(/<\/blockquote>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/?(ul|ol)[^>]*>/gi, '\n')
    .replace(/<(strong|b)[^>]*>/gi, '**')
    .replace(/<\/(strong|b)>/gi, '**')
    .replace(/<(em|i)[^>]*>/gi, '*')
    .replace(/<\/(em|i)>/gi, '*')
    .replace(/<u[^>]*>/gi, '<u>')
    .replace(/<\/u>/gi, '</u>')
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function renderMarkdownBlock(block: MarkdownBlock, index: number) {
  switch (block.kind) {
    case 'heading': {
      const headingChildren = renderMarkdownInline(block.text)

      switch (block.level) {
        case 1:
          return (
            <h1 className={styles.markdownHeading1} key={index}>
              {headingChildren}
            </h1>
          )
        case 2:
          return (
            <h2 className={styles.markdownHeading2} key={index}>
              {headingChildren}
            </h2>
          )
        case 3:
          return (
            <h3 className={styles.markdownHeading3} key={index}>
              {headingChildren}
            </h3>
          )
        case 4:
          return (
            <h4 className={styles.markdownHeading4} key={index}>
              {headingChildren}
            </h4>
          )
      }
    }
    case 'paragraph':
      return <p key={index}>{renderMarkdownInline(block.text)}</p>
    case 'quote':
      return <blockquote key={index}>{renderMarkdownInline(block.text)}</blockquote>
    case 'bulletList':
      return (
        <ul className={styles.markdownBulletList} key={index}>
          <li>{renderMarkdownInline(block.text)}</li>
        </ul>
      )
    case 'divider':
      return <hr className={styles.markdownDivider} key={index} />
  }
}

export function MarkdownContent({ value }: { readonly value: string }) {
  const blocks = normalizeStoredMarkdown(value)
    .split('\n')
    .map(toMarkdownBlock)
    .filter((block) => block !== undefined)

  return <>{blocks.map((block, index) => <Fragment key={`${block.kind}-${index}`}>{renderMarkdownBlock(block, index)}</Fragment>)}</>
}

function toFeedbackPosition(value: number, axis: 'x' | 'y') {
  const normalizedValue = value <= 1 ? value : value <= 100 ? value / 100 : value / (axis === 'x' ? 423 : 599)
  const clampedValue = Math.min(1, Math.max(0, normalizedValue))

  return `${clampedValue * 100}%`
}

function renderFeedbackMarkers(feedbackMarkers: readonly ResumeBookSheetFeedbackMarker[]) {
  if (feedbackMarkers.length === 0) {
    return null
  }

  return (
    <div aria-label="피드백 위치" className={styles.feedbackLayer}>
      {feedbackMarkers.map((marker) => (
        <FeedbackBalloon
          avatarAlt={marker.avatarAlt}
          avatarSrc={marker.avatarSrc}
          buttonAriaLabel={`피드백 위치: ${marker.title}`}
          checked={marker.checked}
          className={styles.feedbackMarker}
          data-active={marker.active ? 'true' : undefined}
          key={marker.id}
          onActivate={marker.onSelect}
          style={{
            left: toFeedbackPosition(marker.x, 'x'),
            top: toFeedbackPosition(marker.y, 'y'),
          }}
          title={marker.title}
        />
      ))}
    </div>
  )
}

function shouldIgnoreFeedbackPointSelection(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('a,button,input,textarea,select,[contenteditable="true"]'))
}

export function ResumeBookSheet({
  ariaLabel,
  className,
  content,
  feedbackMarkers = [],
  onFeedbackPointSelect,
}: ResumeBookSheetProps) {
  const sheetClassName = [styles.sheet, className].filter(Boolean).join(' ')
  const label = ariaLabel ?? `${content.name} 포트폴리오`
  const project = content.project
  const profileImageUrl = toSafeImageSrc(content.profileImageUrl ?? '')
  const handleFeedbackPointClick = (event: MouseEvent<HTMLElement>) => {
    if (!onFeedbackPointSelect || shouldIgnoreFeedbackPointSelection(event.target)) {
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()

    if (rect.width <= 0 || rect.height <= 0) {
      return
    }

    onFeedbackPointSelect({
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    })
  }

  if (content.pageType === 'FREE') {
    return (
      <article className={`${sheetClassName} ${styles.freeSheet}`} aria-label={label} onClick={handleFeedbackPointClick}>
        {content.pageContent ? (
          <div className={styles.freePageContent}>
            <MarkdownContent value={content.pageContent} />
          </div>
        ) : null}
        {renderFeedbackMarkers(feedbackMarkers)}
      </article>
    )
  }

  if (project) {
    const projectPeriod = [project.startDate, project.endDate].filter(Boolean).join(' ~ ')
    const projectImageUrl = toSafeImageSrc(project.imageUrl)

    return (
      <article className={sheetClassName} aria-label={label} onClick={handleFeedbackPointClick}>
        <header className={styles.projectHeader}>
          {projectImageUrl ? (
            <Image
              className={styles.projectImage}
              src={projectImageUrl}
              alt={`${project.name || '프로젝트'} 이미지`}
              width={47}
              height={47}
              unoptimized
            />
          ) : (
            <div className={styles.projectImagePlaceholder} aria-label="프로젝트 이미지" />
          )}
          <div className={styles.projectIdentity}>
            <h2 className={styles.projectName}>{project.name || 'Project'}</h2>
            {projectPeriod ? <p className={styles.projectPeriod}>{projectPeriod}</p> : null}
          </div>
        </header>

        {project.summary ? (
          <section className={styles.projectSummary} aria-label="프로젝트 소개">
            <p>{project.summary}</p>
          </section>
        ) : null}

        {content.pageContent ? (
          <div className={styles.projectPageContent}>
            <MarkdownContent value={content.pageContent} />
          </div>
        ) : null}
        {renderFeedbackMarkers(feedbackMarkers)}
      </article>
    )
  }

  return (
    <article className={sheetClassName} aria-label={label} onClick={handleFeedbackPointClick}>
      <header className={styles.sheetHeader}>
        {profileImageUrl ? (
          <Image
            className={styles.profileImage}
            src={profileImageUrl}
            alt={`${content.name || '학생'} 프로필 이미지`}
            width={47}
            height={47}
            unoptimized
          />
        ) : (
          <div className={`${styles.profileImage} ${styles.profileImagePlaceholder}`} aria-label="프로필 이미지">
            <Icon name="plus" />
          </div>
        )}
        <div className={styles.identity}>
          <div className={styles.nameRow}>
            <h2 className={styles.name}>{content.name}</h2>
            <span aria-label="희망 전공" className={styles.major}>
              {content.majorName}
            </span>
          </div>
          <p aria-label="학번 및 이메일" className={styles.meta}>
            {[content.headline, content.email].filter(Boolean).join(' | ')}
          </p>
        </div>
        {content.portfolioUrl ? (
          <a className={styles.qrCode} href={content.portfolioUrl} rel="noreferrer" target="_blank">
            <QrCode label="포트폴리오 QR 코드" value={content.portfolioUrl} />
          </a>
        ) : (
          <div className={styles.qrPlaceholder} aria-label="포트폴리오 QR 코드" />
        )}
      </header>

      <section className={styles.introBox}>
        <h3>{content.introTitle ?? content.headline}</h3>
        {content.introduce ? <p>{content.introduce}</p> : null}
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
      {content.pageContent ? (
        <div className={styles.pageContent}>
          <MarkdownContent value={content.pageContent} />
        </div>
      ) : null}
      {renderFeedbackMarkers(feedbackMarkers)}
    </article>
  )
}
