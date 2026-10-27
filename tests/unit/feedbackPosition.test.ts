import assert from 'node:assert/strict'
import test from 'node:test'

import { toFeedbackPosition } from '../../src/shared/lib/feedbackPosition.js'

test('feedback coordinates share the same document base regardless of viewer size', () => {
  assert.equal(toFeedbackPosition(0.5, 'x'), '50%')
  assert.equal(toFeedbackPosition(50, 'y'), '50%')
  assert.equal(toFeedbackPosition(211.5, 'x'), '50%')
  assert.equal(toFeedbackPosition(299.5, 'y'), '50%')
  assert.equal(toFeedbackPosition(-1, 'x'), '0%')
  assert.equal(toFeedbackPosition(1200, 'y'), '100%')
})
