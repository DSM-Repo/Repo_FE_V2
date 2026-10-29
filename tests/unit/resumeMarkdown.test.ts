import assert from 'node:assert/strict'
import test from 'node:test'

import { hasNestedQuoteBlocks, parseResumeMarkdown, RESUME_QUOTE_BREAK } from '../../src/shared/lib/resumeMarkdown.js'

test('separate quotes stay separate while soft quote lines stay connected', () => {
  assert.deepEqual(parseResumeMarkdown('> 첫째\n> 연결\n\n> 둘째'), [
    { kind: 'quote', text: '첫째\n연결' }, { kind: 'paragraph', text: '' }, { kind: 'quote', text: '둘째' },
  ])
})

test('all authored blank lines survive parsing including document edges', () => {
  for (const count of [1, 2, 3, 5]) {
    const blocks = parseResumeMarkdown(`\n첫째${'\n'.repeat(count + 1)}둘째\n`)
    assert.equal(blocks.filter(block => block.kind === 'paragraph' && block.text === '').length, count + 2)
  }
})

test('quote bodies retain list and heading syntax for nested block rendering', () => {
  const [quote] = parseResumeMarkdown('> - **굵게**\n> - *기울임*\n> ## 제목')
  assert.equal(quote.kind, 'quote')
  if (quote.kind !== 'quote') return
  assert.equal(hasNestedQuoteBlocks(quote.text), true)
  assert.deepEqual(parseResumeMarkdown(quote.text), [
    { kind: 'bulletList', text: '**굵게**' }, { kind: 'bulletList', text: '*기울임*' },
    { kind: 'heading', level: 2, text: '제목' },
  ])
  assert.equal(hasNestedQuoteBlocks('**첫째\n둘째**'), false)
})


test('explicit quote boundaries split blocks without creating a visible empty line', () => {
  assert.deepEqual(parseResumeMarkdown(`> 첫째\n${RESUME_QUOTE_BREAK}\n> 둘째`), [
    { kind: 'quote', text: '첫째' }, { kind: 'quote', text: '둘째' },
  ])
  const [outer] = parseResumeMarkdown(`> > 첫째\n> ${RESUME_QUOTE_BREAK}\n> > 둘째`)
  if (outer.kind !== 'quote') throw new Error('expected outer quote')
  assert.deepEqual(parseResumeMarkdown(outer.text), [
    { kind: 'quote', text: '첫째' }, { kind: 'quote', text: '둘째' },
  ])
})
