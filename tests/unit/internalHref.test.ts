import assert from 'node:assert/strict'
import test from 'node:test'

import { assertSafeInternalHref, isSafeInternalHref } from '../../src/shared/lib/internalHref.js'

test('accepts app-internal paths', () => {
  assert.equal(isSafeInternalHref('/오혜민'), true)
  assert.equal(isSafeInternalHref('/resume-books/sample'), true)
})

test('rejects protocol-relative and malformed paths', () => {
  assert.equal(isSafeInternalHref('//evil.example'), false)
  assert.equal(isSafeInternalHref('https://evil.example'), false)
  assert.equal(isSafeInternalHref('/safe\npath'), false)
  assert.throws(() => assertSafeInternalHref('//evil.example' as `/${string}`), /Internal href/)
})
