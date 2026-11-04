import assert from 'node:assert/strict'
import test from 'node:test'

import { getProfileCrop, moveProfileCrop, resizeProfileCrop } from '../../src/app/(student)/resume/profileImageCrop'

test('landscape and portrait images crop a centered square without changing aspect ratio', () => {
  assert.deepEqual(getProfileCrop({ width: 1200, height: 800 }, { x: 0.5, y: 0.5, zoom: 1 }), { x: 200, y: 0, size: 800 })
  assert.deepEqual(getProfileCrop({ width: 800, height: 1200 }, { x: 0.5, y: 0.5, zoom: 1 }), { x: 0, y: 200, size: 800 })
})

test('zoom and position choose the same square source region shown in the preview', () => {
  assert.deepEqual(getProfileCrop({ width: 1200, height: 800 }, { x: 1, y: 0, zoom: 2 }), { x: 800, y: 0, size: 400 })
})

test('dragging follows the pointer and clamps to the image edges', () => {
  const dimensions = { width: 1200, height: 800 }
  assert.deepEqual(moveProfileCrop(dimensions, { x: 0.5, y: 0.5, zoom: 1 }, { x: 0.1, y: 1 }), { x: 0.8, y: 0.5, zoom: 1 })
  assert.deepEqual(moveProfileCrop(dimensions, { x: 0.5, y: 0.5, zoom: 2 }, { x: 10, y: -10 }), { x: 1, y: 0, zoom: 2 })
})

test('each corner resizes a square while keeping its opposite corner anchored', () => {
  const dimensions = { width: 1200, height: 800 }
  const position = { x: 0.5, y: 0.5, zoom: 2 }
  const cases = [
    { corner: 'nw', movement: { x: 100, y: 100 }, expected: { x: 500, y: 300, size: 300 } },
    { corner: 'ne', movement: { x: -100, y: 100 }, expected: { x: 400, y: 300, size: 300 } },
    { corner: 'sw', movement: { x: 100, y: -100 }, expected: { x: 500, y: 200, size: 300 } },
    { corner: 'se', movement: { x: -100, y: -100 }, expected: { x: 400, y: 200, size: 300 } },
  ] as const
  for (const { corner, movement, expected } of cases) {
    const actual = getProfileCrop(dimensions, resizeProfileCrop(dimensions, position, corner, movement))
    assert.deepEqual(actual, expected)
  }
})

test('corner resizing stays inside landscape and portrait photos at the zoom limits', () => {
  for (const dimensions of [{ width: 1200, height: 800 }, { width: 800, height: 1200 }]) {
    for (const corner of ['nw', 'ne', 'sw', 'se'] as const) {
      for (const delta of [-10000, 10000]) {
        const position = resizeProfileCrop(dimensions, { x: 0.5, y: 0.5, zoom: 2 }, corner, { x: delta, y: delta })
        const crop = getProfileCrop(dimensions, position)
        assert.ok(position.zoom >= 1 && position.zoom <= 3)
        assert.ok(crop.x >= 0 && crop.y >= 0)
        assert.ok(crop.x + crop.size <= dimensions.width + 1e-9)
        assert.ok(crop.y + crop.size <= dimensions.height + 1e-9)
      }
    }
  }
})
