import { normalizeDisplayImageUrl } from '@/shared/api/imageUrl'

export const markdownTools = [
  { command: 'h1', label: 'H1', title: '제목 1' },
  { command: 'h2', label: 'H2', title: '제목 2' },
  { command: 'h3', label: 'H3', title: '제목 3' },
  { command: 'h4', label: 'H4', title: '제목 4' },
  { command: 'bold', label: 'B', title: '굵게' },
  { command: 'italic', label: 'I', title: '기울임' },
  { command: 'underline', label: 'U', title: '밑줄' },
  { command: 'quote', label: '"', title: '인용' },
  { command: 'bulletList', label: 'bullet', title: '글머리 기호' },
  { command: 'divider', label: 'divider', title: '구분선' },
  { command: 'link', label: 'link', title: '링크' },
  { command: 'image', label: 'img', title: '이미지' },
] as const

export type MarkdownCommand = (typeof markdownTools)[number]['command']

export type EditableMarkdownBlock =
  | { readonly kind: 'heading'; readonly level: 1 | 2 | 3 | 4; readonly text: string }
  | { readonly kind: 'divider' }
  | { readonly kind: 'paragraph'; readonly text: string }
  | { readonly kind: 'quote'; readonly text: string }
  | { readonly kind: 'bulletList'; readonly text: string }

type EditorBlockClassNames = {
  readonly bulletList: string; readonly divider: string; readonly heading1: string; readonly heading2: string; readonly heading3: string; readonly heading4: string; readonly paragraph: string; readonly quote: string
}

const blockShortcuts: Readonly<Record<string, EditableMarkdownBlock>> = {
  '#': { kind: 'heading', level: 1, text: '' },
  '##': { kind: 'heading', level: 2, text: '' },
  '###': { kind: 'heading', level: 3, text: '' },
  '####': { kind: 'heading', level: 4, text: '' },
  '>': { kind: 'quote', text: '' },
  '-': { kind: 'bulletList', text: '' },
  '---': { kind: 'divider' },
}

const blockTags = new Set(['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DIV', 'FIGURE', 'FOOTER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'UL'])
const RESUME_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()

function findLineRange(value: string, selectionStart: number, selectionEnd: number) {
  const lineStart = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1
  const nextLineBreak = value.indexOf('\n', selectionEnd)
  const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak

  return { lineEnd, lineStart }
}

function stripHeadingMarker(value: string) {
  return value.replace(/^#{1,4}\s/, '')
}

function toHeadingPrefix(command: MarkdownCommand) {
  switch (command) {
    case 'h1':
      return '# '
    case 'h2':
      return '## '
    case 'h3':
      return '### '
    case 'h4':
      return '#### '
    case 'bulletList':
    case 'bold':
    case 'divider':
    case 'image':
    case 'italic':
    case 'link':
    case 'quote':
    case 'underline':
      return undefined
  }
}

function withInlineMarkdown(command: MarkdownCommand, selectedText: string) {
  const text = selectedText || '텍스트'

  switch (command) {
    case 'bold':
      return `**${text}**`
    case 'italic':
      return `*${text}*`
    case 'underline':
      return `<u>${text}</u>`
    case 'link':
      return `[${text}](https://)`
    case 'image':
      return `![${text}](https://)`
    case 'bulletList':
    case 'divider':
    case 'quote':
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
      return undefined
  }
}

function normalizeMarkdownText(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function escapeMarkdownInline(value: string) {
  return value.replace(/\[/g, '\\[').replace(/\]/g, '\\]')
}

function toMarkdownImage(src: string, alt: string) {
  const normalizedSrc = normalizeDisplayImageUrl(src, RESUME_API_BASE_URL)

  if (!normalizedSrc || normalizedSrc.startsWith('blob:')) {
    return ''
  }

  return `![${escapeMarkdownInline(alt.trim() || '이미지')}](${normalizedSrc})`
}

function isImageHref(value: string) {
  return /\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(value.trim())
}

function inlineHtmlToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }

  if (!(node instanceof HTMLElement)) {
    return ''
  }

  if (node.tagName === 'BR') {
    return '\n'
  }

  if (node.tagName === 'IMG') {
    return toMarkdownImage(node.getAttribute('src') ?? '', node.getAttribute('alt') ?? '')
  }

  const text = Array.from(node.childNodes).map(inlineHtmlToMarkdown).join('')

  if (!text.trim() && node.tagName !== 'A') {
    return text
  }

  switch (node.tagName) {
    case 'STRONG':
    case 'B':
      return `**${text}**`
    case 'EM':
    case 'I':
      return `*${text}*`
    case 'U':
      return `<u>${text}</u>`
    case 'A': {
      const href = node.getAttribute('href')?.trim()
      if (!href) {
        return text
      }

      return isImageHref(href) ? toMarkdownImage(href, text) : `[${text || href}](${href})`
    }
    case 'CODE':
      return text.includes('\n') ? text : `\`${text}\``
    default:
      return text
  }
}

function htmlElementToMarkdownLines(element: HTMLElement): readonly string[] {
  if (element.tagName === 'STYLE' || element.tagName === 'SCRIPT') {
    return []
  }

  if (element.tagName === 'HR') {
    return ['---']
  }

  if (element.tagName === 'IMG') {
    const image = toMarkdownImage(element.getAttribute('src') ?? '', element.getAttribute('alt') ?? '')
    return image ? [image] : []
  }

  if (element.tagName === 'UL' || element.tagName === 'OL') {
    return Array.from(element.children).flatMap((child) => {
      if (!(child instanceof HTMLElement) || child.tagName !== 'LI') {
        return []
      }

      const text = normalizeMarkdownText(inlineHtmlToMarkdown(child)).replace(/\n+/g, ' ')
      return text ? [`- ${text}`] : []
    })
  }

  const childBlockLines = Array.from(element.children).flatMap((child) =>
    child instanceof HTMLElement && blockTags.has(child.tagName) ? htmlElementToMarkdownLines(child) : [],
  )

  if (childBlockLines.length > 0 && !['BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'P'].includes(element.tagName)) {
    return childBlockLines
  }

  const text = normalizeMarkdownText(inlineHtmlToMarkdown(element))

  if (!text) {
    return childBlockLines
  }

  switch (element.tagName) {
    case 'H1':
      return [`# ${text}`]
    case 'H2':
      return [`## ${text}`]
    case 'H3':
      return [`### ${text}`]
    case 'H4':
    case 'H5':
    case 'H6':
      return [`#### ${text}`]
    case 'BLOCKQUOTE':
      return text.split('\n').map((line) => `> ${line}`)
    case 'LI':
      return [`- ${text.replace(/\n+/g, ' ')}`]
    default:
      return text.split('\n')
  }
}

export function clipboardHtmlToMarkdown(html: string, plainText: string) {
  if (!html.trim()) {
    return normalizeMarkdownText(plainText)
  }

  const document = new DOMParser().parseFromString(html, 'text/html')
  const lines = Array.from(document.body.childNodes).flatMap((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return normalizeMarkdownText(node.textContent ?? '').split('\n').filter(Boolean)
    }

    return node instanceof HTMLElement ? htmlElementToMarkdownLines(node) : []
  })
  const markdown = normalizeMarkdownText(lines.join('\n'))

  return markdown || normalizeMarkdownText(plainText)
}

export function applyMarkdownCommandToValue(input: {
  readonly command: MarkdownCommand; readonly selectionEnd: number; readonly selectionStart: number; readonly value: string
}) {
  const headingPrefix = toHeadingPrefix(input.command)

  if (headingPrefix) {
    const { lineEnd, lineStart } = findLineRange(input.value, input.selectionStart, input.selectionEnd)
    const line = input.value.slice(lineStart, lineEnd)
    const nextLine = `${headingPrefix}${stripHeadingMarker(line)}`
    const value = `${input.value.slice(0, lineStart)}${nextLine}${input.value.slice(lineEnd)}`

    return { selectionEnd: lineStart + nextLine.length, selectionStart: lineStart + headingPrefix.length, value }
  }

  if (input.command === 'quote') {
    const { lineEnd, lineStart } = findLineRange(input.value, input.selectionStart, input.selectionEnd)
    const line = input.value.slice(lineStart, lineEnd)
    const nextLine = line.startsWith('> ') ? line.slice(2) : `> ${line}`
    const value = `${input.value.slice(0, lineStart)}${nextLine}${input.value.slice(lineEnd)}`

    return { selectionEnd: lineStart + nextLine.length, selectionStart: lineStart + nextLine.length, value }
  }

  const selectedText = input.value.slice(input.selectionStart, input.selectionEnd)
  const inlineValue = withInlineMarkdown(input.command, selectedText)

  if (!inlineValue) {
    return { selectionEnd: input.selectionEnd, selectionStart: input.selectionStart, value: input.value }
  }

  return {
    selectionEnd: input.selectionStart + inlineValue.length,
    selectionStart: input.selectionStart,
    value: `${input.value.slice(0, input.selectionStart)}${inlineValue}${input.value.slice(input.selectionEnd)}`,
  }
}

export function toHeadingShortcut(value: string, selectionStart: number) {
  const { lineStart } = findLineRange(value, selectionStart, selectionStart)
  const lineBeforeCursor = value.slice(lineStart, selectionStart)

  switch (lineBeforeCursor) {
    case '#':
      return '# '
    case '##':
      return '## '
    case '###':
      return '### '
    case '####':
      return '#### '
    default:
      return undefined
  }
}

function toEditableMarkdownBlock(line: string): EditableMarkdownBlock {
  if (line.startsWith('#### ')) {
    return { kind: 'heading', level: 4, text: line.slice(5) }
  }

  if (line.startsWith('### ')) {
    return { kind: 'heading', level: 3, text: line.slice(4) }
  }

  if (line.startsWith('## ')) {
    return { kind: 'heading', level: 2, text: line.slice(3) }
  }

  if (line.startsWith('# ')) {
    return { kind: 'heading', level: 1, text: line.slice(2) }
  }

  if (line.startsWith('> ')) {
    return { kind: 'quote', text: line.slice(2) }
  }

  if (line === '---') {
    return { kind: 'divider' }
  }

  if (line.startsWith('- ')) {
    return { kind: 'bulletList', text: line.slice(2) }
  }

  return { kind: 'paragraph', text: line }
}

export function toEditableMarkdownBlocks(value: string): readonly EditableMarkdownBlock[] {
  const lines = value ? value.split('\n') : ['']

  return lines.map(toEditableMarkdownBlock)
}

function appendInlineNodes(parent: HTMLElement, value: string): void {
  const pattern = /(!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|<u>(.*?)<\/u>)/g
  let currentIndex = 0
  let match = pattern.exec(value)

  while (match) {
    const matchStart = match.index
    const matchText = match[0] ?? ''

    if (matchStart > currentIndex) {
      parent.append(value.slice(currentIndex, matchStart))
    }

    const imageAlt = match[2]
    const imageHref = match[3]
    const linkText = match[4]
    const linkHref = match[5]
    const boldText = match[6]
    const italicText = match[7]
    const underlineText = match[8]

    if (imageAlt !== undefined && imageHref !== undefined) {
      const imageSrc = normalizeDisplayImageUrl(imageHref, RESUME_API_BASE_URL)
      const image = document.createElement('img')
      image.dataset.markdownImage = ''
      image.setAttribute('alt', imageAlt)
      image.setAttribute('src', imageSrc || imageHref)
      parent.append(image)
    } else if (linkText !== undefined && linkHref !== undefined) {
      const link = document.createElement('a')
      link.setAttribute('href', linkHref)
      link.textContent = linkText
      parent.append(link)
    } else if (boldText !== undefined) {
      const strong = document.createElement('strong')
      strong.textContent = boldText
      parent.append(strong)
    } else if (italicText !== undefined) {
      const emphasis = document.createElement('em')
      emphasis.textContent = italicText
      parent.append(emphasis)
    } else if (underlineText !== undefined) {
      const underline = document.createElement('u')
      underline.textContent = underlineText
      parent.append(underline)
    }

    currentIndex = matchStart + matchText.length
    match = pattern.exec(value)
  }

  if (currentIndex < value.length) {
    parent.append(value.slice(currentIndex))
  }
}

function createBlockElement(block: EditableMarkdownBlock, styles: EditorBlockClassNames) {
  const element =
    block.kind === 'heading'
      ? document.createElement(`h${block.level}`)
      : document.createElement(block.kind === 'quote' ? 'blockquote' : block.kind === 'divider' ? 'hr' : block.kind === 'bulletList' ? 'ul' : 'div')

  configureBlockElement(element, block, styles)

  if (block.kind === 'divider') {
    return element
  }

  if (block.kind === 'bulletList') {
    const listItem = document.createElement('li')

    if (block.text) {
      appendInlineNodes(listItem, block.text)
    } else {
      listItem.append(document.createElement('br'))
    }

    element.append(listItem)
    return element
  }

  if (block.text) {
    appendInlineNodes(element, block.text)
  } else {
    element.append(document.createElement('br'))
  }

  return element
}

function configureBlockElement(element: HTMLElement, block: EditableMarkdownBlock, styles: EditorBlockClassNames) {
  element.className = toBlockClassName(block, styles)
  element.dataset.editorBlock = ''
  element.dataset.markdownBlock = block.kind

  if (block.kind === 'heading') {
    element.dataset.headingLevel = String(block.level)
  } else {
    delete element.dataset.headingLevel
  }
}

function findEditorBlock(editor: HTMLElement, node: Node): HTMLElement {
  let block = node instanceof HTMLElement ? node : node.parentElement

  while (block && block !== editor && block.parentElement !== editor) {
    block = block.parentElement
  }

  return block && editor.contains(block) ? block : editor
}

export function applyMarkdownBlockShortcut(editor: HTMLElement, selection: Selection, styles: EditorBlockClassNames): boolean {
  if (selection.rangeCount === 0 || !selection.isCollapsed) {
    return false
  }

  const range = selection.getRangeAt(0)

  if (!editor.contains(range.startContainer)) {
    return false
  }

  const block = findEditorBlock(editor, range.startContainer)

  const shortcutRange = document.createRange()
  shortcutRange.selectNodeContents(block)
  shortcutRange.setEnd(range.startContainer, range.startOffset)
  const shortcutBlock = blockShortcuts[shortcutRange.toString()]

  if (!shortcutBlock) {
    return false
  }

  shortcutRange.deleteContents()
  const replacement = createBlockElement(shortcutBlock, styles)
  const remainingNodes = Array.from(block.childNodes)

  if (shortcutBlock.kind === 'bulletList') {
    const listItem = replacement.querySelector('li')

    if (listItem) {
      listItem.replaceChildren(...remainingNodes)

      if (!listItem.textContent) {
        listItem.replaceChildren(document.createElement('br'))
      }
    }
  } else if (shortcutBlock.kind !== 'divider') {
    replacement.replaceChildren(...remainingNodes)

    if (!replacement.textContent) {
      replacement.replaceChildren(document.createElement('br'))
    }
  }

  if (block === editor) {
    editor.replaceChildren(replacement)
  } else {
    block.replaceWith(replacement)
  }

  const focusTarget = replacement.tagName === 'UL' ? (replacement.querySelector('li') ?? replacement) : replacement
  range.setStart(focusTarget, 0)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
  return true
}

export function applyMarkdownBlockCommand(editor: HTMLElement, selection: Selection | null, block: EditableMarkdownBlock, styles: EditorBlockClassNames): boolean {
  let range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : document.createRange()

  if (!editor.contains(range.startContainer)) {
    range.selectNodeContents(editor)
    range.collapse(false)
  }

  const currentBlock = findEditorBlock(editor, range.startContainer)
  const replacement = createBlockElement(block, styles)

  if (block.kind === 'bulletList') {
    const listItem = replacement.querySelector('li')
    const currentNodes = currentBlock === editor ? [] : Array.from(currentBlock.childNodes)

    if (listItem && currentNodes.length > 0) {
      listItem.replaceChildren(...currentNodes)
    }

    if (listItem && !listItem.textContent) {
      listItem.replaceChildren(document.createElement('br'))
    }
  }

  if (currentBlock === editor) {
    editor.replaceChildren(replacement)
  } else if (block.kind === 'divider' && currentBlock.textContent?.trim()) {
    currentBlock.after(replacement)
  } else {
    currentBlock.replaceWith(replacement)
  }

  const focusTarget = replacement.tagName === 'UL' ? (replacement.querySelector('li') ?? replacement) : replacement
  range = document.createRange()
  range.setStart(focusTarget, 0)
  range.collapse(true)
  selection?.removeAllRanges()
  selection?.addRange(range)
  return true
}

function toBlockClassName(block: EditableMarkdownBlock, styles: EditorBlockClassNames) {
  switch (block.kind) {
    case 'heading':
      switch (block.level) {
        case 1:
          return styles.heading1
        case 2:
          return styles.heading2
        case 3:
          return styles.heading3
        case 4:
          return styles.heading4
      }
    case 'paragraph':
      return styles.paragraph
    case 'quote':
      return styles.quote
    case 'bulletList':
      return styles.bulletList
    case 'divider':
      return styles.divider
  }
}

export function renderEditorMarkdown(editor: HTMLElement, value: string, styles: EditorBlockClassNames): void {
  if (!value) {
    editor.replaceChildren()
    return
  }

  const blocks = toEditableMarkdownBlocks(value)
  editor.replaceChildren(...blocks.map((block) => createBlockElement(block, styles)))
}

function serializeInlineMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }

  if (!(node instanceof HTMLElement)) {
    return ''
  }

  if (node.tagName === 'BR') {
    return node.nextSibling ? '\n' : ''
  }

  const text = Array.from(node.childNodes).map(serializeInlineMarkdown).join('')

  switch (node.tagName) {
    case 'STRONG':
    case 'B':
      return `**${text}**`
    case 'EM':
    case 'I':
      return `*${text}*`
    case 'U':
      return `<u>${text}</u>`
    case 'A': {
      const href = node.getAttribute('href') ?? ''
      return node.hasAttribute('data-markdown-image') ? `![${text}](${href})` : `[${text}](${href})`
    }
    case 'IMG': {
      const src = node.getAttribute('src') ?? ''
      const alt = node.getAttribute('alt') ?? ''
      return src ? `![${alt}](${src})` : alt
    }
    default:
      return text
  }
}

function createMarkdownBlockFragment(value: string, styles: EditorBlockClassNames) {
  const fragment = document.createDocumentFragment()
  const blocks = toEditableMarkdownBlocks(value)

  for (const block of blocks) {
    fragment.append(createBlockElement(block, styles))
  }

  return fragment
}

function insertMarkdownBlocksIntoRange(range: Range, value: string, styles: EditorBlockClassNames) {
  const fragment = createMarkdownBlockFragment(value, styles)
  const lastChild = fragment.lastChild
  range.deleteContents()
  range.insertNode(fragment)

  return lastChild
}

function isEmptyEditorBlock(block: HTMLElement) {
  return !block.textContent?.trim() && !block.querySelector('img')
}

export function insertMarkdownAtSelection(editor: HTMLElement, selection: Selection | null, value: string, styles: EditorBlockClassNames): boolean {
  const markdown = normalizeMarkdownText(value)

  if (!markdown) {
    return false
  }

  let range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : document.createRange()

  if (!editor.contains(range.commonAncestorContainer)) {
    range.selectNodeContents(editor)
    range.collapse(false)
  }

  const currentBlock = findEditorBlock(editor, range.startContainer)
  const shouldInsertAsTopLevelBlocks = currentBlock !== editor && markdown.includes('\n')

  if (shouldInsertAsTopLevelBlocks) {
    const fragment = createMarkdownBlockFragment(markdown, styles)
    const lastChild = fragment.lastChild

    if (isEmptyEditorBlock(currentBlock)) {
      currentBlock.replaceWith(fragment)
    } else {
      range.deleteContents()
      currentBlock.after(fragment)
    }

    if (lastChild) {
      range = document.createRange()
      range.setStartAfter(lastChild)
      range.collapse(true)
      selection?.removeAllRanges()
      selection?.addRange(range)
    }

    return true
  }

  const lastChild = insertMarkdownBlocksIntoRange(range, markdown, styles)

  if (lastChild) {
    range = document.createRange()
    range.setStartAfter(lastChild)
    range.collapse(true)
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  return true
}

export function serializeEditorMarkdown(editor: HTMLElement) {
  const lines: string[] = []
  let inlineLine = ''

  const flushInlineLine = () => {
    if (!inlineLine) {
      return
    }

    lines.push(inlineLine.replace(/\u00a0/g, ' '))
    inlineLine = ''
  }

  for (const child of editor.childNodes) {
    if (!(child instanceof HTMLElement)) {
      inlineLine += serializeInlineMarkdown(child)
      continue
    }

    const isBlock = ['BLOCKQUOTE', 'DIV', 'H1', 'H2', 'H3', 'H4', 'HR', 'P', 'UL'].includes(child.tagName)

    if (!isBlock) {
      if (child.tagName === 'BR') {
        flushInlineLine()
        lines.push('')
      } else {
        inlineLine += serializeInlineMarkdown(child)
      }
      continue
    }

    flushInlineLine()

    const text = Array.from(child.childNodes).map(serializeInlineMarkdown).join('').replace(/\u00a0/g, ' ')
    const headingLevel = child.dataset.headingLevel ?? child.tagName.match(/^H([1-4])$/)?.[1]

    if (headingLevel === '1' || headingLevel === '2' || headingLevel === '3' || headingLevel === '4') {
      lines.push(`${'#'.repeat(Number(headingLevel))} ${text}`)
      continue
    }

    if (child.dataset.markdownBlock === 'quote' || child.tagName === 'BLOCKQUOTE') {
      lines.push(text.split('\n').map((line) => `> ${line}`).join('\n'))
      continue
    }

    if (child.dataset.markdownBlock === 'divider' || child.tagName === 'HR') {
      lines.push('---')
      continue
    }

    if (child.dataset.markdownBlock === 'bulletList' || child.tagName === 'UL') {
      const listItems = Array.from(child.querySelectorAll(':scope > li'))
      const listLines = listItems.length > 0
        ? listItems.map((listItem) => `- ${Array.from(listItem.childNodes).map(serializeInlineMarkdown).join('').replace(/\u00a0/g, ' ')}`)
        : [`- ${text}`]

      lines.push(listLines.join('\n'))
      continue
    }

    lines.push(text)
  }

  flushInlineLine()
  return lines.join('\n')
}
