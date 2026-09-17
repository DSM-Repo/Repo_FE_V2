import { useRef, type KeyboardEvent } from 'react'

import { MarkdownContent } from '@/shared/ui/ResumeBookSheet/ResumeBookSheet'

import styles from './ResumeEditorSheet.module.css'
import {
  applyMarkdownCommandToValue,
  markdownTools,
  toHeadingShortcut,
  type MarkdownCommand,
} from './markdownEditorModel'

type MarkdownTextareaProps = {
  readonly className: string
  readonly id: string
  readonly label: string
  readonly onChange: (value: string) => void
  readonly placeholder: string
  readonly previewLabel: string
  readonly toolbarLabel: string
  readonly value: string
}

export function MarkdownTextarea({ className, id, label, onChange, placeholder, previewLabel, toolbarLabel, value }: MarkdownTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const updateSelection = (selectionStart: number, selectionEnd: number) => {
    window.requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(selectionStart, selectionEnd)
      textareaRef.current?.focus()
    })
  }

  const applyCommand = (command: MarkdownCommand) => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    const result = applyMarkdownCommandToValue({
      command,
      selectionEnd: textarea.selectionEnd,
      selectionStart: textarea.selectionStart,
      value,
    })

    onChange(result.value)
    updateSelection(result.selectionStart, result.selectionEnd)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== ' ' || event.metaKey || event.ctrlKey || event.altKey) {
      return
    }

    const shortcut = toHeadingShortcut(value, event.currentTarget.selectionStart)

    if (!shortcut) {
      return
    }

    event.preventDefault()

    const nextValue = `${value.slice(0, event.currentTarget.selectionStart)} ${value.slice(event.currentTarget.selectionEnd)}`

    onChange(nextValue)
    updateSelection(event.currentTarget.selectionStart + 1, event.currentTarget.selectionStart + 1)
  }

  return (
    <>
      <div className={styles.richTextToolbar} aria-label={toolbarLabel}>
        {markdownTools.map((tool) => (
          <button
            className={styles.richTextTool}
            key={tool.command}
            onClick={() => applyCommand(tool.command)}
            title={tool.title}
            type="button"
          >
            {tool.label}
          </button>
        ))}
      </div>
      <label className={styles.srOnly} htmlFor={id}>
        {label}
      </label>
      <div className={`${className} ${styles.markdownEditorShell}`}>
        <div className={styles.markdownEditorDisplay} aria-label={previewLabel}>
          {value.trim() ? <MarkdownContent value={value} /> : <span className={styles.markdownEditorPlaceholder}>{placeholder}</span>}
        </div>
        <textarea
          className={styles.markdownOverlayInput}
          id={id}
          onInput={(event) => onChange(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          ref={textareaRef}
          value={value}
        />
      </div>
      {value.trim() ? (
        <div className={styles.srOnly} aria-label={previewLabel}>
          미리보기는 편집 영역 안에서 바로 표시됩니다.
        </div>
      ) : null}
    </>
  )
}
