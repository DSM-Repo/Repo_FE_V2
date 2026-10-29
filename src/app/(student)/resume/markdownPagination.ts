import { renderEditorMarkdown } from './markdownEditorModel'
import styles from './ResumeEditorSheet.module.css'
import { markdownPageSlice, safeMarkdownPageBoundary } from './markdownPageSlice'

const editorStyles = {
  bulletList: styles.markdownEditorBulletList,
  divider: styles.markdownEditorDivider,
  heading1: styles.markdownEditorHeading1,
  heading2: styles.markdownEditorHeading2,
  heading3: styles.markdownEditorHeading3,
  heading4: styles.markdownEditorHeading4,
  paragraph: styles.markdownEditorParagraph,
  quote: styles.markdownEditorQuote,
}

/** Measure in document pixels, before the viewport's page transform is applied. */
export function splitMarkdownIntoPageChunks(value: string, pageIndex: number) {
  const editor = document.getElementById(`resume-page-content-${pageIndex}`)
  const sheet = editor?.closest('article')
  if (!(editor instanceof HTMLElement) || !(sheet instanceof HTMLElement)) return [markdownPageSlice(value, 0, value.length)]

  const sheetStyle = getComputedStyle(sheet)
  const paddingBottom = parseFloat(sheetStyle.paddingBottom) || 0
  const paddingTop = parseFloat(sheetStyle.paddingTop) || 0
  const scale = sheet.getBoundingClientRect().height / sheet.offsetHeight || 1
  const editorTop = (editor.getBoundingClientRect().top - sheet.getBoundingClientRect().top) / scale + sheet.scrollTop
  const firstHeight = sheet.clientHeight - paddingBottom - editorTop
  const toolbar = editor.previousElementSibling?.previousElementSibling
  const toolbarHeight = toolbar instanceof HTMLElement ? toolbar.offsetHeight : 0
  const continuationHeight = sheet.clientHeight - paddingTop - paddingBottom - toolbarHeight
  if (firstHeight <= 0 || continuationHeight <= 0) return [markdownPageSlice(value, 0, value.length)]

  const probe = editor.cloneNode(false) as HTMLElement
  probe.removeAttribute('id')
  probe.removeAttribute('role')
  probe.removeAttribute('aria-label')
  probe.removeAttribute('data-placeholder')
  probe.contentEditable = 'false'
  probe.setAttribute('aria-hidden', 'true')
  Object.assign(probe.style, {
    position: 'absolute', left: '0', top: '0', visibility: 'hidden', pointerEvents: 'none',
    width: `${editor.clientWidth}px`, height: 'auto', minHeight: '0', maxHeight: 'none',
    margin: '0', overflow: 'visible',
  })
  sheet.append(probe)

  const fits = (text: string, height: number) => {
    renderEditorMarkdown(probe, text, editorStyles)
    // Reserve image space before an external image has loaded, too.
    for (const image of probe.querySelectorAll('img')) {
      if (!image.complete || !image.naturalHeight) image.style.height = '128px'
    }
    return probe.scrollHeight <= height + 1
  }

  try {
    if (fits(value, firstHeight)) return [markdownPageSlice(value, 0, value.length)]
    const chunks: ReturnType<typeof markdownPageSlice>[] = []
    let start = 0
    while (start < value.length) {
      const height = chunks.length === 0 ? firstHeight : continuationHeight
      const remainder = markdownPageSlice(value, start, value.length)
      if (fits(remainder.content, height)) {
        chunks.push(remainder)
        break
      }
      let low = start
      let high = value.length
      while (low < high) {
        const middle = Math.ceil((low + high) / 2)
        if (fits(markdownPageSlice(value, start, middle).content, height)) low = middle
        else high = middle - 1
      }
      const newline = value.lastIndexOf('\n', Math.max(start, low - 1))
      let boundary = newline > start ? newline + 1 : low
      boundary = safeMarkdownPageBoundary(value, boundary)
      while (boundary > start && !fits(markdownPageSlice(value, start, boundary).content, height)) {
        const next = safeMarkdownPageBoundary(value, boundary - 1)
        boundary = next < boundary ? next : safeMarkdownPageBoundary(value, boundary - 5)
      }
      if (boundary > start && /[\uD800-\uDBFF]/.test(value[boundary - 1]) && /[\uDC00-\uDFFF]/.test(value[boundary])) boundary -= 1
      // An indivisible image/link taller than a page remains editable without corrupting its syntax.
      if (boundary <= start) return [markdownPageSlice(value, 0, value.length)]
      chunks.push(markdownPageSlice(value, start, boundary))
      start = boundary
      if (chunks.length > 5) return [...chunks, markdownPageSlice(value, start, value.length)]
    }
    return chunks.length ? chunks : [markdownPageSlice(value, 0, 0)]
  } finally {
    probe.remove()
  }
}
