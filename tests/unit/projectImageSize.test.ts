import assert from 'node:assert/strict'
import test from 'node:test'

import { readProjectImageSize, writeProjectImageSize } from '../../src/shared/lib/projectImageSize.js'

test('project image layout round trips without changing the markdown body', () => {
  const content = '\n## 역할\n\n- 개발\n<!-- 일반 주석 -->\n'
  const imageSize = { width: 120, height: 60 }
  assert.deepEqual(readProjectImageSize(writeProjectImageSize(content, imageSize)), { content, imageSize })
  assert.equal(writeProjectImageSize(writeProjectImageSize(content, imageSize), { width: 160, height: 40 }),
    '<!-- repo:project-image-size=160x40 -->\n' + content)
  assert.equal(writeProjectImageSize(writeProjectImageSize(content, imageSize)), content)
})

test('existing markdown and non-leading comments remain untouched', () => {
  for (const content of ['본문', '<!-- 일반 주석 -->\n본문', '본문\n<!-- repo:project-image-size=80x80 -->']) {
    assert.deepEqual(readProjectImageSize(content), { content })
    assert.equal(writeProjectImageSize(content), content)
  }
})

test('invalid reserved dimensions never become rendering sizes', () => {
  for (const dimensions of ['0x80', '39x80', '161x80', '80x9999999999', '-40x80', '80.5x80', 'NaNx80', '80x<script>']) {
    assert.deepEqual(readProjectImageSize(`<!-- repo:project-image-size=${dimensions} -->\n본문`), { content: '본문' })
  }
  for (const width of [0, 39, 161, Infinity, NaN, 80.5]) {
    assert.equal(writeProjectImageSize('본문', { width, height: 80 }), '본문')
  }
})
