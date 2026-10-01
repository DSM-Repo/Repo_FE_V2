import assert from 'node:assert/strict'
import test from 'node:test'
import { isReservedPortfolioSlug, normalizePortfolioSlug } from '../../src/shared/lib/portfolioSlug.js'

test('recognizes actual application routes as reserved slugs', () => {
  for (const slug of ['home', 'resume', 'students', 'majors', 'library', 'signup', 'component-showcase', 'api', 'resume-books']) {
    assert.equal(isReservedPortfolioSlug(slug), true, slug)
  }
})

test('normalizes Korean and encoded reserved slugs without changing their case', () => {
  assert.equal(normalizePortfolioSlug(' %EC%98%A4%ED%98%9C%EB%AF%BC '), '오혜민')
  assert.equal(isReservedPortfolioSlug('%4cOGIN'), true)
  assert.equal(isReservedPortfolioSlug('오혜민'), false)
})

test('rejects malformed encoding without crashing route resolution', () => {
  assert.equal(normalizePortfolioSlug('%E0%A4%A'), '')
  assert.equal(isReservedPortfolioSlug('%E0%A4%A'), false)
})
