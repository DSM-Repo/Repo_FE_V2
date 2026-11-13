import { Fragment, useId, useEffect, useRef, useCallback, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent, type MouseEvent } from 'react'

import type { ResumeMarkdownImageSize } from '@/shared/lib/resumeMarkdownImageSize'

import { MarkdownToolbarIcon } from './MarkdownToolbarIcon'
import { MarkdownImageSizeDialog, type MarkdownImagePreview } from './MarkdownImageSizeDialog'
import styles from './ResumeEditorSheet.module.css'
import { focusMarkdownCaret, readMarkdownCaretOffset } from './markdownEditorSelection'
import {
  applyMarkdownBlockShortcut,
  applyMarkdownBlockCommand,
  clipboardHtmlToMarkdown,
  insertMarkdownAtSelection,
  exitMarkdownQuote,
  markdownTools,
  renderEditorMarkdown,
  serializeEditorMarkdown,
  type MarkdownCommand,
} from './markdownEditorModel'

type MarkdownTextareaProps = {
  readonly className: string
  readonly id: string
  readonly focusOffset?: number
  readonly label: string
  readonly onChange: (value: string) => void
  readonly onFocused?: () => void
  readonly onImagePasteUpload?: (file: File) => Promise<string | undefined>
  readonly onRichPaste?: (value: string, readCaretOffset: () => number | undefined) => void
  readonly onUndo?: () => void
  readonly onRedo?: () => void
  readonly placeholder: string
  readonly toolbarLabel: string
  readonly value: string
}

function toEditorStyles() {
  return {
    bulletList: styles.markdownEditorBulletList,
    divider: styles.markdownEditorDivider,
    heading1: styles.markdownEditorHeading1,
    heading2: styles.markdownEditorHeading2,
    heading3: styles.markdownEditorHeading3,
    heading4: styles.markdownEditorHeading4,
    paragraph: styles.markdownEditorParagraph,
    quote: styles.markdownEditorQuote,
  }
}

function readImageMarkdown(file: File, onImagePasteUpload?: (file: File) => Promise<string | undefined>) {
  const alt = file.name.replace(/[\[\]\r\n]/g, ' ').trim() || '이미지'
  if (onImagePasteUpload) {
    return onImagePasteUpload(file).then((imageUrl) => imageUrl ? `![${alt}](${imageUrl})` : '')
  }

  return new Promise<string>((resolve) => {
    const reader = new FileReader()

    reader.addEventListener('error', () => resolve(''))
    reader.addEventListener('load', () => {
      resolve(typeof reader.result === 'string' ? `![${alt}](${reader.result})` : '')
    })
    reader.readAsDataURL(file)
  })
}

export function MarkdownTextarea({ className, id, focusOffset, label, onChange, onFocused, onImagePasteUpload, onRichPaste, onUndo, onRedo, placeholder, toolbarLabel, value }: MarkdownTextareaProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const imageInputId = useId()
  const selectedImageRef = useRef<HTMLImageElement>(null)
  const [selectedImage, setSelectedImage] = useState<MarkdownImagePreview>()
  const latestValueRef = useRef(value)
  const pendingValueRef = useRef<string | undefined>(undefined)
  const lastPaginatedValueRef = useRef<string | undefined>(undefined)
  const savedSelectionRangeRef = useRef<Range | undefined>(undefined)

  useEffect(() => {
    const editor = editorRef.current

    if (pendingValueRef.current !== undefined) {
      if (value !== pendingValueRef.current) {
        return
      }

      pendingValueRef.current = undefined
    }

    if (value !== latestValueRef.current) lastPaginatedValueRef.current = undefined
    latestValueRef.current = value

    if (!editor) return

    if (focusOffset !== undefined) {
      focusMarkdownCaret(editor, value, focusOffset, toEditorStyles())
      const selection = window.getSelection()
      savedSelectionRangeRef.current = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : undefined
      onFocused?.()
    } else if (serializeEditorMarkdown(editor) !== value) {
      renderEditorMarkdown(editor, value, toEditorStyles())
    }
  }, [value, focusOffset, onFocused])

  const runHistoryAction = useCallback((action: () => void) => {
    setSelectedImage(undefined)
    pendingValueRef.current = undefined
    lastPaginatedValueRef.current = undefined
    savedSelectionRangeRef.current = undefined
    action()
  }, [setSelectedImage])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const handleHistoryInput = (event: InputEvent) => {
      const historyAction = event.inputType === 'historyUndo' ? onUndo
        : event.inputType === 'historyRedo' ? onRedo : undefined
      if (!historyAction) return
      event.preventDefault()
      runHistoryAction(historyAction)
    }
    editor.addEventListener('beforeinput', handleHistoryInput)
    return () => editor.removeEventListener('beforeinput', handleHistoryInput)
  }, [onUndo, onRedo, runHistoryAction])

  const syncMarkdownValue = (afterSync?: MarkdownTextareaProps['onRichPaste']) => {
    const editor = editorRef.current
    const notifyPagination = (nextValue: string) => {
      if (!afterSync || lastPaginatedValueRef.current === nextValue) return
      lastPaginatedValueRef.current = nextValue
      pendingValueRef.current = undefined
      afterSync(nextValue, () => editor ? readMarkdownCaretOffset(editor) : undefined)
    }

    if (!editor) {
      notifyPagination(latestValueRef.current)
      return
    }

    const nextValue = serializeEditorMarkdown(editor)

    if (nextValue === latestValueRef.current) {
      notifyPagination(nextValue)
      return
    }

    latestValueRef.current = nextValue
    pendingValueRef.current = nextValue
    onChange(nextValue)
    notifyPagination(nextValue)
  }

  const resizeImage = (size: ResumeMarkdownImageSize | undefined) => {
    const editor = editorRef.current
    const image = selectedImageRef.current
    setSelectedImage(undefined)
    if (!editor || !image || !editor.contains(image)) return

    if (size) {
      image.width = size.width
      image.height = size.height
      image.style.width = `${size.width}px`
      image.style.height = `${size.height}px`
    } else {
      image.removeAttribute('width')
      image.removeAttribute('height')
      image.style.removeProperty('width')
      image.style.removeProperty('height')
    }
    editor.focus()
    const range = document.createRange()
    range.setStartAfter(image)
    range.collapse(true)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    savedSelectionRangeRef.current = range.cloneRange()
    syncMarkdownValue(onRichPaste)
  }

  const selectImage = (image: HTMLImageElement) => {
    selectedImageRef.current = image
    setSelectedImage({ src: image.src, width: image.offsetWidth, height: image.offsetHeight,
      naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight })
  }

  const saveEditorSelection = () => {
    const editor = editorRef.current
    const selection = window.getSelection()

    if (!editor || !selection || selection.rangeCount === 0) {
      return
    }

    const range = selection.getRangeAt(0)

    if (!editor.contains(range.commonAncestorContainer)) {
      return
    }

    savedSelectionRangeRef.current = range.cloneRange()
  }

  const restoreEditorSelection = (savedRange: Range | undefined) => {
    const editor = editorRef.current
    const selection = window.getSelection()

    if (!editor || !selection) {
      return undefined
    }

    const range = savedRange?.cloneRange() ?? (selection.rangeCount > 0 ? selection.getRangeAt(0) : document.createRange())

    if (!editor.contains(range.commonAncestorContainer)) {
      range.selectNodeContents(editor)
      range.collapse(false)
    }

    selection.removeAllRanges()
    selection.addRange(range)

    return selection
  }

  const insertMarkdownLink = (href: string) => {
    const selection = restoreEditorSelection(savedSelectionRangeRef.current)

    if (!selection) {
      return false
    }

    let range = selection.rangeCount > 0 ? selection.getRangeAt(0) : document.createRange()
    const normalizedHref = href.trim()

    if (!normalizedHref) {
      return false
    }

    const link = document.createElement('a')
    link.setAttribute('href', normalizedHref)
    link.textContent = range.toString() || normalizedHref

    range.deleteContents()
    range.insertNode(link)
    range = document.createRange()
    range.setStartAfter(link)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)

    return true
  }

  const openImageUpload = () => {
    saveEditorSelection()
    imageInputRef.current?.click()
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
        {
          const properties = ['font-weight', '--repo-font-resume-small-weight', '--repo-font-title-small-weight', '--repo-font-title-tiny-weight']
          const previousWeights = properties.map((property) => ({
            property,
            value: editor.style.getPropertyValue(property),
            priority: editor.style.getPropertyPriority(property),
          }))

          try {
            // Block styles (including lists) must not be mistaken for a semantic bold mark.
            for (const property of properties) editor.style.setProperty(property, '400')
            document.execCommand(command, false)
          } finally {
            for (const { property, value, priority } of previousWeights) editor.style.setProperty(property, value, priority)
          }
        }
        break
      case 'italic':
      case 'underline':
        document.execCommand(command, false)
        break
      case 'quote':
        document.execCommand('formatBlock', false, 'blockquote')
        break
      case 'bulletList':
        applyMarkdownBlockCommand(editor, window.getSelection(), { kind: 'bulletList', text: '' }, toEditorStyles())
        break
      case 'divider':
        applyMarkdownBlockCommand(editor, window.getSelection(), { kind: 'divider' }, toEditorStyles())
        break
      case 'link':
        saveEditorSelection()
        if (!insertMarkdownLink(window.prompt('링크 URL을 입력해주세요.', 'https://') ?? '')) {
          return
        }
        break
      case 'image':
        return
    }

    syncMarkdownValue()
  }

  const keepEditorSelection = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    saveEditorSelection()
  }

  const keepImageToolSelection = () => {
    saveEditorSelection()
  }

  const handleImageToolKeyDown = (event: KeyboardEvent<HTMLLabelElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    openImageUpload()
  }

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const attachmentRange = savedSelectionRangeRef.current?.cloneRange()
    void readImageMarkdown(file, onImagePasteUpload).then((imageMarkdown) => {
      const editor = editorRef.current
      if (!editor || !imageMarkdown) return

      const selection = restoreEditorSelection(attachmentRange)
      if (!selection || !insertMarkdownAtSelection(editor, selection, imageMarkdown, toEditorStyles())) return
      syncMarkdownValue(onRichPaste)
    })
  }

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault()
    const editor = editorRef.current
    const clipboardData = event.clipboardData

    if (!editor) {
      return
    }

    const htmlMarkdown = clipboardHtmlToMarkdown(clipboardData.getData('text/html'), clipboardData.getData('text/plain'))
    const imageFiles = Array.from(clipboardData.files).filter((file) => file.type.startsWith('image/'))

    const insertPaste = (imageMarkdowns: readonly string[]) => {
      const markdown = [htmlMarkdown, ...imageMarkdowns].filter(Boolean).join('\n')

      if (!insertMarkdownAtSelection(editor, window.getSelection(), markdown, toEditorStyles())) {
        return
      }

      syncMarkdownValue(onRichPaste)
    }

    if (imageFiles.length === 0) {
      insertPaste([])
    } else {
      void Promise.all(imageFiles.map((file) => readImageMarkdown(file, onImagePasteUpload))).then(insertPaste)
    }
  }

  const handleEditorChange = (event: React.FormEvent<HTMLDivElement>) => {
    const isComposing = 'isComposing' in event.nativeEvent && event.nativeEvent.isComposing
    syncMarkdownValue(isComposing ? undefined : onRichPaste)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLImageElement && event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      selectImage(event.target)
      return
    }
    if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.nativeEvent.isComposing) {
      const key = event.key.toLowerCase()
      const historyAction = key === 'z' ? (event.shiftKey ? onRedo : onUndo)
        : key === 'y' && !event.shiftKey ? onRedo : undefined
      if (historyAction) {
        event.preventDefault()
        runHistoryAction(historyAction)
        return
      }
    }

    if (event.key.toLowerCase() === 'b' && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      applyCommand('bold')
      return
    }

    if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && !event.nativeEvent.isComposing) {
      const editor = editorRef.current
      const selection = window.getSelection()
      if (editor && selection && exitMarkdownQuote(editor, selection, toEditorStyles())) {
        event.preventDefault()
        syncMarkdownValue(onRichPaste)
        return
      }
    }

    if (event.key !== ' ' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.nativeEvent.isComposing) {
      return
    }

    const editor = editorRef.current
    const selection = window.getSelection()

    if (
      !editor ||
      !selection ||
      !applyMarkdownBlockShortcut(editor, selection, toEditorStyles())
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
            {tool.command === 'image' ? (
              <label
                aria-label={tool.title}
                className={styles.richTextTool}
                htmlFor={imageInputId}
                onClick={keepImageToolSelection}
                onKeyDown={handleImageToolKeyDown}
                onMouseDown={keepImageToolSelection}
                role="button"
                tabIndex={0}
                title={tool.title}
              >
                <MarkdownToolbarIcon command={tool.command} />
              </label>
            ) : (
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
            )}
            {(tool.command === 'h4' || tool.command === 'underline') && (
              <span aria-hidden="true" className={styles.richTextToolSeparator} data-markdown-tool-separator="" />
            )}
          </Fragment>
        ))}
      </div>
      <input
        ref={imageInputRef}
        id={imageInputId}
        className={styles.markdownImageInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleImageFileChange}
        tabIndex={-1}
      />
      <div
        aria-label={label}
        aria-multiline="true"
        className={`${className} ${styles.markdownEditor}`}
        contentEditable
        data-markdown-value={value}
        data-placeholder={placeholder}
        id={id}
        onBlur={handleEditorChange}
        onInput={handleEditorChange}
        onClick={event => {
          if (event.target instanceof HTMLImageElement) selectImage(event.target)
        }}
        onCompositionEnd={() => syncMarkdownValue(onRichPaste)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        ref={editorRef}
        role="textbox"
        spellCheck
        suppressContentEditableWarning
      />
      {selectedImage ? <MarkdownImageSizeDialog image={selectedImage}
        onCancel={() => { setSelectedImage(undefined); selectedImageRef.current?.focus() }}
        onConfirm={resizeImage} /> : null}
    </>
  )
}
