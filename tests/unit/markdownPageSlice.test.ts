import assert from 'node:assert/strict'
import test from 'node:test'
import { markdownPageSlice, safeMarkdownPageBoundary } from '../../src/app/(student)/resume/markdownPageSlice.js'

test('a page boundary preserves quote list and inline formatting on both pages', () => {
  for (const [open, close] of [['**', '**'], ['*', '*'], ['<u>', '</u>']]) {
    const prefix = `> - ${open}`
    const value = `${prefix}가나다라마바사${close}`
    const boundary = prefix.length + 3
    assert.equal(markdownPageSlice(value, 0, boundary).content, `${prefix}가나다${close}`)
    assert.deepEqual(markdownPageSlice(value, boundary, value.length), {
      content: `${prefix}라마바사${close}`, sourceStart: boundary, sourceEnd: value.length, prefixLength: prefix.length,
    })
  }
})

test('plain text slices preserve every character and line break', () => {
  const value = '첫째\n\n\n둘째 내용'
  assert.equal(markdownPageSlice(value, 0, 8).content + markdownPageSlice(value, 8, value.length).content, value)
})

test('image and link syntax remains indivisible at page boundaries', () => {
  assert.equal(safeMarkdownPageBoundary('앞 ![그림](https://example.com/image.png) 뒤', 15), 2)
  assert.equal(safeMarkdownPageBoundary('앞 [링크](https://example.com) 뒤', 15), 2)
})

test('closing delimiters stay with the preceding visible text instead of creating ghost chunks', () => {
  for (const value of ['**abcdef**', '*abcdef*', '<u>abcdef</u>']) {
    const closing = value.startsWith('<u>') ? 4 : value.startsWith('**') ? 2 : 1
    for (let boundary = value.length - closing; boundary < value.length; boundary++) {
      assert.equal(safeMarkdownPageBoundary(value, boundary), value.length)
    }
  }
})
