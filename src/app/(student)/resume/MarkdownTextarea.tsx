import { Fragment, useEffect, useRef, type ClipboardEvent, type KeyboardEvent, type MouseEvent } from 'react'

import { MarkdownToolbarIcon } from './MarkdownToolbarIcon'
import styles from './ResumeEditorSheet.module.css'
import {
  applyMarkdownBlockShortcut,
  markdownTools,
  renderEditorMarkdown,
  serializeEditorMarkdown,
  type MarkdownCommand,
} from './markdownEditorModel'

type MarkdownTextareaProps = {
  readonly className: string
  readonly id: string
  readonly label: string
  readonly onChange: (value: string) => void
  readonly placeholder: string
  readonly toolbarLabel: string
  readonly value: string
}

export function MarkdownTextarea({ className, id, label, onChange, placeholder, toolbarLabel, value }: MarkdownTextareaProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const latestValueRef = useRef(value)
  const pendingValueRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const editor = editorRef.current

    if (pendingValueRef.current !== undefined) {
      if (value !== pendingValueRef.current) {
        return
      }

      pendingValueRef.current = undefined
    }

    latestValueRef.current = value

    if (!editor || serializeEditorMarkdown(editor) === value) {
      return
    }

    renderEditorMarkdown(editor, value, {
      heading1: styles.markdownEditorHeading1,
      heading2: styles.markdownEditorHeading2,
      heading3: styles.markdownEditorHeading3,
      heading4: styles.markdownEditorHeading4,
      paragraph: styles.markdownEditorParagraph,
      quote: styles.markdownEditorQuote,
    })
  }, [value])

  const syncMarkdownValue = () => {
    const editor = editorRef.current

    if (!editor) {
      return
    }

    const nextValue = serializeEditorMarkdown(editor)

    if (nextValue === latestValueRef.current) {
      return
    }

    latestValueRef.current = nextValue
    pendingValueRef.current = nextValue
    onChange(nextValue)
  }

  const insertMarkdownLink = (isImage: boolean) => {
    const editor = editorRef.current
    const selection = window.getSelection()

    if (!editor || !selection) {
      return
    }

    let range = selection.rangeCount > 0 ? selection.getRangeAt(0) : document.createRange()

    if (!editor.contains(range.commonAncestorContainer)) {
      range.selectNodeContents(editor)
      range.collapse(false)
    }

    const link = document.createElement('a')
    link.setAttribute('href', 'https://')
    link.textContent = range.toString() || (isImage ? '이미지' : '링크')

    if (isImage) {
      link.dataset.markdownImage = ''
    }

    range.deleteContents()
    range.insertNode(link)
    range = document.createRange()
    range.setStartAfter(link)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  const applyCommand = (command: MarkdownCommand) => {
    const editor = editorRef.current

    if (!editor) {
      return
    }

    editor.focus()

    switch (command) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
        document.execCommand('formatBlock', false, command)
        break
      case 'bold':
      case 'italic':
      case 'underline':
        document.execCommand(command, false)
        break
      case 'quote':
        document.execCommand('formatBlock', false, 'blockquote')
        break
      case 'link':
        insertMarkdownLink(false)
        break
      case 'image':
        insertMarkdownLink(true)
        break
    }

    syncMarkdownValue()
  }

  const keepEditorSelection = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault()
    document.execCommand('insertText', false, event.clipboardData.getData('text/plain'))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== ' ' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.nativeEvent.isComposing) {
      return
    }

    const editor = editorRef.current
    const selection = window.getSelection()

    if (
      !editor ||
      !selection ||
      !applyMarkdownBlockShortcut(editor, selection, {
        heading1: styles.markdownEditorHeading1,
        heading2: styles.markdownEditorHeading2,
        heading3: styles.markdownEditorHeading3,
        heading4: styles.markdownEditorHeading4,
        paragraph: styles.markdownEditorParagraph,
        quote: styles.markdownEditorQuote,
      })
    ) {
      return
    }

    event.preventDefault()
    syncMarkdownValue()
  }

  return (
    <>
      <div className={styles.richTextToolbar} aria-label={toolbarLabel}>
        {markdownTools.map((tool) => (
          <Fragment key={tool.command}>
            <button
              className={styles.richTextTool}
              aria-label={tool.title}
              onMouseDown={keepEditorSelection}
              onClick={() => applyCommand(tool.command)}
              title={tool.title}
              type="button"
            >
              <MarkdownToolbarIcon command={tool.command} />
            </button>
            {(tool.command === 'h4' || tool.command === 'underline') && (
              <span aria-hidden="true" className={styles.richTextToolSeparator} data-markdown-tool-separator="" />
            )}
          </Fragment>
        ))}
      </div>
      <div
        aria-label={label}
        aria-multiline="true"
        className={`${className} ${styles.markdownEditor}`}
        contentEditable
        data-markdown-value={value}
        data-placeholder={placeholder}
        id={id}
        onBlur={syncMarkdownValue}
        onInput={syncMarkdownValue}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        ref={editorRef}
        role="textbox"
        spellCheck
        suppressContentEditableWarning
      />
    </>
  )
}
