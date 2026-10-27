import { renderEditorMarkdown, serializeEditorMarkdown } from './markdownEditorModel'

function serializedCaretOffset(editor: HTMLElement, node: Node, offset: number): number {
  // A cloned probe counts markdown delimiters without touching the live selection.
  const path: number[] = []
  for (let child = node; child !== editor; child = child.parentNode!) {
    path.unshift(Array.from(child.parentNode!.childNodes).findIndex(item => item === child))
  }
  const clone = editor.cloneNode(true) as HTMLElement
  let clonedNode: Node = clone
  for (const index of path) clonedNode = clonedNode.childNodes[index]
  const marker = `\uE000${crypto.randomUUID()}\uE001`
  const range = document.createRange()
  range.setStart(clonedNode, offset)
  range.collapse(true)
  range.insertNode(document.createTextNode(marker))
  return serializeEditorMarkdown(clone).indexOf(marker)
}

export function readMarkdownCaretOffset(editor: HTMLElement): number | undefined {
  const selection = window.getSelection()
  if (document.activeElement !== editor || !selection?.focusNode || !editor.contains(selection.focusNode)) return undefined
  const offset = serializedCaretOffset(editor, selection.focusNode, selection.focusOffset)
  return offset < 0 ? undefined : offset
}

export function focusMarkdownCaret(
  editor: HTMLElement,
  value: string,
  offset: number,
  styles: Parameters<typeof renderEditorMarkdown>[2],
) {
  // Keep block syntax intact; probe DOM positions rather than injecting into markdown.
  renderEditorMarkdown(editor, value, styles)
  let bestDistance = Infinity
  const range = document.createRange()
  range.selectNodeContents(editor)
  range.collapse(false)
  const consider = (node: Node, nodeOffset: number) => {
    const markdownOffset = serializedCaretOffset(editor, node, nodeOffset)
    const distance = Math.abs(markdownOffset - offset)
    if (markdownOffset >= 0 && distance < bestDistance) {
      bestDistance = distance
      range.setStart(node, nodeOffset)
      range.collapse(true)
    }
    return markdownOffset
  }
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      let left = 0
      let right = node.textContent!.length
      const start = consider(node, left)
      const end = consider(node, right)
      if (start <= offset && end >= offset) {
        while (left <= right) {
          const middle = Math.floor((left + right) / 2)
          const current = consider(node, middle)
          if (current === offset) break
          if (current < offset) left = middle + 1
          else right = middle - 1
        }
      }
    } else if (node instanceof HTMLElement) {
      const index = Array.from(node.parentNode!.childNodes).findIndex(item => item === node)
      consider(node.parentNode!, index)
      consider(node.parentNode!, index + 1)
    }
    if (bestDistance === 0) break
  }
  editor.focus()
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}
