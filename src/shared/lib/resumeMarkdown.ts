export const RESUME_QUOTE_BREAK = '<!-- repo:quote-break -->'

export type ResumeMarkdownBlock =
  | { readonly kind: 'heading'; readonly level: 1 | 2 | 3 | 4; readonly text: string }
  | { readonly kind: 'divider' }
  | { readonly kind: 'paragraph'; readonly text: string }
  | { readonly kind: 'quote'; readonly text: string }
  | { readonly kind: 'bulletList'; readonly text: string }

export function parseResumeMarkdown(value: string): readonly ResumeMarkdownBlock[] {
  const blocks: ResumeMarkdownBlock[] = []
  let previousWasQuote = false
  for (const line of value.replace(/\r\n?/g, '\n').split('\n')) {
    if (line === RESUME_QUOTE_BREAK) {
      previousWasQuote = false
      continue
    }
    const heading = /^(#{1,4}) (.*)$/.exec(line)
    const block: ResumeMarkdownBlock = heading
      ? { kind: 'heading', level: heading[1].length as 1 | 2 | 3 | 4, text: heading[2] }
      : line === '>' || line.startsWith('> ')
        ? { kind: 'quote', text: line === '>' ? '' : line.slice(2) }
        : line === '---' ? { kind: 'divider' }
          : line.startsWith('- ') ? { kind: 'bulletList', text: line.slice(2) }
            : { kind: 'paragraph', text: line }
    const previous = blocks.at(-1)
    if (block.kind === 'quote' && previousWasQuote && previous?.kind === 'quote') {
      blocks[blocks.length - 1] = { kind: 'quote', text: `${previous.text}\n${block.text}` }
    } else blocks.push(block)
    previousWasQuote = block.kind === 'quote'
  }
  return blocks
}

export function hasNestedQuoteBlocks(value: string): boolean {
  return value.split('\n').some(line => /^(?:- |#{1,4} |> ?|---$)/.test(line))
}
