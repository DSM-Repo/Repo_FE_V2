import assert from 'node:assert/strict'
import test from 'node:test'

process.env.NEXT_PUBLIC_API_BASE_URL = '   '

const feedbackApi = await import('../../src/features/feedback/api/feedbackApi.js')

const originalFetch = globalThis.fetch

test.afterEach(() => {
  globalThis.fetch = originalFetch
})

test('createFeedback returns configuration-error when API base URL is blank', async () => {
  globalThis.fetch = async () => {
    throw new Error('fetch should not be called without API base URL')
  }

  const result = await feedbackApi.createFeedback({
    accessToken: 'access-token',
    comment: '내용을 더 구체적으로 작성해주세요.',
    documentId: 'resume-id',
    pageId: 'page-id',
    x: 0.1,
    y: 0.2,
  })

  assert.deepEqual(result, {
    kind: 'configuration-error',
    message: 'API 주소가 설정되지 않았습니다.',
  })
})
