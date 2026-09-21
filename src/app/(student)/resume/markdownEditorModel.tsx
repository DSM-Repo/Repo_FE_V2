export const markdownTools = [
  { command: 'h1', label: 'H1', title: '제목 1' },
  { command: 'h2', label: 'H2', title: '제목 2' },
  { command: 'h3', label: 'H3', title: '제목 3' },
  { command: 'h4', label: 'H4', title: '제목 4' },
  { command: 'bold', label: 'B', title: '굵게' },
  { command: 'italic', label: 'I', title: '기울임' },
  { command: 'underline', label: 'U', title: '밑줄' },
  { command: 'quote', label: '"', title: '인용' },
  { command: 'link', label: 'link', title: '링크' },
  { command: 'image', label: 'img', title: '이미지' },
] as const

export type MarkdownCommand = (typeof markdownTools)[number]['command']

export type EditableMarkdownBlock =
  | { readonly kind: 'heading'; readonly level: 1 | 2 | 3 | 4; readonly text: string }
  | { readonly kind: 'paragraph'; readonly text: string }
  | { readonly kind: 'quote'; readonly text: string }

type EditorBlockClassNames = {
  readonly heading1: string; readonly heading2: string; readonly heading3: string; readonly heading4: string; readonly paragraph: string; readonly quote: string
}

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
    case 'bold':
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
    case 'quote':
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
      return undefined
  }
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
      const link = document.createElement('a')
      link.dataset.markdownImage = ''
      link.setAttribute('href', imageHref)
      link.textContent = imageAlt || '이미지'
      parent.append(link)
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
    block.kind === 'heading' ? document.createElement(`h${block.level}`) : document.createElement(block.kind === 'quote' ? 'blockquote' : 'div')

  element.className = toBlockClassName(block, styles)
  element.dataset.editorBlock = ''
  element.dataset.markdownBlock = block.kind

  if (block.kind === 'heading') {
    element.dataset.headingLevel = String(block.level)
  }

  if (block.text) {
    appendInlineNodes(element, block.text)
  } else {
    element.append(document.createElement('br'))
  }

  return element
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
    default:
      return text
  }
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

    const isBlock = ['BLOCKQUOTE', 'DIV', 'H1', 'H2', 'H3', 'H4', 'P'].includes(child.tagName)

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
      lines.push(`> ${text}`)
      continue
    }

    lines.push(text)
  }

  flushInlineLine()
  return lines.join('\n')
}
