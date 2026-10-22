import assert from 'node:assert/strict'
import test from 'node:test'

import { getProfileCrop, moveProfileCrop } from '../../src/app/(student)/resume/profileImageCrop'

test('landscape and portrait images crop a centered square without changing aspect ratio', () => {
  assert.deepEqual(getProfileCrop({ width: 1200, height: 800 }, { x: 0.5, y: 0.5, zoom: 1 }), { x: 200, y: 0, size: 800 })
  assert.deepEqual(getProfileCrop({ width: 800, height: 1200 }, { x: 0.5, y: 0.5, zoom: 1 }), { x: 0, y: 200, size: 800 })
})

test('zoom and position choose the same square source region shown in the preview', () => {
  assert.deepEqual(getProfileCrop({ width: 1200, height: 800 }, { x: 1, y: 0, zoom: 2 }), { x: 800, y: 0, size: 400 })
})

test('dragging follows the pointer and clamps to the image edges', () => {
  const dimensions = { width: 1200, height: 800 }
  assert.deepEqual(moveProfileCrop(dimensions, { x: 0.5, y: 0.5, zoom: 1 }, { x: 0.1, y: 1 }), { x: 0.3, y: 0.5, zoom: 1 })
  assert.deepEqual(moveProfileCrop(dimensions, { x: 0.5, y: 0.5, zoom: 2 }, { x: 10, y: -10 }), { x: 0, y: 1, zoom: 2 })
})
