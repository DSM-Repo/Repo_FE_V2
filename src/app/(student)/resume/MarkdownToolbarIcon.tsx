import type { MarkdownCommand } from './markdownEditorModel'
import styles from './ResumeEditorSheet.module.css'

type MarkdownToolbarIconProps = {
  readonly command: MarkdownCommand
}

export function MarkdownToolbarIcon({ command }: MarkdownToolbarIconProps) {
  if (command === 'h1' || command === 'h2' || command === 'h3' || command === 'h4') {
    return (
      <span aria-hidden="true" className={styles.markdownToolHeadingIcon} data-markdown-tool-icon="heading">
        H<sub>{command.slice(1)}</sub>
      </span>
    )
  }

  if (command === 'bold' || command === 'italic' || command === 'underline') {
    const label = command === 'bold' ? 'B' : command === 'italic' ? 'I' : 'U'
    const variantClassName = command === 'italic' ? styles.italicToolIcon : command === 'underline' ? styles.underlineToolIcon : ''

    return (
      <span
        aria-hidden="true"
        className={`${styles.markdownToolTextIcon} ${variantClassName}`}
        data-markdown-tool-icon={command}
      >
        {label}
      </span>
    )
  }

  if (command === 'quote') {
    return (
      <svg
        aria-hidden="true"
        className={styles.markdownToolSvgIcon}
        data-markdown-tool-icon="quote"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path d="M4 6.5H10V12.2C10 15.3 8.2 17.5 5.2 18.5L4.4 16.7C6.2 16 7 14.9 7.1 13.5H4V6.5ZM14 6.5H20V12.2C20 15.3 18.2 17.5 15.2 18.5L14.4 16.7C16.2 16 17 14.9 17.1 13.5H14V6.5Z" fill="currentColor" />
      </svg>
    )
  }

  if (command === 'link') {
    return (
      <svg
        aria-hidden="true"
        className={styles.markdownToolSvgIcon}
        data-markdown-tool-icon="link"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path d="M9.5 14.5L14.5 9.5M7.5 16.5H6.5A4 4 0 0 1 6.5 8.5H10M16.5 7.5H17.5A4 4 0 0 1 17.5 15.5H14" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      className={styles.markdownToolSvgIcon}
      data-markdown-tool-icon="image"
      fill="none"
      viewBox="0 0 24 24"
    >
      <rect height="17" rx="1.5" stroke="currentColor" strokeWidth="2" width="18" x="3" y="3.5" />
      <path d="M5.5 18L10 13.5L13 16.5L15.5 14L19 17.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <circle cx="16.5" cy="8" fill="currentColor" r="1.5" />
    </svg>
  )
}
