import { Fragment, type ReactNode } from 'react'

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

type MarkdownBlock =
  | {
      readonly kind: 'heading'
      readonly level: 1 | 2 | 3 | 4
      readonly text: string
    }
  | {
      readonly kind: 'paragraph'
      readonly text: string
    }
  | {
      readonly kind: 'quote'
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
      const safeHref = toSafeHref(imageSrc)
      nodes.push(
        safeHref ? (
          <a className={styles.markdownImageLink} href={safeHref} key={key} rel="noreferrer" target="_blank">
            {imageAlt || '이미지'}
          </a>
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

function renderMarkdownBlock(block: MarkdownBlock, index: number) {
  const children = renderMarkdownInline(block.text)

  switch (block.kind) {
    case 'heading':
      switch (block.level) {
        case 1:
          return (
            <h1 className={styles.markdownHeading1} key={index}>
              {children}
            </h1>
          )
        case 2:
          return (
            <h2 className={styles.markdownHeading2} key={index}>
              {children}
            </h2>
          )
        case 3:
          return (
            <h3 className={styles.markdownHeading3} key={index}>
              {children}
            </h3>
          )
        case 4:
          return (
            <h4 className={styles.markdownHeading4} key={index}>
              {children}
            </h4>
          )
      }
    case 'paragraph':
      return <p key={index}>{children}</p>
    case 'quote':
      return <blockquote key={index}>{children}</blockquote>
  }
}

export function MarkdownContent({ value }: { readonly value: string }) {
  const blocks = value
    .split('\n')
    .map(toMarkdownBlock)
    .filter((block) => block !== undefined)

  return <>{blocks.map((block, index) => <Fragment key={`${block.kind}-${index}`}>{renderMarkdownBlock(block, index)}</Fragment>)}</>
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
      {content.pageContent ? (
        <div className={styles.pageContent}>
          <MarkdownContent value={content.pageContent} />
        </div>
      ) : null}
    </article>
  )
}
