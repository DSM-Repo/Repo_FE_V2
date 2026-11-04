import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createResumeMarkdownInlinePattern,
  formatMarkdownImageSize,
  parseMarkdownImageSize,
  readMarkdownImageSize,
} from '../../src/shared/lib/resumeMarkdownImageSize.js'

test('sized image tokens preserve each image dimension without changing legacy images or adjacent formatting', () => {
  const original = '![원본](https://example.com/original.png)'
  const size = { width: 320, height: 180 }
  const sized = `![선택](https://example.com/selected.png)${formatMarkdownImageSize(size)}`
  const tokens = [...`${original} ${sized} **굵게** [링크](https://example.com)`.matchAll(createResumeMarkdownInlinePattern())]

  assert.equal(tokens.length, 4)
  assert.equal(readMarkdownImageSize(tokens[0][0]), undefined)
  assert.deepEqual(readMarkdownImageSize(tokens[1][0]), size)
  assert.equal(tokens[1][2], '선택')
  assert.equal(tokens[1][3], 'https://example.com/selected.png')
  assert.equal(tokens[2][6], '굵게')
  assert.equal(tokens[3][4], '링크')
})

test('only bounded integer image dimensions are accepted from persisted content or DOM attributes', () => {
  assert.deepEqual(parseMarkdownImageSize('24', '640'), { width: 24, height: 640 })
  assert.deepEqual(parseMarkdownImageSize(512, 24), { width: 512, height: 24 })
  for (const [width, height] of [[23, 180], [513, 180], [320, 641], [320, 23], [NaN, 180], [Infinity, 180], [320.5, 180], ['320px', '180'], ['3.2e2', '180'], [null, 180], [320, undefined]]) {
    assert.equal(parseMarkdownImageSize(width, height), undefined)
  }
  assert.equal(formatMarkdownImageSize({ width: 999999, height: 180 }), '')
  assert.equal(formatMarkdownImageSize(), '')
  assert.equal(readMarkdownImageSize('![x](https://example.com/x.png){width=320 height=180;position:fixed}'), undefined)
})

test('invalid dimension metadata stays inside its image token and never becomes an executable style', () => {
  for (const metadata of ['{width=999999 height=1}', '{width=NaN height=180}', '{width=320 height=180;position:fixed}']) {
    const value = `![x](https://example.com/x.png)${metadata}`
    const [token] = [...value.matchAll(createResumeMarkdownInlinePattern())]
    assert.equal(token[0], value)
    assert.equal(readMarkdownImageSize(token[0]), undefined)
  }
})
