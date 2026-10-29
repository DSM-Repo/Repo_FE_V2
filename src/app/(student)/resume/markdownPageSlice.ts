const inlinePattern = /(!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|<u>([\s\S]*?)<\/u>)/g

export function safeMarkdownPageBoundary(value: string, boundary: number): number {
  for (const match of value.matchAll(inlinePattern)) {
    const start = match.index
    const end = start + match[0].length
    if (boundary <= start || boundary >= end) continue
    // Images and links are atomic; their URL/label must never be cut in half.
    if (match[2] !== undefined || match[4] !== undefined) return start
    const markerLength = match[6] !== undefined ? 2 : match[7] !== undefined ? 1 : 3
    const closingLength = match[8] !== undefined ? 4 : markerLength
    if (boundary <= start + markerLength) return start
    if (boundary >= end - closingLength) return end
  }
  return boundary
}

export function markdownPageSlice(value: string, start: number, end: number) {
  let prefix = ''
  let suffix = ''
  if (start > 0 && value[start - 1] !== '\n') {
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const blockPrefix = /^(?:> ?)*(?:#{1,4} |- )?/.exec(value.slice(lineStart))?.[0] ?? ''
    if (start >= lineStart + blockPrefix.length) prefix = blockPrefix
  }
  for (const match of value.matchAll(inlinePattern)) {
    if (match[2] !== undefined || match[4] !== undefined) continue
    const open = match[6] !== undefined ? '**' : match[7] !== undefined ? '*' : '<u>'
    const close = match[8] !== undefined ? '</u>' : open
    const tokenStart = match.index
    const tokenEnd = tokenStart + match[0].length
    if (start > tokenStart && start < tokenEnd) prefix += open
    if (end > tokenStart && end < tokenEnd) suffix = close + suffix
  }
  return { content: prefix + value.slice(start, end) + suffix, sourceStart: start, sourceEnd: end, prefixLength: prefix.length }
}
